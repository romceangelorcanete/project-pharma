import { useState } from 'react'
import MonthYearPicker from '../components/MonthYearPicker.jsx'
import MonthlyStockCard from '../components/MonthlyStockCard.jsx'
import './DonationInventory.css'
const sampleDonationRows = [
  { no: 1, name: 'Aciclovir 250mg vial', unit: 'vial', category: 'Donation', expiry: '', lot: '', beginning: 0, deliveries: [], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 2, name: 'Amikacin 125mg/ml vial', unit: 'vial', category: 'Donation', expiry: '', lot: '', beginning: 0, deliveries: [{ date: '9/4/2026', qty: 68, vendor: 'PGH' }], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 4, name: 'Amino Acid 7%', unit: 'bottle', category: 'Donation', expiry: '12/2026', lot: '2250117', beginning: 10, deliveries: [{ date: '10/14/2026', qty: 20, vendor: 'VMC' }], daily: { 1: 1, 3: 4, 4: 5 }, ending: 0, monthly: 10, weekly: [10, 0, 0, 0, 0] },
  { no: 5, name: '5% Amino Acids in 5% Sorbitol', unit: 'bottle', category: 'Donation', expiry: '', lot: '', beginning: 0, deliveries: [], daily: { 4: 1 }, ending: -1, monthly: 1, weekly: [1, 0, 0, 0, 0] },
  { no: 16, name: 'Azithromycin 500mg vial', unit: 'vial', category: 'Donation', expiry: '01/2027', lot: 'R45240151', beginning: 397, deliveries: [{ date: '7/16/2026', qty: 600, vendor: 'CONRADO' }], daily: { 1: 1, 4: 4 }, ending: 392, monthly: 5, weekly: [5, 0, 0, 0, 0] },
]
const donationWeeklyRanges = ['1-3', '4-10', '11-17', '18-24', '25-30']

export default function DonationInventory({ stockMonth, onStockMonthChange, monthLabel }) {
  const [search, setSearch] = useState('')
  const visibleRows = sampleDonationRows.filter((item) =>
    item.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  )

  return (
    <div className="section-page-content donation-inventory-page">
      <section className="dashboard-card regular-ledger-card" id="donation">
        <div className="ledger-heading">
          <div><span className="ledger-kicker">E-STOCK / DONATION</span><h2>Donation inventory</h2><p>Monthly stock card · {monthLabel}</p></div>
          <div className="ledger-actions"><span className="sample-indicator"><i /> Sample data</span><MonthYearPicker value={stockMonth} onChange={onStockMonthChange} /></div>
        </div>
        <div className="regular-tools donation-search-tools" role="search" aria-label="Search Donation inventory items">
          <label className="regular-search"><span className="sr-only">Search Items</span><SearchIcon /><input type="search" placeholder="Search Items" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        </div>
        <div className="ledger-hint"><span>↔</span> Swipe or scroll horizontally to view all stock-card columns</div>
        {visibleRows.length === 0 && <p className="regular-empty-results">No items match your search.</p>}
        <MonthlyStockCard rows={visibleRows} periodLabels={donationWeeklyRanges} monthLabel={monthLabel} />
      </section>
    </div>
  )
}

function SearchIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.7" cy="8.7" r="5.7" /><path d="m13 13 4 4" /></svg>
}
