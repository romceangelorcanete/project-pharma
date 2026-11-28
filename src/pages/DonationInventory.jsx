import { useEffect, useState } from 'react'
import MonthYearPicker from '../components/MonthYearPicker.jsx'
import MonthlyStockCard from '../components/MonthlyStockCard.jsx'
import ExportEstockButton from '../components/ExportEstockButton.jsx'
import { getRegularDropdownOptions } from './regularDropdownOptions.js'
import useInventoryRows, { deleteInventoryItem, persistInventoryRows } from '../hooks/useInventoryRows.js'
import { calculateInventoryTotals } from '../utils/inventoryCalculations.js'
import { reconcileStockCardEntries } from '../utils/stockCardEntries.js'
import './RegularInventory.css'
import './DonationInventory.css'

export const sampleDonationRows = [
  { no: 1, name: 'Aciclovir 250mg vial', unit: 'vial', expiry: '', lot: '', beginning: 0, deliveries: [], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 2, name: 'Amikacin 125mg/ml vial', unit: 'vial', expiry: '', lot: '', beginning: 0, deliveries: [{ date: '9/4/2026', qty: 68, vendor: 'PGH' }], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 4, name: 'Amino Acid 7%', unit: 'bottle', expiry: '12/2026', lot: '2250117', beginning: 10, deliveries: [{ date: '10/14/2026', qty: 20, vendor: 'VMC' }], daily: { 1: 1, 3: 4, 4: 5 }, ending: 0, monthly: 10, weekly: [10, 0, 0, 0, 0] },
  { no: 5, name: '5% Amino Acids in 5% Sorbitol', unit: 'bottle', expiry: '', lot: '', beginning: 0, deliveries: [], daily: { 4: 1 }, ending: -1, monthly: 1, weekly: [1, 0, 0, 0, 0] },
  { no: 16, name: 'Azithromycin 500mg vial', unit: 'vial', expiry: '01/2027', lot: 'R45240151', beginning: 397, deliveries: [{ date: '7/16/2026', qty: 600, vendor: 'CONRADO' }], daily: { 1: 1, 4: 4 }, ending: 392, monthly: 5, weekly: [5, 0, 0, 0, 0] },
]

