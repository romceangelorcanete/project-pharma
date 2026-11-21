const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const encoder = new TextEncoder()
let templateEntriesPromise

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function findEndOfCentralDirectory(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset
  }
  throw new Error('Invalid Excel workbook archive.')
}

function readZipEntries(buffer) {
  const bytes = new Uint8Array(buffer)
  const view = new DataView(buffer)
  const endOffset = findEndOfCentralDirectory(bytes)
  const totalEntries = view.getUint16(endOffset + 10, true)
  const centralOffset = view.getUint32(endOffset + 16, true)
  const decoder = new TextDecoder()
  const entries = []
  let cursor = centralOffset

  for (let index = 0; index < totalEntries; index += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) throw new Error('Invalid Excel workbook directory.')
    const flags = view.getUint16(cursor + 8, true)
    const method = view.getUint16(cursor + 10, true)
    const crc = view.getUint32(cursor + 16, true)
    const compressedSize = view.getUint32(cursor + 20, true)
    const uncompressedSize = view.getUint32(cursor + 24, true)
    const nameLength = view.getUint16(cursor + 28, true)
    const extraLength = view.getUint16(cursor + 30, true)
    const commentLength = view.getUint16(cursor + 32, true)
    const localOffset = view.getUint32(cursor + 42, true)
    const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength))
    const localNameLength = view.getUint16(localOffset + 26, true)
    const localExtraLength = view.getUint16(localOffset + 28, true)
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength

    entries.push({
      name,
      flags,
      method,
      crc,
      compressedSize,
      uncompressedSize,
      compressedData: bytes.slice(dataOffset, dataOffset + compressedSize),
    })
    cursor += 46 + nameLength + extraLength + commentLength
  }
  return entries
}

async function getTemplateEntries() {
  if (!templateEntriesPromise) {
    templateEntriesPromise = fetch('/templates/E-STOCK%20NOVEMBER%202026.xlsx')
      .then((response) => {
        if (!response.ok) throw new Error('Hindi ma-load ang E-STOCK NOVEMBER 2026.xlsx template.')
        return response.arrayBuffer()
      })
      .then(readZipEntries)
      .catch((error) => {
        templateEntriesPromise = undefined
        throw error
      })
  }
  return (await templateEntriesPromise).map((entry) => ({ ...entry }))
}

async function transformBytes(bytes, format, Constructor) {
  if (typeof Constructor !== 'function') throw new Error('This browser does not support Excel workbook editing.')
  const stream = new Blob([bytes]).stream().pipeThrough(new Constructor(format))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

function xmlEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character])
}

function deliveryDates(deliveries = []) {
  return deliveries.map((delivery) => delivery.date || '').filter(Boolean).join('\n')
}

function deliveryQuantities(deliveries = [], separator = ' ') {
  return deliveries
    .map((delivery) => [delivery.qty, delivery.vendor].filter((part) => part !== '' && part != null).join(separator))
    .filter(Boolean)
    .join('\n')
}

function cellXml(reference, value, style) {
  const styleAttribute = style ? ` s="${style}"` : ''
  if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${reference}"${styleAttribute}><v>${value}</v></c>`
  return `<c r="${reference}"${styleAttribute} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`
}

function setCell(xml, reference, value) {
  const escapedReference = reference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const cellPattern = new RegExp(`<c\\b(?=[^>]*\\br="${escapedReference}")[^>]*?(?:\\/>|>[\\s\\S]*?<\\/c>)`)
  const existing = xml.match(cellPattern)
  if (existing) {
    // Keep formulas from the supplied workbook (ending balance, monthly totals,
    // and weekly consumption) so Excel can recalculate them after opening.
    if (/<f(?:\s|\/|>)/.test(existing[0])) return xml
    const style = existing[0].match(/\bs="(\d+)"/)?.[1]
    return xml.replace(cellPattern, cellXml(reference, value, style))
  }
  const rowNumber = Number(reference.match(/\d+$/)?.[0])
  const rowPattern = new RegExp(`<row\\b(?=[^>]*\\br="${rowNumber}")[^>]*>[\\s\\S]*?<\\/row>`)
  const row = xml.match(rowPattern)
  if (!row) return xml
  const cell = cellXml(reference, value)
  return xml.replace(rowPattern, row[0].replace('</row>', `${cell}</row>`))
}

