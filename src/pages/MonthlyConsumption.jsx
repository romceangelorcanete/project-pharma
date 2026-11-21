import { useEffect, useMemo, useRef, useState } from 'react'
import ExportEstockButton from '../components/ExportEstockButton.jsx'
import { sampleRegularRows } from './RegularInventory.jsx'
import { sampleDonationRows } from './DonationInventory.jsx'
import { sampleMhmapRows } from './MhmapInventory.jsx'
import useInventoryRows from '../hooks/useInventoryRows.js'
import './MonthlyConsumption.css'

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const sections = [
  { id: 'regular', label: 'Regular Stocks', averageMonths: 9 },
  { id: 'donation', label: 'Donation', averageMonths: 8 },
  { id: 'mhmap', label: 'MHMAP', averageMonths: 8 },
]

function numericPrice(value) {
  return Number(String(value ?? '').replace(/[^\d.-]/g, '')) || 0
}

const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export default function MonthlyConsumption({ stockMonth, onStockMonthChange, preparedBy, preparedByPosition }) {
  const [activeType, setActiveType] = useState('regular')
  const [search, setSearch] = useState('')
  const [yearPickerOpen, setYearPickerOpen] = useState(false)
  const yearPickerRef = useRef(null)
  const selectedYearRef = useRef(null)
  const [regularRows] = useInventoryRows('regular', sampleRegularRows, stockMonth)
  const [donationRows] = useInventoryRows('donation', sampleDonationRows, stockMonth)
  const [mhmapRows] = useInventoryRows('mhmap', sampleMhmapRows, stockMonth)
  const sectionRows = { regular: regularRows, donation: donationRows, mhmap: mhmapRows }
  const [year, monthNumber] = stockMonth.split('-').map(Number)
  const firstYear = Math.min(2026, year)
  const lastYear = Math.max(2100, year)
  const yearOptions = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index)
  const selectedSection = sections.find((item) => item.id === activeType) || sections[0]
  const section = { ...selectedSection, rows: sectionRows[selectedSection.id] }
  const visibleRows = useMemo(() => section.rows.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase())), [section, search])

  function changeYear(nextYear) {
    onStockMonthChange(`${nextYear}-${String(monthNumber).padStart(2, '0')}`)
    setYearPickerOpen(false)
  }

  useEffect(() => {
    if (!yearPickerOpen) return undefined
    selectedYearRef.current?.scrollIntoView({ block: 'nearest' })
    const closeOnOutsideClick = (event) => {
      if (!yearPickerRef.current?.contains(event.target)) setYearPickerOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setYearPickerOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [yearPickerOpen])

  return (
    <div className="section-page-content monthly-consumption-page">
      <section className="dashboard-card monthly-consumption-card" aria-labelledby="monthly-consumption-title">
        <header className="monthly-consumption-heading">
          <div><span className="ledger-kicker">E-STOCK / MONTHLY CONSUMPTION</span><h2 id="monthly-consumption-title">Monthly Consumption</h2><p>Annual consumption summary · {year}</p></div>
          <span className="sample-indicator"><i /> Sample data</span>
        </header>

        <div className="monthly-consumption-toolbar">
          <div className="monthly-consumption-tabs" role="tablist" aria-label="Stock group">
            {sections.map((item) => <button key={item.id} type="button" role="tab" aria-selected={activeType === item.id} className={activeType === item.id ? 'active' : ''} onClick={() => setActiveType(item.id)}>{item.label}</button>)}
          </div>
          <div className="monthly-consumption-actions">
            <div className="monthly-consumption-year-control" ref={yearPickerRef}>
              <button className="monthly-consumption-year-trigger" type="button" aria-haspopup="listbox" aria-expanded={yearPickerOpen} onClick={() => setYearPickerOpen((open) => !open)}>
                {year}<svg viewBox="0 0 12 12" aria-hidden="true"><path d="m2.5 4.5 3.5 3 3.5-3" /></svg>
              </button>
              {yearPickerOpen && <div className="monthly-consumption-year-options" role="listbox" aria-label="Select year">
                <div className="monthly-consumption-year-options-heading">YEAR</div>
                {yearOptions.map((option) => <button key={option} ref={option === year ? selectedYearRef : null} type="button" role="option" aria-selected={option === year} className={option === year ? 'selected' : ''} onClick={() => changeYear(option)}>{option}</button>)}
              </div>}
            </div>
            <label className="monthly-consumption-search"><SearchIcon /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Items" aria-label="Search Items" /></label>
            <ExportEstockButton activeSheet="monthly" stockMonth={stockMonth} consumptionYear={year} regularRows={regularRows} donationRows={donationRows} mhmapRows={mhmapRows} preparedBy={preparedBy} preparedByPosition={preparedByPosition} />
          </div>
        </div>

        <div className="monthly-consumption-table-scroll" role="region" aria-label={`${section.label} monthly consumption table`} tabIndex="0">
          <table className="monthly-consumption-table">
            <thead><tr><th className="monthly-consumption-number">#</th><th className="monthly-consumption-item">ITEMS</th>{monthNames.map((month) => <th key={month}>{month.slice(0, 3).toUpperCase()}</th>)}<th>DPRI<br />HIGHEST</th><th>TOTAL<br />PRICE</th><th>TOTAL<br />CONSUMPTION</th><th>AVERAGE MONTHLY<br />CONSUMPTION</th></tr></thead>
            <tbody>{visibleRows.map((item) => {
              const consumption = Number(item.monthly) || 0
              const dpri = numericPrice(item.dpri)
              const monthlyValues = monthNames.map((_, index) => index === monthNumber - 1 ? consumption : 0)
              const totalConsumption = monthlyValues.reduce((total, value) => total + value, 0)
              const averageConsumption = Math.round(totalConsumption / section.averageMonths)
              return <tr key={item.no}><td>{item.no}</td><td className="monthly-consumption-item-name">{item.name}</td>{monthlyValues.map((value, index) => <td key={monthNames[index]}>{value || ''}</td>)}<td>{dpri ? pesoFormatter.format(dpri) : ''}</td><td>{pesoFormatter.format(totalConsumption * dpri)}</td><td>{totalConsumption}</td><td>{averageConsumption}</td></tr>
            })}</tbody>
          </table>
          {visibleRows.length === 0 && <p className="monthly-consumption-empty">No items match your search.</p>}
        </div>
        <footer className="monthly-consumption-footer"><span>{section.label}</span><span>{visibleRows.length} items · {year}</span></footer>
      </section>
    </div>
  )
}

function SearchIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.7" cy="8.7" r="5.7" /><path d="m13 13 4 4" /></svg>
}
