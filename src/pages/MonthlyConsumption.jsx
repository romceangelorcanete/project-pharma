import { useMemo, useState } from 'react'
import ExportEstockButton from '../components/ExportEstockButton.jsx'
import { sampleRegularRows } from './RegularInventory.jsx'
import { sampleDonationRows } from './DonationInventory.jsx'
import { sampleMhmapRows } from './MhmapInventory.jsx'
import './MonthlyConsumption.css'

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const sections = [
  { id: 'regular', label: 'Regular Stocks', rows: sampleRegularRows, averageMonths: 9 },
  { id: 'donation', label: 'Donation', rows: sampleDonationRows, averageMonths: 8 },
  { id: 'mhmap', label: 'MHMAP', rows: sampleMhmapRows, averageMonths: 8 },
]

function numericPrice(value) {
  return Number(String(value ?? '').replace(/[^\d.-]/g, '')) || 0
}

export default function MonthlyConsumption({ stockMonth, onStockMonthChange }) {
  const [activeType, setActiveType] = useState('regular')
  const [search, setSearch] = useState('')
  const [year, monthNumber] = stockMonth.split('-').map(Number)
  const yearOptions = [...new Set([2026, 2027, 2028, 2029, 2030, year])].sort((left, right) => left - right)
  const hasSampleDataForYear = year === 2026
  const section = sections.find((item) => item.id === activeType) || sections[0]
  const visibleRows = useMemo(() => section.rows.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase())), [section, search])

  function changeYear(nextYear) {
    onStockMonthChange(`${nextYear}-${String(monthNumber).padStart(2, '0')}`)
  }

  return (
    <div className="section-page-content monthly-consumption-page">
      <section className="dashboard-card monthly-consumption-card" aria-labelledby="monthly-consumption-title">
        <header className="monthly-consumption-heading">
          <div><span className="ledger-kicker">E-STOCK / MONTHLY CONSUMPTION</span><h2 id="monthly-consumption-title">Monthly Consumption</h2><p>Annual consumption summary · {year}</p></div>
          <div className="monthly-consumption-year-control"><span className="sample-indicator"><i /> Sample data</span><label>Year<select value={year} onChange={(event) => changeYear(Number(event.target.value))}>{yearOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label></div>
        </header>

        <div className="monthly-consumption-toolbar">
          <div className="monthly-consumption-tabs" role="tablist" aria-label="Stock group">
            {sections.map((item) => <button key={item.id} type="button" role="tab" aria-selected={activeType === item.id} className={activeType === item.id ? 'active' : ''} onClick={() => setActiveType(item.id)}>{item.label}</button>)}
          </div>
          <div className="monthly-consumption-actions">
            <label className="monthly-consumption-search"><SearchIcon /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Items" aria-label="Search Items" /></label>
            <ExportEstockButton activeSheet="monthly" stockMonth={stockMonth} consumptionYear={2026} />
          </div>
        </div>

        <div className="monthly-consumption-table-scroll" role="region" aria-label={`${section.label} monthly consumption table`} tabIndex="0">
          <table className="monthly-consumption-table">
            <thead><tr><th className="monthly-consumption-number">#</th><th className="monthly-consumption-item">ITEMS</th>{monthNames.map((month) => <th key={month}>{month.slice(0, 3).toUpperCase()}</th>)}<th>DPRI<br />HIGHEST</th><th>TOTAL<br />PRICE</th><th>TOTAL<br />CONSUMPTION</th><th>AVERAGE MONTHLY<br />CONSUMPTION</th></tr></thead>
            <tbody>{visibleRows.map((item) => {
              const consumption = hasSampleDataForYear ? Number(item.monthly) || 0 : 0
              const dpri = numericPrice(item.dpri)
              const monthlyValues = monthNames.map((_, index) => index === monthNumber - 1 ? consumption : 0)
              const totalConsumption = monthlyValues.reduce((total, value) => total + value, 0)
              return <tr key={item.no}><td>{item.no}</td><td className="monthly-consumption-item-name">{item.name}</td>{monthlyValues.map((value, index) => <td key={monthNames[index]}>{hasSampleDataForYear && value ? value : ''}</td>)}<td>{dpri && hasSampleDataForYear ? dpri.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td><td>{hasSampleDataForYear ? (totalConsumption * dpri).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td><td>{hasSampleDataForYear ? totalConsumption : ''}</td><td>{hasSampleDataForYear ? (totalConsumption / section.averageMonths).toFixed(2) : ''}</td></tr>
            })}</tbody>
          </table>
          {!hasSampleDataForYear && <p className="monthly-consumption-empty">No sample consumption data for {year} yet.</p>}
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