function applyCellUpdates(xml, updates, replaceFormulas = false) {
  const pending = new Map(updates)
  xml = xml.replace(/<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g, (existing) => {
    const reference = existing.match(/\br="([A-Z]+\d+)"/)?.[1]
    if (!reference || !pending.has(reference)) return existing
    const value = pending.get(reference)
    pending.delete(reference)
    if (!replaceFormulas && /<f(?:\s|\/|>)/.test(existing)) return existing
    const style = existing.match(/\bs="(\d+)"/)?.[1]
    if (value === '' || value === null || value === undefined) return `<c r="${reference}"${style ? ` s="${style}"` : ''}/>`
    return cellXml(reference, value, style)
  })

  const missingByRow = new Map()
  for (const [reference, value] of pending) {
    if (value === null || value === undefined) continue
    const rowNumber = Number(reference.match(/\d+$/)?.[0])
    if (!missingByRow.has(rowNumber)) missingByRow.set(rowNumber, [])
    missingByRow.get(rowNumber).push([reference, value])
  }
  if (missingByRow.size) {
    xml = xml.replace(/<row\b[^>]*>[\s\S]*?<\/row>/g, (rowXml) => {
      const rowNumber = Number(rowXml.match(/\br="(\d+)"/)?.[1])
      const cells = missingByRow.get(rowNumber)
      if (!cells) return rowXml
      cells.sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
      return rowXml.replace('</row>', `${cells.map(([reference, value]) => cellXml(reference, value)).join('')}</row>`)
    })
  }
  return xml
}

