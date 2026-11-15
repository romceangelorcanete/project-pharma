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
  return (
    <div className="section-page-content donation-inventory-page">
      <section className="dashboard-card regular-ledger-card" id="donation">
        <div className="ledger-heading">
          <div><span className="ledger-kicker">E-STOCK / DONATION</span><h2>Donation inventory</h2><p>Monthly stock card · {monthLabel}</p></div>
          <div className="ledger-actions"><span className="sample-indicator"><i /> Sample data</span><MonthYearPicker value={stockMonth} onChange={onStockMonthChange} /></div>
        </div>
        <div className="ledger-hint"><span>↔</span> Swipe or scroll horizontally to view all stock-card columns</div>
        <MonthlyStockCard rows={sampleDonationRows} periodLabels={donationWeeklyRanges} monthLabel={monthLabel} />
      </section>
    </div>
  )
}
