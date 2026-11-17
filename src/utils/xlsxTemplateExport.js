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

function monthlyCellValues(item, rowNumber, stockMonth) {
  const values = { B: item.name, O: Number(String(item.dpri ?? '').replace(/[^\d.-]/g, '')) || '' }
  const month = Number(stockMonth?.split('-')?.[1])
  if (month >= 1 && month <= 12) values[excelColumn(month + 2)] = item.monthly ?? 0
  values.Q = item.monthly ?? 0
  values.R = item.monthly ?? 0
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

export async function createEstockWorkbook({ regularRows = [], donationRows = [], mhmapRows = [], stockMonth = '2026-11' } = {}) {
  const response = await fetch('/templates/E-STOCK.xlsx')
  if (!response.ok) throw new Error('Hindi ma-load ang E-STOCK.xlsx template.')

  const entries = readZipEntries(await response.arrayBuffer())
  const sheets = [
    { file: 'xl/worksheets/sheet1.xml', rows: regularRows, map: regularCellValues, monthTitleCell: 'M1' },
    { file: 'xl/worksheets/sheet2.xml', rows: donationRows, map: stockCellValues, monthTitleCell: 'H1' },
    { file: 'xl/worksheets/sheet3.xml', rows: mhmapRows, map: stockCellValues, monthTitleCell: 'H1' },
    { file: 'xl/worksheets/sheet4.xml', rows: regularRows, map: (item, row) => monthlyCellValues(item, row, stockMonth), startRow: 4 },
  ]

  for (const sheet of sheets) {
    const entry = entries.find((candidate) => candidate.name === sheet.file)
    if (!entry) throw new Error(`Walang worksheet sa template: ${sheet.file}`)
    const bytes = await transformBytes(entry.compressedData, 'deflate-raw', DecompressionStream)
    let xml = new TextDecoder().decode(bytes)
    if (sheet.monthTitleCell) {
      const [year, month] = stockMonth.split('-').map(Number)
      const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()
      xml = setCell(xml, sheet.monthTitleCell, `*${monthLabel}`)
    }
    sheet.rows.forEach((item, index) => {
      sheet.map(item, index + (sheet.startRow || 3)).forEach(([reference, value]) => {
        if (value !== '' && value !== null && value !== undefined) xml = setCell(xml, reference, value)
      })
    })
    entry.updatedText = xml
  }
  return writeZip(entries)
}