function clearReferenceErrors(xml) {
  const cellPattern = /<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g
  const brokenSharedGroups = new Set()
  for (const match of xml.matchAll(cellPattern)) {
    const cell = match[0]
    if (!/#REF!/.test(cell)) continue
    const formula = cell.match(/<f\b[^>]*>([\s\S]*?)<\/f>/)?.[1]
    // A cached error is safe when the underlying formula itself is valid.
    if (formula && !formula.includes('#REF!')) continue
    const sharedIndex = cell.match(/<f\b[^>]*\bt="shared"[^>]*\bsi="(\d+)"/)?.[1]
    if (sharedIndex) brokenSharedGroups.add(sharedIndex)
  }

  return xml.replace(cellPattern, (cell) => {
    const formulaTag = cell.match(/<f\b[^>]*>[\s\S]*?<\/f>|<f\b[^>]*\/>/)?.[0] || ''
    const sharedIndex = formulaTag.match(/\bt="shared"[^>]*\bsi="(\d+)"/)?.[1]
    const brokenFormula = /#REF!/.test(cell) && (!cell.match(/<f\b[^>]*>([\s\S]*?)<\/f>/)?.[1] || cell.match(/<f\b[^>]*>([\s\S]*?)<\/f>/)[1].includes('#REF!'))
    if (!brokenFormula && (!sharedIndex || !brokenSharedGroups.has(sharedIndex))) return cell
    const reference = cell.match(/\br="([A-Z]+\d+)"/)?.[1]
    if (!reference) return cell
    const style = cell.match(/\bs="(\d+)"/)?.[1]
    return `<c r="${reference}"${style ? ` s="${style}"` : ''}/>`
  })
}

const inventoryReportGroups = (regularRows, donationRows, mhmapRows) => [
  { startRow: 4, endRow: 475, rows: regularRows },
  { startRow: 478, endRow: 571, rows: donationRows },
  { startRow: 574, endRow: 593, rows: mhmapRows },
]

function inventoryReportCellValues(item, rowNumber) {
  const ending = Number(item.ending ?? item.beginning ?? 0)
  const status = ending <= 0 ? 'OUT OF STOCK' : ending <= 10 ? 'CRITICAL STOCK' : 'IN STOCK'
  const values = {
    A: item.no ?? '',
    B: item.name || '',
    C: item.expiry || '',
    D: item.lot || '',
    E: deliveryDates(item.deliveries),
    F: deliveryQuantities(item.deliveries),
    G: Number(item.beginning) || 0,
    H: ending,
    I: Number(item.monthly) || 0,
    O: status,
    P: item.remarks || '',
  }
  for (let index = 0; index < 5; index += 1) values[excelColumn(index + 10)] = Number(item.weekly?.[index]) || 0
  return Object.entries(values).map(([column, value]) => [`${column}${rowNumber}`, value])
}

const inventoryHelperColumns = ['BA', 'BB', 'BC', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI']

function deliveryQuantityTotal(deliveries = []) {
  return deliveries.reduce((total, delivery) => {
    const quantity = Number(String(delivery.qty ?? '').replace(/,/g, '').match(/^-?\d+(?:\.\d+)?/)?.[0])
    return total + (Number.isFinite(quantity) ? quantity : 0)
  }, 0)
}

function inventoryHelperCellValues(item, rowNumber) {
  const values = [
    Number(item.beginning) || 0,
    Number(item.ending ?? item.beginning) || 0,
    Number(item.monthly) || 0,
    ...Array.from({ length: 5 }, (_, index) => Number(item.weekly?.[index]) || 0),
    deliveryQuantityTotal(item.deliveries),
  ]
  return inventoryHelperColumns.map((column, index) => [`${column}${rowNumber}`, values[index]])
}

function hideInventoryHelperColumns(xml) {
  const hiddenColumns = '<col min="53" max="61" width="0" hidden="1" customWidth="1"/>'
  if (/<cols\b[^>]*>[\s\S]*?<\/cols>/.test(xml)) {
    xml = xml.replace(/<cols\b[^>]*>[\s\S]*?<\/cols>/, (columns) => `${columns.replace('</cols>', '')}${hiddenColumns}</cols>`)
  } else {
    xml = xml.replace('<sheetData>', `<cols>${hiddenColumns}</cols><sheetData>`)
  }
  return xml.replace(/(<dimension\b[^>]*\bref="[A-Z]+\d+:)[A-Z]+(\d+"[^>]*\/>)/, '$1BI$2')
}

function syncRegularEndingBalanceFormula(xml, rows) {
  const sharedRanges = []
  const cellPattern = /<c\b[^>]*\br="AR\d+"[^>]*>[\s\S]*?<f\b[^>]*>[\s\S]*?<\/f>[\s\S]*?<\/c>/g
  for (const match of xml.matchAll(cellPattern)) {
    const formulaTag = match[0].match(/<f\b([^>]*)>/)
    if (!formulaTag || !/\bt="shared"/.test(formulaTag[1])) continue
    const range = formulaTag[1].match(/\bref="AR(\d+):AR(\d+)"/)
    if (range) sharedRanges.push([Number(range[1]), Number(range[2])])
  }

  const updates = new Map()
  sharedRanges.forEach(([startRow, endRow]) => {
    for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
      const item = rows[rowNumber - 3]
      updates.set(`AR${rowNumber}`, {
        formula: `J${rowNumber}+BI${rowNumber}-AS${rowNumber}`,
        value: Number(item?.ending ?? item?.beginning) || 0,
      })
    }
  })
  rows.forEach((item, index) => {
    const rowNumber = index + 3
    updates.set(`AR${rowNumber}`, {
      formula: `J${rowNumber}+BI${rowNumber}-AS${rowNumber}`,
      value: Number(item.ending ?? item.beginning) || 0,
    })
  })
  xml = applyFormulaUpdates(xml, updates)
  const formulaCaches = new Map()
  rows.forEach((item, index) => {
    const rowNumber = index + 3
    formulaCaches.set(`AS${rowNumber}`, Number(item.monthly) || 0)
    for (let week = 0; week < 5; week += 1) {
      formulaCaches.set(`${excelColumn(46 + week)}${rowNumber}`, Number(item.weekly?.[week]) || 0)
    }
  })
  return applyFormulaCaches(xml, formulaCaches)
}

function applyFormulaUpdates(xml, updates) {
  const pending = new Map(updates)
  const cellPattern = /<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g
  xml = xml.replace(cellPattern, (existing) => {
    const reference = existing.match(/\br="([A-Z]+\d+)"/)?.[1]
    if (!reference || !pending.has(reference)) return existing
    const { formula, value } = pending.get(reference)
    pending.delete(reference)
    const style = existing.match(/\bs="(\d+)"/)?.[1]
    return `<c r="${reference}"${style ? ` s="${style}"` : ''}><f>${xmlEscape(formula)}</f><v>${xmlEscape(value)}</v></c>`
  })
  return xml
}

function applyFormulaCaches(xml, updates) {
  const pending = new Map(updates)
  const cellPattern = /<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g
  return xml.replace(cellPattern, (existing) => {
    const reference = existing.match(/\br="([A-Z]+\d+)"/)?.[1]
    if (!reference || !pending.has(reference) || !/<f(?:\s|\/|>)/.test(existing)) return existing
    const value = xmlEscape(pending.get(reference))
    if (/<v>[\s\S]*?<\/v>/.test(existing)) return existing.replace(/<v>[\s\S]*?<\/v>/, `<v>${value}</v>`)
    return existing.replace('</c>', `<v>${value}</v></c>`)
  })
}

function syncInventoryReportFormulas(xml, groups) {
  const sourceMappings = [
    { sheet: 'REGULAR', beginning: 'J', ending: 'BB', monthly: 'BC', weeklyStart: 56 },
    { sheet: 'DONATION', beginning: 'E', ending: 'BB', monthly: 'BC', weeklyStart: 56 },
    { sheet: 'MHMAP', beginning: 'E', ending: 'BB', monthly: 'BC', weeklyStart: 56 },
  ]

  const updates = new Map()
  groups.forEach((group, groupIndex) => {
    const source = sourceMappings[groupIndex]
    for (let reportRow = group.startRow; reportRow <= group.endRow; reportRow += 1) {
      const sourceRow = reportRow - group.startRow + 3
      const item = group.rows[sourceRow - 3]
      const ending = Number(item?.ending ?? item?.beginning) || 0
      const monthly = Number(item?.monthly) || 0
      const weekly = Array.from({ length: 5 }, (_, week) => Number(item?.weekly?.[week]) || 0)
      const reportCells = [
        ['G', `${source.sheet}!${source.beginning}${sourceRow}`, Number(item?.beginning) || 0],
        ['H', `${source.sheet}!${source.ending}${sourceRow}`, ending],
        ['I', `SUM(J${reportRow}:N${reportRow})`, monthly],
      ]
      for (let week = 0; week < 5; week += 1) {
        reportCells.push([excelColumn(10 + week), `${source.sheet}!${excelColumn(source.weeklyStart + week)}${sourceRow}`, weekly[week]])
      }
      reportCells.forEach(([column, formula, value]) => {
        updates.set(`${column}${reportRow}`, { formula, value })
      })
    }
  })
  return applyFormulaUpdates(xml, updates)
}

function hideUnusedReportRows(xml, startRow, endRow, visibleRows) {
  const lastVisibleRow = startRow + visibleRows - 1
  return xml.replace(/<row\b[^>]*>[\s\S]*?<\/row>/g, (rowXml) => {
    const rowNumber = Number(rowXml.match(/\br="(\d+)"/)?.[1])
    if (!Number.isFinite(rowNumber) || rowNumber < startRow || rowNumber > endRow) return rowXml
    const openingTag = rowXml.match(/^<row\b[^>]*>/)?.[0]
    if (!openingTag) return rowXml
    let nextOpeningTag = openingTag.replace(/\s+hidden="[^"]*"/, '')
    if (rowNumber > lastVisibleRow) nextOpeningTag = nextOpeningTag.replace(/>$/, ' hidden="1">')
    return rowXml.replace(openingTag, nextOpeningTag)
  })
}

function adjustInventoryReportRowHeights(xml, group) {
  const lines = (value) => String(value ?? '').split(/\r?\n/).filter((line) => line.trim()).length
  const rowHeights = new Map(group.rows.map((item, index) => {
    const deliveryLines = (item.deliveries || []).reduce((total, delivery) => {
      const dateLines = lines(delivery.date)
      const qtyAndVendorLines = lines([delivery.qty, delivery.vendor].filter((part) => part !== '' && part != null).join('\n'))
      return total + Math.max(dateLines, qtyAndVendorLines)
    }, 0)
    const lineCount = Math.max(1, lines(item.expiry), lines(item.lot), deliveryLines)
    return [group.startRow + index, lineCount * 20 + 4]
  }))

  return xml.replace(/<row\b[^>]*>[\s\S]*?<\/row>/g, (rowXml) => {
    const rowNumber = Number(rowXml.match(/\br="(\d+)"/)?.[1])
    const requiredHeight = rowHeights.get(rowNumber)
    if (!requiredHeight) return rowXml

    const openingTag = rowXml.match(/^<row\b[^>]*>/)?.[0]
    if (!openingTag) return rowXml
    const currentHeight = Number(openingTag.match(/\bht="([\d.]+)"/)?.[1]) || 0
    if (currentHeight >= requiredHeight) return rowXml

    const nextOpeningTag = openingTag
      .replace(/\s+ht="[^"]*"/, '')
      .replace(/\s+customHeight="[^"]*"/, '')
      .replace(/>$/, ` ht="${requiredHeight}" customHeight="1">`)
    return rowXml.replace(openingTag, nextOpeningTag)
  })
}

function rpciCellValues(item) {
  const deliveries = item?.deliveries || []
  const price = Number(String(item?.price ?? '').replace(/[^\d.-]/g, '')) || ''
  return {
    C: item?.name || '',
    D: item?.stockNumber || '',
    E: item?.unit || '',
    F: price,
    G: item ? Number(item.ending ?? item.beginning) || 0 : '',
    H: '',
    I: '',
    J: '',
    K: deliveryDates(deliveries),
    L: deliveryQuantities(deliveries),
  }
}

function prepareDataRows(xml, startRow, endRow, visibleRows) {
  const lastVisibleRow = startRow + visibleRows - 1
  return xml.replace(/<row\b[^>]*>[\s\S]*?<\/row>/g, (rowXml) => {
    const rowNumber = Number(rowXml.match(/\br="(\d+)"/)?.[1])
    if (!Number.isFinite(rowNumber) || rowNumber < startRow || rowNumber > endRow) return rowXml

    let prepared = rowXml.replace(/<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g, (cell) => {
      if (/<f(?:\s|\/|>)/.test(cell)) return cell
      const reference = cell.match(/\br="([A-Z]+\d+)"/)?.[1]
      if (!reference) return cell
      const style = cell.match(/\bs="(\d+)"/)?.[1]
      return `<c r="${reference}"${style ? ` s="${style}"` : ''}/>`
    })

    const openingTag = prepared.match(/^<row\b[^>]*>/)?.[0]
    if (!openingTag) return prepared
    let nextOpeningTag = openingTag.replace(/\s+hidden="[^"]*"/, '')
    if (rowNumber > lastVisibleRow) nextOpeningTag = nextOpeningTag.replace(/>$/, ' hidden="1">')
    return prepared.replace(openingTag, nextOpeningTag)
  })
}

function lastWorksheetRow(xml) {
  const rowNumbers = [...xml.matchAll(/<row\b[^>]*\br="(\d+)"/g)].map((match) => Number(match[1]))
  return Math.max(0, ...rowNumbers)
}

function excelColumn(index) {
  let label = ''
  for (let value = index; value > 0; value = Math.floor((value - 1) / 26)) label = String.fromCharCode(65 + ((value - 1) % 26)) + label
  return label
}

function regularCellValues(item, rowNumber) {
  const values = {
    A: item.no,
    B: item.name,
    C: item.unit,
    D: Number(String(item.price ?? '').replace(/[^\d.-]/g, '')) || '',
    E: Number(String(item.dpri ?? '').replace(/[^\d.-]/g, '')) || '',
    F: item.category,
    G: item.other,
    H: item.expiry,
    I: item.lot,
    J: item.beginning,
    K: deliveryDates(item.deliveries),
    L: deliveryQuantities(item.deliveries, '\n'),
  }
  for (let day = 1; day <= 31; day += 1) {
    values[excelColumn(day + 12)] = item.daily?.[day] ?? ''
  }
  return Object.entries(values).map(([column, value]) => [`${column}${rowNumber}`, value])
}

function stockCellValues(item, rowNumber) {
  const values = {
    A: item.no,
    B: item.name,
    C: item.expiry,
    D: item.lot,
    E: item.beginning,
    F: deliveryDates(item.deliveries),
    G: deliveryQuantities(item.deliveries),
    AM: item.ending,
    AN: item.monthly,
  }
  for (let day = 1; day <= 31; day += 1) values[excelColumn(day + 7)] = item.daily?.[day] ?? ''
  ;(item.weekly || []).slice(0, 5).forEach((qty, index) => { values[excelColumn(41 + index)] = qty })
  return Object.entries(values).map(([column, value]) => [`${column}${rowNumber}`, value])
}

function monthlyCellValues(item, rowNumber, stockMonth, averageMonths = 12, consumptionYear = 2026) {
  const dpri = Number(String(item.dpri ?? '').replace(/[^\d.-]/g, '')) || 0
  const selectedYear = Number(stockMonth?.split('-')?.[0])
  const hasYearData = selectedYear === consumptionYear
  const consumption = hasYearData ? Number(item.monthly) || 0 : ''
  const values = { A: item.no ?? '', O: dpri || '' }
  const month = Number(stockMonth?.split('-')?.[1])
  for (let monthNumber = 1; monthNumber <= 12; monthNumber += 1) {
    const column = excelColumn(monthNumber + 2)
    if (!hasYearData) values[column] = ''
    else if (monthNumber === month) values[column] = consumption
  }
  return Object.entries(values).map(([column, value]) => [`${column}${rowNumber}`, value])
}

async function writeZip(entries) {
  const files = await Promise.all(entries.map(async (entry) => {
    const nameBytes = encoder.encode(entry.name)
    const compressedData = entry.updatedText === undefined
      ? entry.compressedData
      : await transformBytes(encoder.encode(entry.updatedText), 'deflate-raw', CompressionStream)
    const uncompressedData = entry.updatedText === undefined ? null : encoder.encode(entry.updatedText)
    return {
      nameBytes,
      compressedData,
      crc: uncompressedData ? crc32(uncompressedData) : entry.crc,
      uncompressedSize: uncompressedData?.length ?? entry.uncompressedSize,
      method: entry.updatedText === undefined ? entry.method : 8,
    }
  }))

  const chunks = []
  let offset = 0
  const push = (chunk) => { chunks.push(chunk); offset += chunk.length }
  for (const file of files) {
    const local = new Uint8Array(30 + file.nameBytes.length)
    const view = new DataView(local.buffer)
    view.setUint32(0, 0x04034b50, true)
    view.setUint16(4, 20, true)
    view.setUint16(6, 0x0800, true)
    view.setUint16(8, file.method, true)
    view.setUint32(14, file.crc, true)
    view.setUint32(18, file.compressedData.length, true)
    view.setUint32(22, file.uncompressedSize, true)
    view.setUint16(26, file.nameBytes.length, true)
    local.set(file.nameBytes, 30)
    file.localOffset = offset
    push(local)
    push(file.compressedData)
  }

  const centralOffset = offset
  for (const file of files) {
    const central = new Uint8Array(46 + file.nameBytes.length)
    const view = new DataView(central.buffer)
    view.setUint32(0, 0x02014b50, true)
    view.setUint16(4, 20, true)
    view.setUint16(6, 20, true)
    view.setUint16(8, 0x0800, true)
    view.setUint16(10, file.method, true)
    view.setUint32(16, file.crc, true)
    view.setUint32(20, file.compressedData.length, true)
    view.setUint32(24, file.uncompressedSize, true)
    view.setUint16(28, file.nameBytes.length, true)
    view.setUint32(42, file.localOffset, true)
    central.set(file.nameBytes, 46)
    push(central)
  }

  const end = new Uint8Array(22)
  const view = new DataView(end.buffer)
  view.setUint32(0, 0x06054b50, true)
  view.setUint16(8, files.length, true)
  view.setUint16(10, files.length, true)
  view.setUint32(12, offset - centralOffset, true)
  view.setUint32(16, centralOffset, true)
  push(end)
  return new Blob(chunks, { type: XLSX_MIME })
}

export async function createEstockWorkbook({ regularRows = [], donationRows = [], mhmapRows = [], preparedBy = '', preparedByPosition = '', stockMonth = '2026-11', consumptionYear = 2026 } = {}) {
  const entries = await getTemplateEntries()
  const calcChainIndex = entries.findIndex((candidate) => candidate.name === 'xl/calcChain.xml')
  if (calcChainIndex >= 0) entries.splice(calcChainIndex, 1)

  for (const [name, removePattern] of [
    ['xl/_rels/workbook.xml.rels', /<Relationship\b(?=[^>]*(?:Target="calcChain\.xml"|Type="[^"]*\/calcChain"))[^>]*\/>/g],
    ['[Content_Types].xml', /<Override\b(?=[^>]*PartName="\/xl\/calcChain\.xml")[^>]*\/>/g],
  ]) {
    const entry = entries.find((candidate) => candidate.name === name)
    if (!entry) continue
    const bytes = await transformBytes(entry.compressedData, 'deflate-raw', DecompressionStream)
    entry.updatedText = new TextDecoder().decode(bytes).replace(removePattern, '')
  }

  const workbookEntry = entries.find((candidate) => candidate.name === 'xl/workbook.xml')
  if (workbookEntry) {
    const bytes = await transformBytes(workbookEntry.compressedData, 'deflate-raw', DecompressionStream)
    let workbookXml = new TextDecoder().decode(bytes)
    const calcProperties = '<calcPr calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/>'
    if (/<calcPr\b[^>]*(?:\/>|>[\s\S]*?<\/calcPr>)/.test(workbookXml)) {
      workbookXml = workbookXml.replace(/<calcPr\b[^>]*(?:\/>|>[\s\S]*?<\/calcPr>)/, calcProperties)
    } else {
      workbookXml = workbookXml.replace('</workbook>', `${calcProperties}</workbook>`)
    }
    workbookEntry.updatedText = workbookXml
  }
  const sheets = [
    { file: 'xl/worksheets/sheet1.xml', rows: regularRows, map: regularCellValues, monthTitleCell: 'M1', dataStartRow: 3, inventoryHelperRows: regularRows, regularEndingRows: regularRows },
    { file: 'xl/worksheets/sheet2.xml', rows: donationRows, map: stockCellValues, monthTitleCell: 'H1', dataStartRow: 3, inventoryHelperRows: donationRows },
    { file: 'xl/worksheets/sheet3.xml', rows: mhmapRows, map: stockCellValues, monthTitleCell: 'H1', dataStartRow: 3, inventoryHelperRows: mhmapRows },
    {
      file: 'xl/worksheets/sheet5.xml',
      reportGroups: inventoryReportGroups(regularRows, donationRows, mhmapRows),
      clearReferenceErrors: true,
      reportTitleCell: 'A1',
      preparedByCell: 'B597',
      preparedByPositionCell: 'B598',
      sectionTitles: [{ cell: 'A476', value: 'DONATION' }],
    },
    { file: 'xl/worksheets/sheet6.xml', rpciGroups: [{ startRow: 15, endRow: 486, rows: regularRows }], preparedByCell: 'C491', preparedByPositionCell: 'C492' },
    {
      file: 'xl/worksheets/sheet7.xml',
      rpciGroups: [
        { startRow: 15, endRow: 107, rows: donationRows },
        { startRow: 112, endRow: 131, rows: mhmapRows },
      ],
      preparedByCell: 'C134',
      preparedByPositionCell: 'C135',
    },
    {
      file: 'xl/worksheets/sheet4.xml',
      groups: [
        { rows: regularRows, startRow: 4, endRow: 475, averageMonths: 9 },
        { rows: donationRows, startRow: 478, endRow: 586, averageMonths: 8 },
        { rows: mhmapRows, startRow: 589, endRow: 1087, averageMonths: 8 },
      ],
      map: (item, row) => monthlyCellValues(item, row, stockMonth),
    },
  ]

  for (const sheet of sheets) {
    const entry = entries.find((candidate) => candidate.name === sheet.file)
    if (!entry) throw new Error(`Walang worksheet sa template: ${sheet.file}`)
    const bytes = await transformBytes(entry.compressedData, 'deflate-raw', DecompressionStream)
    let xml = new TextDecoder().decode(bytes)
    if (sheet.dataStartRow) {
      xml = prepareDataRows(xml, sheet.dataStartRow, lastWorksheetRow(xml), sheet.rows.length)
      xml = adjustInventoryReportRowHeights(xml, { rows: sheet.rows, startRow: sheet.dataStartRow })
    }
    if (sheet.groups) {
      sheet.groups.forEach((group) => {
        xml = prepareDataRows(xml, group.startRow, group.endRow, group.rows.length)
      })
    }
    if (sheet.reportGroups) {
      sheet.reportGroups.forEach((group) => {
        xml = hideUnusedReportRows(xml, group.startRow, group.endRow, group.rows.length)
        xml = adjustInventoryReportRowHeights(xml, group)
      })
    }
    if (sheet.clearReferenceErrors) xml = clearReferenceErrors(xml)
    if (sheet.rpciGroups) {
      const updates = new Map()
      for (const group of sheet.rpciGroups) {
        for (let row = group.startRow; row <= group.endRow; row += 1) {
          const item = group.rows[row - group.startRow]
          const values = rpciCellValues(item)
          Object.entries(values).forEach(([column, value]) => {
            updates.set(`${column}${row}`, value)
          })
        }
      }
      xml = applyCellUpdates(xml, updates, true)
    }
    if (sheet.monthTitleCell) {
      const [year, month] = stockMonth.split('-').map(Number)
      const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()
      xml = setCell(xml, sheet.monthTitleCell, `*${monthLabel}`)
    }
    if (sheet.reportTitleCell) {
      const [year, month] = stockMonth.split('-').map(Number)
      const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' }).toUpperCase()
      const lastDay = new Date(year, month, 0).getDate()
      xml = setCell(xml, sheet.reportTitleCell, `INVENTORY REPORT ${monthLabel} ${lastDay}, ${year} 11:59PM`)
    }
    sheet.sectionTitles?.forEach(({ cell, value }) => {
      xml = setCell(xml, cell, value)
    })
    if (sheet.preparedByCell) xml = setCell(xml, sheet.preparedByCell, preparedBy)
    if (sheet.preparedByPositionCell) xml = setCell(xml, sheet.preparedByPositionCell, preparedByPosition)
    const groups = sheet.groups || (sheet.rows ? [{ rows: sheet.rows, startRow: sheet.startRow || 3 }] : [])
    const cellUpdates = new Map()
    groups.forEach((group) => {
      group.rows.forEach((item, index) => {
        const mapRow = group.averageMonths
          ? (item, rowNumber) => monthlyCellValues(item, rowNumber, stockMonth, group.averageMonths, consumptionYear)
          : sheet.map
        mapRow(item, index + group.startRow).forEach(([reference, value]) => {
          if (value !== null && value !== undefined) cellUpdates.set(reference, value)
        })
      })
    })
    sheet.reportGroups?.forEach((group) => {
      group.rows.forEach((item, index) => {
        inventoryReportCellValues(item, index + group.startRow).forEach(([reference, value]) => cellUpdates.set(reference, value))
      })
    })
    xml = applyCellUpdates(xml, cellUpdates)
    if (sheet.inventoryHelperRows) {
      const helperUpdates = new Map()
      sheet.inventoryHelperRows.forEach((item, index) => {
        inventoryHelperCellValues(item, index + 3).forEach(([reference, value]) => helperUpdates.set(reference, value))
      })
      xml = applyCellUpdates(xml, helperUpdates)
      xml = hideInventoryHelperColumns(xml)
    }
    if (sheet.regularEndingRows) xml = syncRegularEndingBalanceFormula(xml, sheet.regularEndingRows)
    if (sheet.reportGroups) xml = syncInventoryReportFormulas(xml, sheet.reportGroups)
    entry.updatedText = xml
  }

  return writeZip(entries)
}
