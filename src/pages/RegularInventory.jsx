import { useState } from 'react'
import MonthYearPicker from '../components/MonthYearPicker.jsx'
import MonthlyStockCard from '../components/MonthlyStockCard.jsx'
import { getRegularDropdownOptions } from './regularDropdownOptions.js'
import './RegularInventory.css'
export const sampleRegularRows = [
  { no: 1, name: '0.9 Sodium Chloride, 50ml vial', unit: 'vial', price: '₱44.55', dpri: '₱59.88', category: 'SMALL VIALS', other: 'NONE', expiry: '04/2031', lot: '260418', beginning: 734, deliveries: [{ date: '7/2/2026', qty: 300, vendor: 'EUROMED' }], daily: { 3: 8, 4: 1 }, ending: 725, monthly: 9, weekly: [9, 0, 0, 0, 0] },
  { no: 9, name: 'Acetylcysteine 600mg tablet', unit: 'tablet', price: '₱23.00', dpri: '₱36.36', category: 'COUGH SUPPRESSANTS', other: '', expiry: '03/2029', lot: '2603085\n0495', beginning: 1661, deliveries: [{ date: '10/14/2026', qty: 50, vendor: 'OAK' }, { date: '10/23/2026', qty: 100, vendor: 'ICS' }], daily: { 1: 63, 2: 38, 3: 34, 5: 36 }, ending: 1490, monthly: 171, weekly: [135, 36, 0, 0, 0] },
  { no: 14, name: 'Albendazole 400mg tablet', unit: 'tablet', price: '₱7.00', dpri: '₱8.00', category: 'ANTI-BIOTICS / MICROBIALS', other: '', expiry: '02/2028\n10/2027', lot: 'XT6C022\nXT5K007', beginning: 294, deliveries: [{ date: '4/28/2026', qty: 200, vendor: 'DYNA' }, { date: '5/5/2026', qty: 100, vendor: 'OAK' }], daily: {}, ending: 294, monthly: 0, weekly: [0, 0, 0, 0, 0] },
]


const weeklyRanges = ['1-7', '8-14', '15-21', '22-28', '29-30']
const otherCategoryOptions = ['MOBCHA', 'YAKAP', 'OR', 'HIGH ALERT', 'NONE']
const blankDelivery = () => ({ date: '', qty: '', vendor: '' })
const blankItemForm = () => ({ name: '', unit: '', price: '', dpri: '', category: '', other: '', expiryDates: [''], lot: '', beginning: '', deliveries: [blankDelivery()], daily: {}, returnQty: '', ending: '', monthly: '', weekly: ['', '', '', '', ''] })

function toDateInput(value = '') {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  return match ? `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}` : value
}

function toStockCardDate(value = '') {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match ? `${Number(match[2])}/${Number(match[3])}/${match[1]}` : value
}

function toExpiryDateInput(value = '') {
  const fullDate = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (fullDate) return `${fullDate[3]}-${fullDate[1].padStart(2, '0')}-${fullDate[2].padStart(2, '0')}`
  const monthYear = value.match(/^(\d{1,2})\/(\d{4})$/)
  if (monthYear) return `${monthYear[2]}-${monthYear[1].padStart(2, '0')}-01`
  return value.match(/^\d{4}-\d{2}-\d{2}$/) ? value : ''
}

function toExpiryStockValue(value = '') {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return value
  return match[3] === '01'
    ? `${match[2]}/${match[1]}`
    : `${Number(match[2])}/${Number(match[3])}/${match[1]}`
}

function xmlEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character])
}

function columnName(index) {
  let name = ''
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(65 + ((value - 1) % 26)) + name
  }
  return name
}

