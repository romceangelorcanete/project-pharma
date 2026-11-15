import { useState } from 'react'
import MonthYearPicker from '../components/MonthYearPicker.jsx'
import MonthlyStockCard from '../components/MonthlyStockCard.jsx'
import './RegularInventory.css'
const sampleRegularRows = [
  { no: 1, name: '0.9 Sodium Chloride, 50ml vial', unit: 'vial', price: '₱44.55', dpri: '₱59.88', category: 'SMALL VIALS', other: 'NONE', expiry: '04/2031', lot: '260418', beginning: 734, deliveries: [{ date: '7/2/2026', qty: 300, vendor: 'EUROMED' }], daily: { 3: 8, 4: 1 }, ending: 725, monthly: 9, weekly: [9, 0, 0, 0, 0] },
  { no: 9, name: 'Acetylcysteine 600mg tablet', unit: 'tablet', price: '₱23.00', dpri: '₱36.36', category: 'COUGH SUPPRESSANTS', other: '', expiry: '03/2029', lot: '2603085\n0495', beginning: 1661, deliveries: [{ date: '10/14/2026', qty: 50, vendor: 'OAK' }, { date: '10/23/2026', qty: 100, vendor: 'ICS' }], daily: { 1: 63, 2: 38, 3: 34, 5: 36 }, ending: 1490, monthly: 171, weekly: [135, 36, 0, 0, 0] },
  { no: 14, name: 'Albendazole 400mg tablet', unit: 'tablet', price: '₱7.00', dpri: '₱8.00', category: 'ANTI-BIOTICS / MICROBIALS', other: '', expiry: '02/2028\n10/2027', lot: 'XT6C022\nXT5K007', beginning: 294, deliveries: [{ date: '4/28/2026', qty: 200, vendor: 'DYNA' }, { date: '5/5/2026', qty: 100, vendor: 'OAK' }], daily: {}, ending: 294, monthly: 0, weekly: [0, 0, 0, 0, 0] },
]


const weeklyRanges = ['1-7', '8-14', '15-21', '22-28', '29-30']

export default function RegularInventory({ stockMonth, onStockMonthChange }) {
  const [search, setSearch] = useState('')
  const [unitFilter, setUnitFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sort, setSort] = useState('default')
  const [year, monthNumber] = stockMonth.split('-').map(Number)
  const monthLabel = new Date(year, monthNumber - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const units = [...new Set(sampleRegularRows.map((item) => item.unit).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  const categories = [...new Set(sampleRegularRows.map((item) => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  const visibleRows = sampleRegularRows
    .filter((item) => item.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    .filter((item) => unitFilter === 'all' || item.unit === unitFilter)
    .filter((item) => categoryFilter === 'all' || item.category === categoryFilter)
    .sort((a, b) => sort === 'default' ? 0 : sort === 'az' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name))

  return (
    <div className="section-page-content">
      <section className="dashboard-card regular-ledger-card" id="regular">
        <div className="ledger-heading">
          <div><span className="ledger-kicker">E-STOCK / REGULAR</span><h2>Regular inventory</h2><p>Monthly stock card · {monthLabel}</p></div>
          <div className="ledger-actions"><span className="sample-indicator"><i /> Sample data</span><MonthYearPicker value={stockMonth} onChange={onStockMonthChange} /></div>
        </div>
        <div className="regular-tools" role="search" aria-label="Filter Regular inventory items">
          <label className="regular-search"><span className="sr-only">Search Items</span><SearchIcon /><input type="search" placeholder="Search Items" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <label className="regular-select"><span>Unit of Measure</span><select value={unitFilter} onChange={(event) => setUnitFilter(event.target.value)}><option value="all">All units</option>{units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label>
          <label className="regular-select"><span>Category</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">All categories</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
          <div className="regular-sort"><span>Sort items</span><div><button type="button" className={sort === 'az' ? 'active' : ''} aria-pressed={sort === 'az'} onClick={() => setSort('az')}>A to Z</button><button type="button" className={sort === 'za' ? 'active' : ''} aria-pressed={sort === 'za'} onClick={() => setSort('za')}>Z to A</button></div></div>
        </div>
        <div className="ledger-hint"><span>↔</span> Swipe or scroll horizontally to view all stock-card columns</div>
        {visibleRows.length === 0 && <p className="regular-empty-results">No items match your search or filters.</p>}
        <MonthlyStockCard rows={visibleRows} periodLabels={weeklyRanges} regular monthLabel={monthLabel} />
      </section>
    </div>
  )
}

function SearchIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.7" cy="8.7" r="5.7" /><path d="m13 13 4 4" /></svg>
}