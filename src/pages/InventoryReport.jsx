import { useMemo, useState } from 'react'
import MonthYearPicker from '../components/MonthYearPicker.jsx'
import ExportEstockButton from '../components/ExportEstockButton.jsx'
import { sampleRegularRows } from './RegularInventory.jsx'
import { sampleDonationRows } from './DonationInventory.jsx'
import { sampleMhmapRows } from './MhmapInventory.jsx'
import useInventoryRows from '../hooks/useInventoryRows.js'
import './InventoryReport.css'

const groupLabels = [
  { id: 'regular', title: 'Regular Stocks' },
  { id: 'donation', title: 'Donation' },
  { id: 'mhmap', title: 'Mental Health Medicines Access Program (MHMAP)' },
]
const weeklyLabels = {
  regular: ['1st week|1-7', '2nd week|8-14', '3rd week|15-21', '4th week|22-28', '5th week|29–31'],
  donation: ['1st week|1-7', '2nd week|8-14', '3rd week|15-21', '4th week|22-28', '5th week|29–31'],
  mhmap: ['1st week|1-7', '2nd week|8-14', '3rd week|15-21', '4th week|22-28', '5th week|29–31'],
}

function statusFor(item) {
  const balance = Number(item.ending ?? item.beginning ?? 0)
  if (balance <= 0) return 'Out of stock'
  if (balance <= 10) return 'Critical stock'
  return 'In stock'
}

function lines(value) {
  return String(value ?? '').split('\n').filter(Boolean)
}

function deliveryLines(item, field) {
  return (item.deliveries || []).map((delivery) => field === 'qty'
    ? [delivery.qty, delivery.vendor].filter(Boolean).join(' ')
    : delivery.date).filter(Boolean)
}

function ReportSection({ group, search }) {
  const rows = group.rows.filter((item) => item.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  const sectionWeeklyLabels = weeklyLabels[group.id] || weeklyLabels.regular
  return (
    <section className="inventory-report-section" aria-label={group.title}>
      <h3>{group.title}</h3>
      <div className="inventory-report-table-scroll" role="region" aria-label={`${group.title} inventory report table`} tabIndex="0">
        <table className="inventory-report-table">
          <thead>
            <tr><th className="ir-number">#</th><th className="ir-item">ITEM</th><th>EXPIRATION<br />DATE</th><th>LOT<br />NUMBER</th><th>DELIVERY<br />DATE</th><th>QTY<br />DELIVERED</th><th>BEGINNING<br />BALANCE</th><th>ENDING<br />BALANCE</th><th>MONTHLY<br />CONSUMPTION</th>{sectionWeeklyLabels.map((label) => <th key={label}>{label.split('|')[0]}<br />{label.split('|')[1]}</th>)}<th>STATUS</th><th>REMARKS</th></tr>
          </thead>
          <tbody>{rows.length ? rows.map((item) => {
            const status = statusFor(item)
            const dates = deliveryLines(item, 'date')
            const quantities = deliveryLines(item, 'qty')
            return <tr key={`${group.id}-${item.no}-${item.name}`}>
              <td>{item.no}</td><td className="ir-item-name">{item.name}</td><td>{lines(item.expiry).join('\n')}</td><td>{lines(item.lot).join('\n')}</td><td>{dates.join('\n')}</td><td>{quantities.join('\n')}</td><td>{item.beginning ?? 0}</td><td>{item.ending ?? item.beginning ?? 0}</td><td>{item.monthly ?? 0}</td>
              {(item.weekly || []).slice(0, 5).map((value, index) => <td key={index}>{value || ''}</td>)}
              <td><span className={`inventory-status inventory-status-${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</span></td><td>{item.remarks || ''}</td>
            </tr>
          }) : <tr><td className="inventory-report-empty" colSpan="16">No items match your search.</td></tr>}</tbody>
        </table>
      </div>
    </section>
  )
}

export default function InventoryReport({ stockMonth, onStockMonthChange, preparedBy, preparedByPosition }) {
  const [search, setSearch] = useState('')
  const [regularRows] = useInventoryRows('regular', sampleRegularRows, stockMonth)
  const [donationRows] = useInventoryRows('donation', sampleDonationRows, stockMonth)
  const [mhmapRows] = useInventoryRows('mhmap', sampleMhmapRows, stockMonth)
  const groups = useMemo(() => [
    { ...groupLabels[0], rows: regularRows },
    { ...groupLabels[1], rows: donationRows },
    { ...groupLabels[2], rows: mhmapRows },
  ], [regularRows, donationRows, mhmapRows])
  const [year, month] = stockMonth.split('-').map(Number)
  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' }).toUpperCase()
  const lastDay = new Date(year, month, 0).getDate()
  const reportTitle = `INVENTORY REPORT ${monthName} ${lastDay}, ${year} 11:59 PM`
  const totalItems = useMemo(() => groups.reduce((sum, group) => sum + group.rows.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase())).length, 0), [groups, search])

  return <div className="section-page-content inventory-report-page">
    <section className="dashboard-card inventory-report-card" aria-labelledby="inventory-report-title">
      <header className="inventory-report-heading">
        <div><span className="ledger-kicker">E-STOCK / INVENTORY</span><h2 id="inventory-report-title">Inventory Report</h2><p>Combined Regular Stocks, Donation, and MHMAP report</p></div>
        <div className="inventory-report-heading-actions"><span className="sample-indicator"><i /> Sample data</span><label className="inventory-report-period"><span>Date / year</span><MonthYearPicker value={stockMonth} onChange={onStockMonthChange} /></label></div>
      </header>
      <div className="inventory-report-toolbar"><p>Sample report <span>· {totalItems} items</span></p><ExportEstockButton activeSheet="inventory" stockMonth={stockMonth} regularRows={regularRows} donationRows={donationRows} mhmapRows={mhmapRows} preparedBy={preparedBy} preparedByPosition={preparedByPosition} /></div>
      <label className="inventory-report-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.8" cy="8.8" r="5.7"/><path d="m13 13 4 4"/></svg><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Items" aria-label="Search inventory items" /></label>
      <div className="inventory-report-print-title">{reportTitle}</div>
      <div className="inventory-report-sections">{groups.map((group) => <ReportSection key={group.id} group={group} search={search} />)}</div>
    </section>
  </div>
}