function makeXlsxBlob(headers, dataRows) {
  const rows = [headers, ...dataRows]
  const sheetRows = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      const reference = `${columnName(columnIndex)}${rowIndex + 1}`
      if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${reference}"><v>${value}</v></c>`
      return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`
    }).join('')
    return `<row r="${rowIndex + 1}">${cells}</row>`
  }).join('')
  const files = [
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Regular Inventory" sheetId="1" r:id="rId1"/></sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'],
    ['xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`],
  ]

  const encoder = new TextEncoder()
  const crcTable = Array.from({ length: 256 }, (_, number) => {
    let value = number
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    return value >>> 0
  })
  const crc32 = (bytes) => {
    let crc = 0xffffffff
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
    return (crc ^ 0xffffffff) >>> 0
  }
  const parts = []
  const entries = []
  let offset = 0
  const push = (bytes) => { parts.push(bytes); offset += bytes.length }
  files.forEach(([path, content]) => {
    const name = encoder.encode(path)
    const data = encoder.encode(content)
    const checksum = crc32(data)
    const local = new Uint8Array(30 + name.length)
    const localView = new DataView(local.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(6, 0x0800, true)
    localView.setUint32(14, checksum, true)
    localView.setUint32(18, data.length, true)
    localView.setUint32(22, data.length, true)
    localView.setUint16(26, name.length, true)
    local.set(name, 30)
    entries.push({ name, data, checksum, offset })
    push(local)
    push(data)
  })
  const centralOffset = offset
  entries.forEach(({ name, data, checksum, offset: localOffset }) => {
    const central = new Uint8Array(46 + name.length)
    const view = new DataView(central.buffer)
    view.setUint32(0, 0x02014b50, true)
    view.setUint16(4, 20, true)
    view.setUint16(6, 20, true)
    view.setUint16(8, 0x0800, true)
    view.setUint32(16, checksum, true)
    view.setUint32(20, data.length, true)
    view.setUint32(24, data.length, true)
    view.setUint16(28, name.length, true)
    view.setUint32(42, localOffset, true)
    central.set(name, 46)
    push(central)
  })
  const centralSize = offset - centralOffset
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(8, entries.length, true)
  endView.setUint16(10, entries.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, centralOffset, true)
  push(end)
  return new Blob(parts, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export default function RegularInventory({ stockMonth, onStockMonthChange, onOpenStockCard }) {
  const [rows, setRows] = useState(sampleRegularRows)
  const [search, setSearch] = useState('')
  const [unitFilter, setUnitFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sort, setSort] = useState('default')
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [editingItemNo, setEditingItemNo] = useState(null)
  const [itemForm, setItemForm] = useState(blankItemForm)
  const [dropdownOptions] = useState(getRegularDropdownOptions)
  const [year, monthNumber] = stockMonth.split('-').map(Number)
  const monthLabel = new Date(year, monthNumber - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const visibleRows = rows
    .filter((item) => item.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    .filter((item) => unitFilter === 'all' || item.unit === unitFilter)
    .filter((item) => categoryFilter === 'all' || item.category === categoryFilter)
    .sort((a, b) => sort === 'default' ? 0 : sort === 'az' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name))

  function updateItemForm(event) {
    const { name, value } = event.target
    setItemForm((current) => ({ ...current, [name]: value }))
  }

  function beginAddItem() {
    setEditingItemNo(null)
    setItemForm(blankItemForm())
    setAddItemOpen(true)
  }

  function beginEditItem(item) {
    setEditingItemNo(item.no)
    setItemForm({
      name: item.name || '',
      unit: item.unit || '',
      price: item.price ? item.price.replace(/[^0-9.]/g, '') : '',
      dpri: item.dpri ? item.dpri.replace(/[^0-9.]/g, '') : '',
      category: item.category || '',
      other: item.other || '',
      expiryDates: String(item.expiry || '').split('\n').filter(Boolean).length
        ? String(item.expiry || '').split('\n').filter(Boolean).map(toExpiryDateInput)
        : [''],
      lot: item.lot || '',
      beginning: item.beginning ?? '',
      deliveries: item.deliveries?.length ? item.deliveries.map((delivery) => ({ date: toDateInput(delivery.date || ''), qty: delivery.qty ?? '', vendor: delivery.vendor || '' })) : [blankDelivery()],
      daily: { ...(item.daily || {}) },
      returnQty: item.daily?.return ?? '',
      ending: item.ending ?? '',
      monthly: item.monthly ?? '',
      weekly: weeklyRanges.map((_, index) => item.weekly?.[index] ?? 0),
    })
    setAddItemOpen(true)
  }

  function updateDelivery(index, key, value) {
    setItemForm((current) => ({
      ...current,
      deliveries: current.deliveries.map((delivery, rowIndex) => rowIndex === index ? { ...delivery, [key]: value } : delivery),
    }))
  }

  function updateExpiryDate(index, value) {
    setItemForm((current) => ({
      ...current,
      expiryDates: current.expiryDates.map((expiry, rowIndex) => rowIndex === index ? value : expiry),
    }))
  }

  function updateDaily(day, value) {
    setItemForm((current) => ({ ...current, daily: { ...current.daily, [day]: value } }))
  }

  function exportExcel() {
    const headers = ['#', 'Items', 'Unit of Measure', 'Unit Price', 'DPRI Price', 'Category', 'Other Category (MOBCHA, YAKAP)', 'Expiry Date', 'Lot Number', 'Beginning Balance', 'Delivery Date', 'Qty Delivered', 'Supplier', ...Array.from({ length: 31 }, (_, index) => String(index + 1)), 'SL RET', 'Ending Balance', 'Monthly Consumption', ...weeklyRanges.map((range) => `Weekly ${range}`)]
    const data = rows.map((item) => {
      const deliveries = item.deliveries || []
      return [item.no, item.name, item.unit, item.price, item.dpri, item.category, item.other, item.expiry, item.lot, item.beginning, deliveries.map((delivery) => delivery.date || '').join('\n'), deliveries.map((delivery) => delivery.qty ?? '').join('\n'), deliveries.map((delivery) => delivery.vendor || '').join('\n'), ...Array.from({ length: 31 }, (_, index) => item.daily?.[index + 1] ?? ''), item.daily?.return ?? '', item.ending, item.monthly, ...weeklyRanges.map((_, index) => item.weekly?.[index] ?? '')]
    })
    const blob = makeXlsxBlob(headers, data)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Regular-Inventory-${stockMonth}.xlsx`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  function addSampleItem(event) {
    event.preventDefault()
    const beginning = Number(itemForm.beginning) || 0
    const deliveries = itemForm.deliveries
      .filter((delivery) => delivery.date || delivery.qty || delivery.vendor.trim())
      .map((delivery) => ({ date: toStockCardDate(delivery.date), qty: Number(delivery.qty) || 0, vendor: delivery.vendor.trim() }))
    const deliveredQty = deliveries.reduce((total, delivery) => total + delivery.qty, 0)
    const newItem = {
      no: editingItemNo ?? Math.max(0, ...rows.map((item) => Number(item.no) || 0)) + 1,
      name: itemForm.name.trim(),
      unit: itemForm.unit.trim(),
      price: itemForm.price ? `\u20B1${Number(itemForm.price).toFixed(2)}` : '',
      dpri: itemForm.dpri ? `\u20B1${Number(itemForm.dpri).toFixed(2)}` : '',
      category: itemForm.category.trim(),
      other: itemForm.other.trim(),
      expiry: itemForm.expiryDates.map((expiry) => toExpiryStockValue(expiry.trim())).filter(Boolean).join('\n'),
      lot: itemForm.lot.trim(),
      beginning,
      deliveries,
      daily: { ...Object.fromEntries(Object.entries(itemForm.daily).map(([day, qty]) => [day, Number(qty) || 0])), return: Number(itemForm.returnQty) || 0 },
      ending: itemForm.ending === '' ? beginning + deliveredQty : Number(itemForm.ending) || 0,
      monthly: Number(itemForm.monthly) || 0,
      weekly: itemForm.weekly.map((qty) => Number(qty) || 0),
    }
    if (editingItemNo !== null) {
      setRows((current) => current.map((item) => item.no === editingItemNo ? newItem : item))
    } else {
      setRows((current) => [...current, newItem])
    }
    setSearch('')
    setUnitFilter('all')
    setCategoryFilter('all')
    setSort('default')
    setItemForm(blankItemForm())
    setEditingItemNo(null)
    setAddItemOpen(false)
  }

  return (
    <div className="section-page-content">
      <section className="dashboard-card regular-ledger-card" id="regular">
        <div className="ledger-heading">
          <div><span className="ledger-kicker">E-STOCK / REGULAR</span><h2>Regular inventory</h2><p>Monthly stock card · {monthLabel}</p></div>
          <div className="ledger-actions"><span className="sample-indicator"><i /> Sample data</span><MonthYearPicker value={stockMonth} onChange={onStockMonthChange} /></div>
        </div>
        <div className="regular-inventory-actions"><span>Sample only · not saved to database</span><div className="regular-toolbar-actions"><button className="regular-export-button" type="button" onClick={exportExcel}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M4 13v3h12v-3" /></svg>Export Excel</button><button className="regular-add-item-button" type="button" onClick={beginAddItem}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12" /></svg>Add item</button></div></div>
        <div className="regular-tools" role="search" aria-label="Filter Regular inventory items">
          <label className="regular-search"><span className="sr-only">Search Items</span><SearchIcon /><input type="search" placeholder="Search Items" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <label className="regular-select"><span>Unit of Measure</span><select value={unitFilter} onChange={(event) => setUnitFilter(event.target.value)}><option value="all">All units</option>{dropdownOptions.units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label>
          <label className="regular-select"><span>Category</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">All categories</option>{dropdownOptions.categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
          <div className="regular-sort"><span>Sort items</span><div><button type="button" className={sort === 'az' ? 'active' : ''} aria-pressed={sort === 'az'} onClick={() => setSort('az')}>A to Z</button><button type="button" className={sort === 'za' ? 'active' : ''} aria-pressed={sort === 'za'} onClick={() => setSort('za')}>Z to A</button></div></div>
        </div>
        <div className="ledger-hint"><span>↔</span> Swipe or scroll horizontally to view all stock-card columns</div>
        {visibleRows.length === 0 && <p className="regular-empty-results">No items match your search or filters.</p>}
        <MonthlyStockCard rows={visibleRows} periodLabels={weeklyRanges} regular monthLabel={monthLabel} onItemClick={beginEditItem} />
      </section>
      {addItemOpen && <div className="regular-item-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAddItemOpen(false) }}>
        <section className="regular-item-modal" role="dialog" aria-modal="true" aria-labelledby="regular-add-item-title">
          <div className="regular-item-modal-heading"><div><span className="ledger-kicker">E-STOCK / REGULAR · SAMPLE</span><h2 id="regular-add-item-title">{editingItemNo === null ? 'Add item' : 'Edit item'}</h2><p>This preview is not saved to the database.</p></div></div>
          <form className="regular-item-form" onSubmit={addSampleItem}>
            <label className="regular-item-name-field">Item name<input name="name" value={itemForm.name} onChange={updateItemForm} placeholder="Medicine or supply name" required autoFocus /></label>
            <label>Unit of measure<select name="unit" value={itemForm.unit} onChange={updateItemForm}><option value="">Select a unit</option>{itemForm.unit && !dropdownOptions.units.includes(itemForm.unit) && <option value={itemForm.unit}>{itemForm.unit}</option>}{dropdownOptions.units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label>
            <label>Unit price<input name="price" type="number" min="0" step="0.01" value={itemForm.price} onChange={updateItemForm} placeholder="0.00" /></label>
            <label>DPRI price<input name="dpri" type="number" min="0" step="0.01" value={itemForm.dpri} onChange={updateItemForm} placeholder="0.00" /></label>
            <label>Category<select name="category" value={itemForm.category} onChange={updateItemForm}><option value="">Select a category</option>{itemForm.category && !dropdownOptions.categories.includes(itemForm.category) && <option value={itemForm.category}>{itemForm.category}</option>}{dropdownOptions.categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
            <label>Other category<select name="other" value={itemForm.other} onChange={updateItemForm}><option value="">Select other category</option>{itemForm.other && !otherCategoryOptions.includes(itemForm.other) && <option value={itemForm.other}>{itemForm.other}</option>}{otherCategoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
            <label>Lot number<input name="lot" value={itemForm.lot} onChange={updateItemForm} placeholder="Lot number" /></label>
            <label>Beginning balance<input name="beginning" type="number" min="0" step="1" value={itemForm.beginning} onChange={updateItemForm} placeholder="0" /></label>
            <fieldset className="regular-expiries-fieldset"><legend>Expiry dates</legend><div className="regular-expiries-list">{itemForm.expiryDates.map((expiry, index) => <div className="regular-expiry-fields" key={index}><label><span>{index === 0 ? 'Expiry date' : `Expiry date ${index + 1}`}</span><input type="date" value={expiry} onChange={(event) => updateExpiryDate(index, event.target.value)} /></label>{itemForm.expiryDates.length > 1 && <button type="button" className="regular-remove-delivery" aria-label={`Remove expiry date ${index + 1}`} onClick={() => setItemForm((current) => ({ ...current, expiryDates: current.expiryDates.filter((_, rowIndex) => rowIndex !== index) }))}>Remove</button>}</div>)}<button type="button" className="regular-add-delivery" onClick={() => setItemForm((current) => ({ ...current, expiryDates: [...current.expiryDates, ''] }))}>+ Add expiry date</button></div></fieldset>
            <fieldset className="regular-deliveries-fieldset"><legend>Deliveries</legend>{itemForm.deliveries.map((delivery, index) => <div className="regular-delivery-fields" key={index}><label>Delivery date<input type="date" value={delivery.date} onChange={(event) => updateDelivery(index, 'date', event.target.value)} /></label><label>Qty delivered<input type="number" min="0" step="1" value={delivery.qty} onChange={(event) => updateDelivery(index, 'qty', event.target.value)} placeholder="0" /></label><label>Supplier<input value={delivery.vendor} onChange={(event) => updateDelivery(index, 'vendor', event.target.value)} placeholder="Supplier name" /></label>{itemForm.deliveries.length > 1 && <button type="button" className="regular-remove-delivery" onClick={() => setItemForm((current) => ({ ...current, deliveries: current.deliveries.filter((_, rowIndex) => rowIndex !== index) }))}>Remove</button>}</div>)}<button type="button" className="regular-add-delivery" onClick={() => setItemForm((current) => ({ ...current, deliveries: [...current.deliveries, blankDelivery()] }))}>+ Add delivery</button></fieldset>
            <label>Ending balance<input name="ending" type="number" min="0" step="1" value={itemForm.ending} onChange={updateItemForm} placeholder="Auto-calculate from balance and deliveries" /></label>
            <label>Monthly consumption<input name="monthly" type="number" min="0" step="1" value={itemForm.monthly} onChange={updateItemForm} placeholder="0" /></label>
            <fieldset className="regular-daily-fieldset"><legend>Daily consumption · days 1–31</legend><div className="regular-daily-grid">{Array.from({ length: 31 }, (_, index) => index + 1).map((day) => <label key={day}><span>{day}</span><input aria-label={`Day ${day} consumption`} type="number" min="0" step="1" value={itemForm.daily[day] ?? ''} onChange={(event) => updateDaily(day, event.target.value)} /></label>)}</div><label className="regular-return-field">SL RET<input type="number" min="0" step="1" value={itemForm.returnQty} onChange={(event) => setItemForm((current) => ({ ...current, returnQty: event.target.value }))} /></label></fieldset>
            <fieldset className="regular-weekly-fieldset"><legend>Weekly consumption</legend><div>{weeklyRanges.map((range, index) => <label key={range}>{range}<input type="number" min="0" step="1" value={itemForm.weekly[index]} onChange={(event) => setItemForm((current) => ({ ...current, weekly: current.weekly.map((qty, weeklyIndex) => weeklyIndex === index ? event.target.value : qty) }))} /></label>)}</div></fieldset>
            <div className="regular-item-form-actions"><button type="button" className="regular-stockcards-button" onClick={() => { const selected = rows.find((item) => item.no === editingItemNo) || rows[0]; setAddItemOpen(false); onOpenStockCard?.(selected, stockMonth) }}>Stock Cards</button><button type="button" className="regular-item-cancel" onClick={() => { setAddItemOpen(false); setEditingItemNo(null) }}>Cancel</button><button type="submit" className="regular-add-item-button">{editingItemNo === null ? 'Add sample item' : 'Save sample changes'}</button></div>
          </form>
        </section>
      </div>}
    </div>
  )
}

function SearchIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.7" cy="8.7" r="5.7" /><path d="m13 13 4 4" /></svg>
}