const donationWeeklyRanges = ['1-7', '8-14', '15-21', '22-28', '29-31']
const todayDateInput = () => { const today = new Date(); return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}` }
const blankDelivery = () => ({ date: todayDateInput(), qty: '', vendor: '' })
const blankForm = () => ({ name: '', unit: '', expiryDates: [''], lotNumbers: [''], beginning: '', deliveries: [blankDelivery()], daily: {}, stockCardEntries: [], ending: '', monthly: '', weekly: ['', '', '', '', ''] })

function dateToInput(value = '') {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  return match ? `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}` : value
}

function dateToStockValue(value = '') {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match ? `${Number(match[2])}/${Number(match[3])}/${match[1]}` : value
}

function expiryToInput(value = '') {
  const match = value.match(/^(\d{1,2})\/(\d{4})$/)
  if (match) return `${match[2]}-${match[1].padStart(2, '0')}-01`
  return dateToInput(value)
}

function expiryToStock(value = '') {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return value
  return match[3] === '01' ? `${match[2]}/${match[1]}` : `${Number(match[2])}/${Number(match[3])}/${match[1]}`
}

export default function DonationInventory({ stockMonth, onStockMonthChange, monthLabel, onOpenStockCard, registerStockCardReturnUpdater, preparedBy, preparedByPosition, inventoryType = 'donation', initialRows = sampleDonationRows, weeklyRanges = donationWeeklyRanges }) {
  const daysInMonth = new Date(Number(stockMonth.slice(0, 4)), Number(stockMonth.slice(5, 7)), 0).getDate()
  const isMhmap = inventoryType === 'mhmap'
  const pageLabel = isMhmap ? 'MHMAP' : 'Donation'
  const pageClass = isMhmap ? 'mhmap-inventory-page' : 'donation-inventory-page'
  const sectionId = isMhmap ? 'mhmap' : 'donation'
  const [rows, setRows] = useInventoryRows(sectionId, initialRows, stockMonth)
  const draftStorageKey = `pharma-inventory-form-draft:${sectionId}:${stockMonth}`
  const [savedFormDraft] = useState(() => {
    try { return JSON.parse(window.sessionStorage.getItem(draftStorageKey) || 'null') } catch { return null }
  })
  const [search, setSearch] = useState('')
  const [unitFilter, setUnitFilter] = useState('all')
  const [sort, setSort] = useState('default')
  const [itemFormOpen, setItemFormOpen] = useState(() => Boolean(savedFormDraft?.open))
  const [editingNo, setEditingNo] = useState(() => savedFormDraft?.editingNo ?? null)
  const [itemForm, setItemForm] = useState(() => savedFormDraft?.itemForm || blankForm())
  const calculatedTotals = calculateInventoryTotals(itemForm, weeklyRanges, daysInMonth)
  useEffect(() => {
    try {
      if (itemFormOpen) window.sessionStorage.setItem(draftStorageKey, JSON.stringify({ open: true, editingNo, itemForm }))
      else window.sessionStorage.removeItem(draftStorageKey)
    } catch { /* Keep the form usable when browser storage is unavailable. */ }
  }, [draftStorageKey, itemFormOpen, editingNo, itemForm])
  useEffect(() => {
    if (!registerStockCardReturnUpdater) return undefined
    const updateDraft = (updated) => {
      const beginning = Number(updated.beginning) || 0
      const formDeliveries = updated.deliveries.map((delivery) => ({ date: dateToInput(delivery.date), qty: Number(delivery.qty) || 0, vendor: delivery.vendor || '' }))
      const deliveries = formDeliveries.map((delivery) => ({ ...delivery, date: dateToStockValue(delivery.date) }))
      const daily = Object.fromEntries(Object.entries(updated.daily || {}).map(([day, qty]) => [day, Number(qty) || 0]))
      const totals = calculateInventoryTotals({ ...itemForm, beginning, deliveries: formDeliveries, daily }, weeklyRanges, daysInMonth)
      const savedItem = {
        no: editingNo ?? Math.max(0, ...rows.map((row) => Number(row.no) || 0)) + 1,
        name: itemForm.name.trim(), unit: itemForm.unit,
        expiry: itemForm.expiryDates.map((date) => expiryToStock(date)).filter(Boolean).join('\n'),
        lot: itemForm.lotNumbers.map((lot) => lot.trim()).filter(Boolean).join('\n'),
        beginning, deliveries, daily, stockCardEntries: updated.stockCardEntries,
        ending: totals.ending, monthly: totals.monthly, weekly: totals.weekly,
      }
      if (savedItem.name && editingNo !== null) {
        const nextRows = editingNo === null ? [...rows, savedItem] : rows.map((row) => row.no === editingNo ? savedItem : row)
        persistInventoryRows(sectionId, stockMonth, nextRows)
        setRows(nextRows)
      }
      const nextForm = { ...itemForm, beginning, deliveries: formDeliveries, daily, stockCardEntries: updated.stockCardEntries, ending: totals.ending, monthly: totals.monthly, weekly: totals.weekly }
      try { window.sessionStorage.setItem(draftStorageKey, JSON.stringify({ open: true, editingNo, itemForm: nextForm })) } catch { /* Keep the edited form available for this session. */ }
      setItemForm(nextForm)
    }
    registerStockCardReturnUpdater(updateDraft)
    return () => registerStockCardReturnUpdater(null)
  }, [registerStockCardReturnUpdater, itemForm, editingNo, rows, stockMonth, weeklyRanges, sectionId, daysInMonth])
  const [dropdownOptions] = useState(getRegularDropdownOptions)
  const visibleRows = rows
    .filter((item) => item.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    .filter((item) => unitFilter === 'all' || item.unit === unitFilter)
    .sort((a, b) => sort === 'default' ? 0 : sort === 'az' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name))

  function beginAddItem() {
    setEditingNo(null)
    setItemForm(blankForm())
    setItemFormOpen(true)
  }

  function beginEditItem(item) {
    setEditingNo(item.no)
    const expiryDates = String(item.expiry || '').split('\n').filter(Boolean).map(expiryToInput)
    setItemForm({
      name: item.name || '', unit: item.unit || '',
      expiryDates: expiryDates.length ? expiryDates : [''],
      lotNumbers: String(item.lot || '').split('\n').filter(Boolean).length ? String(item.lot || '').split('\n').filter(Boolean) : [''], beginning: item.beginning ?? '',
      deliveries: item.deliveries?.length ? item.deliveries.map((delivery) => ({ date: dateToInput(delivery.date || ''), qty: delivery.qty ?? '', vendor: delivery.vendor || '' })) : [blankDelivery()],
      daily: { ...(item.daily || {}) }, stockCardEntries: item.stockCardEntries || [], ending: item.ending ?? '', monthly: item.monthly ?? '',
      weekly: weeklyRanges.map((_, index) => item.weekly?.[index] ?? 0),
    })
    setItemFormOpen(true)
  }

  function updateForm(key, value) {
    setItemForm((current) => ({ ...current, [key]: value }))
  }

  function updateLotNumber(index, value) {
    setItemForm((current) => ({ ...current, lotNumbers: current.lotNumbers.map((lot, rowIndex) => rowIndex === index ? value : lot) }))
  }

  function saveItem(event) {
    event.preventDefault()
    const beginning = Number(itemForm.beginning) || 0
    const deliveries = itemForm.deliveries
      .filter((delivery) => (delivery.qty !== '' && delivery.qty != null) || delivery.vendor.trim())
      .map((delivery) => ({ date: dateToStockValue(delivery.date), qty: Number(delivery.qty) || 0, vendor: delivery.vendor.trim() }))
    const daily = Object.fromEntries(Object.entries(itemForm.daily).map(([day, amount]) => [day, Number(amount) || 0]))
    const calculatedTotals = calculateInventoryTotals({ ...itemForm, beginning, deliveries, daily }, weeklyRanges, daysInMonth)
    const newItem = {
      no: editingNo ?? Math.max(0, ...rows.map((item) => Number(item.no) || 0)) + 1,
      name: itemForm.name.trim(), unit: itemForm.unit,
      expiry: itemForm.expiryDates.map((date) => expiryToStock(date)).filter(Boolean).join('\n'),
      lot: itemForm.lotNumbers.map((lot) => lot.trim()).filter(Boolean).join('\n'), beginning, deliveries, daily,
      stockCardEntries: reconcileStockCardEntries({ ...itemForm, beginning, deliveries, daily }, stockMonth),
      ending: calculatedTotals.ending,
      monthly: calculatedTotals.monthly,
      weekly: calculatedTotals.weekly,
    }
    setRows((current) => editingNo === null ? [...current, newItem] : current.map((item) => item.no === editingNo ? newItem : item))
    setSearch('')
    setUnitFilter('all')
    setSort('default')
    setItemFormOpen(false)
    setEditingNo(null)
  }

  function deleteItem() {
    const itemName = rows.find((item) => item.no === editingNo)?.name
    if (!window.confirm(`Delete ${itemName || 'this donation item'} from the sample list?`)) return
    const itemToDelete = rows.find((item) => item.no === editingNo)
    if (itemToDelete) deleteInventoryItem(sectionId, itemToDelete)
    setRows((current) => current.filter((item) => item.no !== editingNo))
    setItemFormOpen(false)
    setEditingNo(null)
  }

  function updateDelivery(index, key, value) {
    setItemForm((current) => ({ ...current, deliveries: current.deliveries.map((delivery, rowIndex) => rowIndex === index ? { ...delivery, [key]: value } : delivery) }))
  }

  return (
    <div className={`section-page-content ${pageClass}`}>
      <section className="dashboard-card regular-ledger-card" id={sectionId}>
        <div className="ledger-heading">
          <div><span className="ledger-kicker">E-STOCK / {pageLabel.toUpperCase()}</span><h2>{pageLabel} Inventory</h2><p>Monthly stock card · {monthLabel}</p></div>
          <div className="ledger-actions"><span className="sample-indicator"><i /> Sample data</span></div>
        </div>
        <div className="regular-inventory-actions"><span>Sample only · not saved to database</span><div className="regular-toolbar-actions"><div className="regular-period-control"><span>Date / year</span><MonthYearPicker value={stockMonth} onChange={onStockMonthChange} /></div><ExportEstockButton rows={rows} preparedBy={preparedBy} preparedByPosition={preparedByPosition} activeSheet={inventoryType} stockMonth={stockMonth} /><button className="regular-add-item-button" type="button" onClick={beginAddItem}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12" /></svg>Add item</button></div></div>
        <div className="regular-tools" role="search" aria-label={`Filter ${pageLabel} inventory items`}>
          <label className="regular-search"><span className="sr-only">Search Items</span><SearchIcon /><input type="search" placeholder="Search Items" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <label className="regular-select"><span>Unit of Measure</span><select value={unitFilter} onChange={(event) => setUnitFilter(event.target.value)}><option value="all">All units</option>{dropdownOptions.units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label>
          <div className="regular-sort"><span>Sort items</span><div><button type="button" className={sort === 'az' ? 'active' : ''} aria-pressed={sort === 'az'} onClick={() => setSort('az')}>A to Z</button><button type="button" className={sort === 'za' ? 'active' : ''} aria-pressed={sort === 'za'} onClick={() => setSort('za')}>Z to A</button></div></div>
        </div>
        <div className="ledger-hint"><span>↔</span> Swipe or scroll horizontally to view all stock-card columns</div>
        {visibleRows.length === 0 && <p className="regular-empty-results">No items match your search or filters.</p>}
        <MonthlyStockCard rows={visibleRows} periodLabels={weeklyRanges} stockMonth={stockMonth} monthLabel={monthLabel} onItemClick={beginEditItem} />
      </section>

      {itemFormOpen && <div className="regular-item-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setItemFormOpen(false); setEditingNo(null) } }}>
        <section className="regular-item-modal" role="dialog" aria-modal="true" aria-labelledby="donation-item-title">
          <div className="regular-item-modal-heading"><div><span className="ledger-kicker">E-STOCK / {pageLabel.toUpperCase()} · SAMPLE</span><h2 id="donation-item-title">{editingNo === null ? `Add ${pageLabel.toLowerCase()} item` : `Edit ${pageLabel.toLowerCase()} item`}</h2><p>This preview is not saved to the database.</p></div></div>
          <form className="regular-item-form" onSubmit={saveItem}>
            <label className="regular-item-name-field">Item name<input value={itemForm.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="Medicine or supply name" required autoFocus /></label>
            <label>Unit of measure<select value={itemForm.unit} onChange={(event) => updateForm('unit', event.target.value)}><option value="">Select a unit</option>{itemForm.unit && !dropdownOptions.units.includes(itemForm.unit) && <option value={itemForm.unit}>{itemForm.unit}</option>}{dropdownOptions.units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label>
            <label>Beginning balance<input type="number" min="0" step="1" value={itemForm.beginning} onChange={(event) => updateForm('beginning', event.target.value)} placeholder="0" /></label>
            <fieldset className="regular-lots-fieldset"><legend>Lot numbers</legend><div className="regular-lots-list">{itemForm.lotNumbers.map((lot, index) => <div className="regular-lot-fields" key={index}><label><span>{index === 0 ? 'Lot number' : `Lot number ${index + 1}`}</span><input value={lot} onChange={(event) => updateLotNumber(index, event.target.value)} placeholder="Lot number" /></label>{itemForm.lotNumbers.length > 1 && <button type="button" className="regular-remove-delivery" aria-label={`Remove lot number ${index + 1}`} onClick={() => setItemForm((current) => ({ ...current, lotNumbers: current.lotNumbers.filter((_, rowIndex) => rowIndex !== index) }))}>Remove</button>}</div>)}<button type="button" className="regular-add-delivery" onClick={() => setItemForm((current) => ({ ...current, lotNumbers: [...current.lotNumbers, ''] }))}>+ Add lot number</button></div></fieldset>
            <fieldset className="regular-expiries-fieldset"><legend>Expiry dates</legend><div className="regular-expiries-list">{itemForm.expiryDates.map((expiry, index) => <div className="regular-expiry-fields" key={index}><label><span>{index === 0 ? 'Expiry date' : `Expiry date ${index + 1}`}</span><input type="date" value={expiry} onChange={(event) => setItemForm((current) => ({ ...current, expiryDates: current.expiryDates.map((date, rowIndex) => rowIndex === index ? event.target.value : date) }))} /></label>{itemForm.expiryDates.length > 1 && <button type="button" className="regular-remove-delivery" onClick={() => setItemForm((current) => ({ ...current, expiryDates: current.expiryDates.filter((_, rowIndex) => rowIndex !== index) }))}>Remove</button>}</div>)}<button type="button" className="regular-add-delivery" onClick={() => setItemForm((current) => ({ ...current, expiryDates: [...current.expiryDates, ''] }))}>+ Add expiry date</button></div></fieldset>
            <fieldset className="regular-deliveries-fieldset"><legend>Deliveries</legend>{itemForm.deliveries.map((delivery, index) => <div className="regular-delivery-fields" key={index}><label>Delivery date<input type="date" value={delivery.date} onChange={(event) => updateDelivery(index, 'date', event.target.value)} /></label><label>Qty delivered<input type="number" min="0" step="1" value={delivery.qty} onChange={(event) => updateDelivery(index, 'qty', event.target.value)} placeholder="0" /></label><label>Supplier<input value={delivery.vendor} onChange={(event) => updateDelivery(index, 'vendor', event.target.value)} placeholder="Supplier name" /></label>{itemForm.deliveries.length > 1 && <button type="button" className="regular-remove-delivery" onClick={() => setItemForm((current) => ({ ...current, deliveries: current.deliveries.filter((_, rowIndex) => rowIndex !== index) }))}>Remove</button>}</div>)}<button type="button" className="regular-add-delivery" onClick={() => setItemForm((current) => ({ ...current, deliveries: [...current.deliveries, { ...blankDelivery(), date: todayDateInput() }] }))}>+ Add delivery</button></fieldset>
            <label>Ending balance<input type="number" value={calculatedTotals.ending} readOnly /></label>
            <label>Monthly consumption<input type="number" value={calculatedTotals.monthly} readOnly /></label>
            <fieldset className="regular-daily-fieldset"><legend>Daily consumption · days 1–{daysInMonth}</legend><div className="regular-daily-grid">{Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => <label key={day}><span>{day}</span><input aria-label={`Day ${day} consumption`} type="number" min="0" step="1" value={itemForm.daily[day] ?? ''} onChange={(event) => setItemForm((current) => ({ ...current, daily: { ...current.daily, [day]: event.target.value } }))} /></label>)}</div></fieldset>
            <fieldset className="regular-weekly-fieldset"><legend>Weekly consumption</legend><div>{weeklyRanges.map((range, index) => <label key={range}>{range}<input type="number" value={calculatedTotals.weekly[index]} readOnly /></label>)}</div></fieldset>
            <div className="regular-item-form-actions"><button type="button" className="regular-stockcards-button" onClick={() => { const saved = rows.find((item) => item.no === editingNo) || rows[0] || {}; const deliveries = itemForm.deliveries.filter((delivery) => (delivery.qty !== '' && delivery.qty != null) || delivery.vendor.trim()).map((delivery) => ({ date: delivery.date, qty: Number(delivery.qty) || 0, vendor: delivery.vendor.trim() })); const daily = Object.fromEntries(Object.entries(itemForm.daily).map(([day, amount]) => [day, Number(amount) || 0])); const selected = { ...saved, no: editingNo ?? saved.no, name: itemForm.name, unit: itemForm.unit, beginning: Number(itemForm.beginning) || 0, deliveries, daily, stockCardEntries: reconcileStockCardEntries({ ...itemForm, deliveries, daily }, stockMonth), ending: calculatedTotals.ending, monthly: calculatedTotals.monthly, weekly: calculatedTotals.weekly }; const updateDraft = (updated) => setItemForm((current) => ({ ...current, beginning: updated.beginning, deliveries: updated.deliveries.map((delivery) => ({ date: dateToInput(delivery.date), qty: delivery.qty, vendor: delivery.vendor })), daily: updated.daily, stockCardEntries: updated.stockCardEntries })); onOpenStockCard?.(selected, stockMonth, inventoryType, updateDraft) }}>Stock Cards</button>{editingNo !== null && <button type="button" className="regular-remove-delivery donation-delete-button" onClick={deleteItem}>Delete item</button>}<button type="button" className="regular-item-cancel" onClick={() => { setItemFormOpen(false); setEditingNo(null) }}>Cancel</button><button type="submit" className="regular-add-item-button">{editingNo === null ? 'Add sample item' : 'Save sample changes'}</button></div>
          </form>
        </section>
      </div>}
    </div>
  )
}

function SearchIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.7" cy="8.7" r="5.7" /><path d="m13 13 4 4" /></svg>
}
