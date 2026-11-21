const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const encoder = new TextEncoder()

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

async function transformBytes(bytes, format, Constructor) {
  if (typeof Constructor !== 'function') throw new Error('This browser does not support Excel workbook editing.')
  const stream = new Blob([bytes]).stream().pipeThrough(new Constructor(format))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

function xmlEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character])
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

function replaceCellValue(xml, reference, value) {
  const escapedReference = reference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const cellPattern = new RegExp(`<c\\b(?=[^>]*\\br="${escapedReference}")[^>]*?(?:\\/>|>[\\s\\S]*?<\\/c>)`)
  const existing = xml.match(cellPattern)
  if (existing) {
    const style = existing[0].match(/\bs="(\d+)"/)?.[1]
    return xml.replace(cellPattern, cellXml(reference, value, style))
  }
  const rowNumber = Number(reference.match(/\d+$/)?.[0])
  const rowPattern = new RegExp(`<row\\b(?=[^>]*\\br="${rowNumber}")[^>]*>[\\s\\S]*?<\\/row>`)
  const row = xml.match(rowPattern)
  return row ? xml.replace(rowPattern, row[0].replace('</row>', `${cellXml(reference, value)}</row>`)) : xml
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

  // Most workbook cells already exist. Fall back to the single-cell writer
  // only for the small number of mapped cells missing from the template.
  for (const [reference, value] of pending) {
    if (value === null || value === undefined) continue
    xml = replaceFormulas ? replaceCellValue(xml, reference, value) : setCell(xml, reference, value)
  }
  return xml
}

function clearEmptyReportFields(xml, groups) {
  const updates = new Map()
  for (const group of groups) {
    for (let row = group.startRow; row <= group.endRow; row += 1) {
      const item = group.rows[row - group.startRow]
      for (const [column, getValue] of Object.entries(group.fields)) {
        if (String(getValue(item) ?? '').trim()) continue
        updates.set(`${column}${row}`, '')
      }
    }
  }
  return applyCellUpdates(xml, updates, true)
}

function clearReferenceErrors(xml) {
  return xml.replace(/<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g, (cell) => {
    if (!/#REF!/.test(cell)) return cell
    const reference = cell.match(/\br="([A-Z]+\d+)"/)?.[1]
    if (!reference) return cell
    const style = cell.match(/\bs="(\d+)"/)?.[1]
    return `<c r="${reference}"${style ? ` s="${style}"` : ''}/>`
  })
}

const inventoryReportGroups = (regularRows, donationRows, mhmapRows) => [
  { startRow: 4, endRow: 475, rows: regularRows, fields: { B: (item) => item?.name, C: (item) => item?.expiry, D: (item) => item?.lot, E: (item) => item?.deliveries?.map((delivery) => delivery.date).filter(Boolean).join('\n') } },
  { startRow: 478, endRow: 571, rows: donationRows, fields: { B: (item) => item?.name, C: (item) => item?.expiry, D: (item) => item?.lot, E: (item) => item?.deliveries?.map((delivery) => delivery.date).filter(Boolean).join('\n') } },
  { startRow: 574, endRow: 593, rows: mhmapRows, fields: { B: (item) => item?.name, C: (item) => item?.expiry, D: (item) => item?.lot, E: (item) => item?.deliveries?.map((delivery) => delivery.date).filter(Boolean).join('\n') } },
]

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
    K: deliveries.map((delivery) => delivery.date || '').filter(Boolean).join('\n'),
    L: deliveries.map((delivery) => [delivery.qty, delivery.vendor].filter((part) => part !== '' && part != null).join(' ')).filter(Boolean).join('\n'),
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
    K: (item.deliveries || []).map((delivery) => delivery.date || '').filter(Boolean).join('\n'),
    L: (item.deliveries || []).map((delivery) => [delivery.qty, delivery.vendor].filter((part) => part !== '' && part != null).join('\n')).filter(Boolean).join('\n'),
    AS: item.ending,
    AT: item.monthly,
  }
  for (let day = 1; day <= 31; day += 1) {
    const columnIndex = day <= 3 ? day + 12 : day + 13
    values[excelColumn(columnIndex)] = item.daily?.[day] ?? ''
  }
  ;(item.weekly || []).slice(0, 5).forEach((qty, index) => {
    values[excelColumn(47 + index)] = qty
  })
  return Object.entries(values).map(([column, value]) => [`${column}${rowNumber}`, value])
}

