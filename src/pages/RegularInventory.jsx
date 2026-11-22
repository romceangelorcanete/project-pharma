import { useEffect, useState } from 'react'
import MonthYearPicker from '../components/MonthYearPicker.jsx'
import MonthlyStockCard from '../components/MonthlyStockCard.jsx'
import ExportEstockButton from '../components/ExportEstockButton.jsx'
import useInventoryRows from '../hooks/useInventoryRows.js'
import { calculateInventoryTotals } from '../utils/inventoryCalculations.js'
import { reconcileStockCardEntries } from '../utils/stockCardEntries.js'
import { getRegularDropdownOptions } from './regularDropdownOptions.js'
import './RegularInventory.css'
export const sampleRegularRows = [
  { no: 1, name: '0.9 Sodium Chloride, 50ml vial', unit: 'vial', price: '₱44.55', dpri: '₱59.88', category: 'SMALL VIALS', other: 'NONE', expiry: '04/2031', lot: '260418', beginning: 734, deliveries: [{ date: '7/2/2026', qty: 300, vendor: 'EUROMED' }], daily: { 3: 8, 4: 1 }, ending: 725, monthly: 9, weekly: [9, 0, 0, 0, 0] },
  { no: 9, name: 'Acetylcysteine 600mg tablet', unit: 'tablet', price: '₱23.00', dpri: '₱36.36', category: 'COUGH SUPPRESSANTS', other: '', expiry: '03/2029', lot: '2603085\n0495', beginning: 1661, deliveries: [{ date: '10/14/2026', qty: 50, vendor: 'OAK' }, { date: '10/23/2026', qty: 100, vendor: 'ICS' }], daily: { 1: 63, 2: 38, 3: 34, 5: 36 }, ending: 1490, monthly: 171, weekly: [135, 36, 0, 0, 0] },
  { no: 14, name: 'Albendazole 400mg tablet', unit: 'tablet', price: '₱7.00', dpri: '₱8.00', category: 'ANTI-BIOTICS / MICROBIALS', other: '', expiry: '02/2028\n10/2027', lot: 'XT6C022\nXT5K007', beginning: 294, deliveries: [{ date: '4/28/2026', qty: 200, vendor: 'DYNA' }, { date: '5/5/2026', qty: 100, vendor: 'OAK' }], daily: {}, ending: 294, monthly: 0, weekly: [0, 0, 0, 0, 0] },
]