function stockCellValues(item, rowNumber) {
  const values = {
    A: item.no,
    B: item.name,
    C: item.expiry,
    D: item.lot,
    E: item.beginning,
    F: (item.deliveries || []).map((delivery) => delivery.date || '').filter(Boolean).join('\n'),
    G: (item.deliveries || []).map((delivery) => [delivery.qty, delivery.vendor].filter((part) => part !== '' && part != null).join(' ')).filter(Boolean).join('\n'),
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
  const files = []
  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name)
    const compressedData = entry.updatedText === undefined
      ? entry.compressedData
      : await transformBytes(encoder.encode(entry.updatedText), 'deflate-raw', CompressionStream)
    const uncompressedData = entry.updatedText === undefined ? null : encoder.encode(entry.updatedText)
    files.push({
      nameBytes,
      compressedData,
      crc: uncompressedData ? crc32(uncompressedData) : entry.crc,
      uncompressedSize: uncompressedData?.length ?? entry.uncompressedSize,
      method: entry.updatedText === undefined ? entry.method : 8,
    })
  }

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

export async function createEstockWorkbook({ regularRows = [], donationRows = [], mhmapRows = [], stockMonth = '2026-11', consumptionYear = 2026 } = {}) {
  const response = await fetch('/templates/E-STOCK%20NOVEMBER%202026.xlsx')
  if (!response.ok) throw new Error('Hindi ma-load ang E-STOCK NOVEMBER 2026.xlsx template.')

  const entries = readZipEntries(await response.arrayBuffer())
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
    { file: 'xl/worksheets/sheet1.xml', rows: regularRows, map: regularCellValues, monthTitleCell: 'M1', dataStartRow: 3 },
    { file: 'xl/worksheets/sheet2.xml', rows: donationRows, map: stockCellValues, monthTitleCell: 'H1', dataStartRow: 3 },
    { file: 'xl/worksheets/sheet3.xml', rows: mhmapRows, map: stockCellValues, monthTitleCell: 'H1', dataStartRow: 3 },
    {
      file: 'xl/worksheets/sheet5.xml',
      blankGroups: inventoryReportGroups(regularRows, donationRows, mhmapRows),
      clearReferenceErrors: true,
      reportTitleCell: 'A1',
      sectionTitles: [{ cell: 'A476', value: 'DONATION' }],
    },
    { file: 'xl/worksheets/sheet6.xml', rpciGroups: [{ startRow: 15, endRow: 486, rows: regularRows }] },
    {
      file: 'xl/worksheets/sheet7.xml',
      rpciGroups: [
        { startRow: 15, endRow: 107, rows: donationRows },
        { startRow: 112, endRow: 131, rows: mhmapRows },
      ],
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
    }
    if (sheet.groups) {
      sheet.groups.forEach((group) => {
        xml = prepareDataRows(xml, group.startRow, group.endRow, group.rows.length)
      })
    }
    if (sheet.blankGroups) {
      xml = clearEmptyReportFields(xml, sheet.blankGroups)
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
      xml = xml.replace(/IF\(H(\d+)=0,"OUT OF STOCK",IF\(H\d+&lt;70,"CRITICAL STOCK","IN STOCK"\)\)/g, (_, row) => `IF(H${row}&lt;=0,"OUT OF STOCK",IF(H${row}&lt;=10,"CRITICAL STOCK","IN STOCK"))`)
    }
    sheet.sectionTitles?.forEach(({ cell, value }) => {
      xml = setCell(xml, cell, value)
    })
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
    xml = applyCellUpdates(xml, cellUpdates)
    entry.updatedText = xml
  }
  return writeZip(entries)
}