const weeklyRanges = ['1-7', '8-14', '15-21', '22-28', '29-30']
const otherCategoryOptions = ['MOBCHA', 'YAKAP', 'OR', 'HIGH ALERT', 'NONE']
const todayDateInput = () => { const today = new Date(); return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}` }
const blankDelivery = () => ({ date: todayDateInput(), qty: '', vendor: '' })
const blankItemForm = () => ({ name: '', unit: '', price: '', dpri: '', category: '', other: '', expiryDates: [''], lotNumbers: [''], beginning: '', deliveries: [blankDelivery()], daily: {}, stockCardEntries: [], ending: '', monthly: '', weekly: ['', '', '', '', ''] })

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

export default function RegularInventory({ stockMonth, onStockMonthChange, onOpenStockCard, registerStockCardReturnUpdater, preparedBy, preparedByPosition }) {
  const [rows, setRows] = useInventoryRows('regular', sampleRegularRows, stockMonth)
  const draftStorageKey = `pharma-inventory-form-draft:regular:${stockMonth}`
  const [savedFormDraft] = useState(() => {
    try { return JSON.parse(window.sessionStorage.getItem(draftStorageKey) || 'null') } catch { return null }
  })
  const [search, setSearch] = useState('')
  const [unitFilter, setUnitFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sort, setSort] = useState('default')
  const [addItemOpen, setAddItemOpen] = useState(() => Boolean(savedFormDraft?.open))
  const [editingItemNo, setEditingItemNo] = useState(() => savedFormDraft?.editingNo ?? null)
  const [itemForm, setItemForm] = useState(() => savedFormDraft?.itemForm || blankItemForm())
  const [dropdownOptions] = useState(getRegularDropdownOptions)
  const calculatedTotals = calculateInventoryTotals(itemForm, weeklyRanges)
  useEffect(() => {
    try {
      if (addItemOpen) window.sessionStorage.setItem(draftStorageKey, JSON.stringify({ open: true, editingNo: editingItemNo, itemForm }))
      else window.sessionStorage.removeItem(draftStorageKey)
    } catch { /* Keep the form usable when browser storage is unavailable. */ }
  }, [draftStorageKey, addItemOpen, editingItemNo, itemForm])
  useEffect(() => {
    if (!registerStockCardReturnUpdater) return undefined
    const updateDraft = (updated) => setItemForm((current) => ({ ...current, beginning: updated.beginning, deliveries: updated.deliveries.map((delivery) => ({ date: toDateInput(delivery.date), qty: delivery.qty, vendor: delivery.vendor })), daily: updated.daily, stockCardEntries: updated.stockCardEntries }))
    registerStockCardReturnUpdater(updateDraft)
    return () => registerStockCardReturnUpdater(null)
  }, [registerStockCardReturnUpdater])
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
      lotNumbers: String(item.lot || '').split('\n').filter(Boolean).length ? String(item.lot || '').split('\n').filter(Boolean) : [''],
      beginning: item.beginning ?? '',
      deliveries: item.deliveries?.length ? item.deliveries.map((delivery) => ({ date: toDateInput(delivery.date || ''), qty: delivery.qty ?? '', vendor: delivery.vendor || '' })) : [blankDelivery()],
      daily: { ...(item.daily || {}) },
      stockCardEntries: item.stockCardEntries || [],
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

  function updateLotNumber(index, value) {
    setItemForm((current) => ({
      ...current,
      lotNumbers: current.lotNumbers.map((lot, rowIndex) => rowIndex === index ? value : lot),
    }))
  }

  function updateDaily(day, value) {
    setItemForm((current) => ({ ...current, daily: { ...current.daily, [day]: value } }))
  }

  function addSampleItem(event) {
    event.preventDefault()
    const beginning = Number(itemForm.beginning) || 0
    const deliveries = itemForm.deliveries
      .filter((delivery) => (delivery.qty !== '' && delivery.qty != null) || delivery.vendor.trim())
      .map((delivery) => ({ date: toStockCardDate(delivery.date), qty: Number(delivery.qty) || 0, vendor: delivery.vendor.trim() }))
    const calculatedTotals = calculateInventoryTotals({ ...itemForm, beginning, deliveries }, weeklyRanges)
    const newItem = {
      no: editingItemNo ?? Math.max(0, ...rows.map((item) => Number(item.no) || 0)) + 1,
      name: itemForm.name.trim(),
      unit: itemForm.unit.trim(),
      price: itemForm.price ? `\u20B1${Number(itemForm.price).toFixed(2)}` : '',
      dpri: itemForm.dpri ? `\u20B1${Number(itemForm.dpri).toFixed(2)}` : '',
      category: itemForm.category.trim(),
      other: itemForm.other.trim(),
      expiry: itemForm.expiryDates.map((expiry) => toExpiryStockValue(expiry.trim())).filter(Boolean).join('\n'),
      lot: itemForm.lotNumbers.map((lot) => lot.trim()).filter(Boolean).join('\n'),
      beginning,
      deliveries,
      daily: { ...Object.fromEntries(Object.entries(itemForm.daily).map(([day, qty]) => [day, Number(qty) || 0])) },
      stockCardEntries: reconcileStockCardEntries({ ...itemForm, beginning, deliveries, daily: itemForm.daily }, stockMonth),
      ending: calculatedTotals.ending,
      monthly: calculatedTotals.monthly,
      weekly: calculatedTotals.weekly,
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

  function deleteSampleItem() {
    const itemName = rows.find((item) => item.no === editingItemNo)?.name
    if (!window.confirm(`Delete ${itemName || 'this item'} from the sample list?`)) return
    setRows((current) => current.filter((item) => item.no !== editingItemNo))
    setAddItemOpen(false)
    setEditingItemNo(null)
    setItemForm(blankItemForm())
  }

  return (
    <div className="section-page-content">
      <section className="dashboard-card regular-ledger-card" id="regular">
        <div className="ledger-heading">
          <div><span className="ledger-kicker">E-STOCK / REGULAR</span><h2>Regular inventory</h2><p>Monthly stock card · {monthLabel}</p></div>
          <div className="ledger-actions"><span className="sample-indicator"><i /> Sample data</span></div>
        </div>
        <div className="regular-inventory-actions"><span>Sample only · not saved to database</span><div className="regular-toolbar-actions"><div className="regular-period-control"><span>Date / year</span><MonthYearPicker value={stockMonth} onChange={onStockMonthChange} /></div><ExportEstockButton rows={rows} preparedBy={preparedBy} preparedByPosition={preparedByPosition} activeSheet="regular" stockMonth={stockMonth} /><button className="regular-add-item-button" type="button" onClick={beginAddItem}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12" /></svg>Add item</button></div></div>
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
            <label>Beginning balance<input name="beginning" type="number" min="0" step="1" value={itemForm.beginning} onChange={updateItemForm} placeholder="0" /></label>
            <fieldset className="regular-lots-fieldset"><legend>Lot numbers</legend><div className="regular-lots-list">{itemForm.lotNumbers.map((lot, index) => <div className="regular-lot-fields" key={index}><label><span>{index === 0 ? 'Lot number' : `Lot number ${index + 1}`}</span><input value={lot} onChange={(event) => updateLotNumber(index, event.target.value)} placeholder="Lot number" /></label>{itemForm.lotNumbers.length > 1 && <button type="button" className="regular-remove-delivery" aria-label={`Remove lot number ${index + 1}`} onClick={() => setItemForm((current) => ({ ...current, lotNumbers: current.lotNumbers.filter((_, rowIndex) => rowIndex !== index) }))}>Remove</button>}</div>)}<button type="button" className="regular-add-delivery" onClick={() => setItemForm((current) => ({ ...current, lotNumbers: [...current.lotNumbers, ''] }))}>+ Add lot number</button></div></fieldset>
            <fieldset className="regular-expiries-fieldset"><legend>Expiry dates</legend><div className="regular-expiries-list">{itemForm.expiryDates.map((expiry, index) => <div className="regular-expiry-fields" key={index}><label><span>{index === 0 ? 'Expiry date' : `Expiry date ${index + 1}`}</span><input type="date" value={expiry} onChange={(event) => updateExpiryDate(index, event.target.value)} /></label>{itemForm.expiryDates.length > 1 && <button type="button" className="regular-remove-delivery" aria-label={`Remove expiry date ${index + 1}`} onClick={() => setItemForm((current) => ({ ...current, expiryDates: current.expiryDates.filter((_, rowIndex) => rowIndex !== index) }))}>Remove</button>}</div>)}<button type="button" className="regular-add-delivery" onClick={() => setItemForm((current) => ({ ...current, expiryDates: [...current.expiryDates, ''] }))}>+ Add expiry date</button></div></fieldset>
            <fieldset className="regular-deliveries-fieldset"><legend>Deliveries</legend>{itemForm.deliveries.map((delivery, index) => <div className="regular-delivery-fields" key={index}><label>Delivery date<input type="date" value={delivery.date} onChange={(event) => updateDelivery(index, 'date', event.target.value)} /></label><label>Qty delivered<input type="number" min="0" step="1" value={delivery.qty} onChange={(event) => updateDelivery(index, 'qty', event.target.value)} placeholder="0" /></label><label>Supplier<input value={delivery.vendor} onChange={(event) => updateDelivery(index, 'vendor', event.target.value)} placeholder="Supplier name" /></label>{itemForm.deliveries.length > 1 && <button type="button" className="regular-remove-delivery" onClick={() => setItemForm((current) => ({ ...current, deliveries: current.deliveries.filter((_, rowIndex) => rowIndex !== index) }))}>Remove</button>}</div>)}<button type="button" className="regular-add-delivery" onClick={() => setItemForm((current) => ({ ...current, deliveries: [...current.deliveries, { ...blankDelivery(), date: todayDateInput() }] }))}>+ Add delivery</button></fieldset>
            <label>Ending balance<input type="number" value={calculatedTotals.ending} readOnly /></label>
            <label>Monthly consumption<input type="number" value={calculatedTotals.monthly} readOnly /></label>
            <fieldset className="regular-daily-fieldset"><legend>Daily consumption · days 1–31</legend><div className="regular-daily-grid">{Array.from({ length: 31 }, (_, index) => index + 1).map((day) => <label key={day}><span>{day}</span><input aria-label={`Day ${day} consumption`} type="number" min="0" step="1" value={itemForm.daily[day] ?? ''} onChange={(event) => updateDaily(day, event.target.value)} /></label>)}</div></fieldset>
            <fieldset className="regular-weekly-fieldset"><legend>Weekly consumption</legend><div>{weeklyRanges.map((range, index) => <label key={range}>{range}<input type="number" value={calculatedTotals.weekly[index]} readOnly /></label>)}</div></fieldset>
            <div className="regular-item-form-actions"><button type="button" className="regular-stockcards-button" onClick={() => { const saved = rows.find((item) => item.no === editingItemNo) || rows[0] || {}; const deliveries = itemForm.deliveries.filter((delivery) => (delivery.qty !== '' && delivery.qty != null) || delivery.vendor.trim()).map((delivery) => ({ date: delivery.date, qty: Number(delivery.qty) || 0, vendor: delivery.vendor.trim() })); const daily = Object.fromEntries(Object.entries(itemForm.daily).map(([day, amount]) => [day, Number(amount) || 0])); const selected = { ...saved, no: editingItemNo ?? saved.no, name: itemForm.name, unit: itemForm.unit, category: itemForm.category, other: itemForm.other, beginning: Number(itemForm.beginning) || 0, deliveries, daily, stockCardEntries: reconcileStockCardEntries({ ...itemForm, deliveries, daily }, stockMonth), ending: calculatedTotals.ending, monthly: calculatedTotals.monthly, weekly: calculatedTotals.weekly }; const updateDraft = (updated) => setItemForm((current) => ({ ...current, beginning: updated.beginning, deliveries: updated.deliveries.map((delivery) => ({ date: toDateInput(delivery.date), qty: delivery.qty, vendor: delivery.vendor })), daily: updated.daily, stockCardEntries: updated.stockCardEntries })); onOpenStockCard?.(selected, stockMonth, 'regular', updateDraft) }}>Stock Cards</button>{editingItemNo !== null && <button type="button" className="regular-remove-delivery regular-delete-item-button" onClick={deleteSampleItem}>Delete item</button>}<button type="button" className="regular-item-cancel" onClick={() => { setAddItemOpen(false); setEditingItemNo(null) }}>Cancel</button><button type="submit" className="regular-add-item-button">{editingItemNo === null ? 'Add sample item' : 'Save sample changes'}</button></div>
          </form>
        </section>
      </div>}
    </div>
  )
}

function SearchIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.7" cy="8.7" r="5.7" /><path d="m13 13 4 4" /></svg>
}
