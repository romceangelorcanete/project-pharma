import { useState } from 'react'
import MonthYearPicker from '../components/MonthYearPicker.jsx'
import { sampleRegularRows } from './RegularInventory.jsx'
import { sampleDonationRows } from './DonationInventory.jsx'
import useInventoryRows from '../hooks/useInventoryRows.js'
import './RPCIReport.css'

function amount(value) {
  const parsed = Number(String(value ?? '').replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) && parsed ? `₱${parsed.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''
}

function deliveryDates(item) {
  return (item.deliveries || []).map((delivery) => delivery.date).filter(Boolean).join('\n')
}

function deliveryQuantities(item) {
  return (item.deliveries || []).map((delivery) => [delivery.qty, delivery.vendor].filter(Boolean).join(' ')).filter(Boolean).join('\n')
}

export default function RPCIReport({ reportType, stockMonth, onStockMonthChange }) {
  const isDonation = reportType === 'donation'
  const section = isDonation ? 'donation' : 'regular'
  const fallbackRows = isDonation ? sampleDonationRows : sampleRegularRows
  const [rows] = useInventoryRows(section, fallbackRows, stockMonth)
  const [preparedBy, setPreparedBy] = useState('Juliennevi J. Bautista, RPh')
  const [preparedByPosition, setPreparedByPosition] = useState('Pharmacist I')
  const [notedBy, setNotedBy] = useState('Jeremie V. Villanueva-San Juan, RPh')
  const [notedByPosition, setNotedByPosition] = useState('PHARMACIST III')
  const [year, month] = stockMonth.split('-').map(Number)
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const stockLabel = isDonation ? 'DONATION STOCK' : 'REGULAR STOCK'

  return <div className="section-page-content rpci-page">
    <section className="dashboard-card rpci-card" aria-label={`${stockLabel} physical count report`}>
      <div className="rpci-toolbar"><div><span className="ledger-kicker">E-STOCK / {isDonation ? 'RPCI DONATION' : 'RPCI REGULAR'}</span><p>Print preview · Sample data</p></div><div className="rpci-toolbar-actions"><label><span>Date / year</span><MonthYearPicker value={stockMonth} onChange={onStockMonthChange} /></label><button className="rpci-print-button" type="button" onClick={() => window.print()}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 7V3h10v4M5 14H3V8h14v6h-2M5 11h10v6H5z" /></svg>Print</button></div></div>
      <article className="rpci-sheet">
        <div className="rpci-appendix">Appendix 66</div>
        <h1>REPORT ON THE PHYSICAL COUNT OF INVENTORIES</h1>
        <h2>({stockLabel})</h2>
        <p className="rpci-as-of">As of {monthLabel}</p>
        <div className="rpci-fund">Fund Cluster: <span /></div>
        <p className="rpci-accountability">For which <span />, <span />, <span /> is accountable, having assumed such accountability on <span />.</p>
        <div className="rpci-table-wrap">
          <table className="rpci-table">
            <thead>
              <tr><th rowSpan="2">Article</th><th rowSpan="2" className="rpci-description">Description</th><th rowSpan="2">Stock<br />Number</th><th rowSpan="2">Unit of<br />Measure</th><th rowSpan="2">Unit<br />Value</th><th>Balance Per Card</th><th>On Hand Per<br />Count</th><th colSpan="2">Shortage/Overage</th><th colSpan="2">Remarks</th></tr>
              <tr><th>(Quantity)</th><th>(Quantity)</th><th>Quantity</th><th>Value</th><th>Delivery Date</th><th>Quantity<br />Delivered</th></tr>
            </thead>
            <tbody>{rows.map((item, index) => <tr key={`${item.no}-${item.name}`}>
              <td>{index + 1}</td><td className="rpci-item-name">{item.name}</td><td>{item.stockNumber || ''}</td><td>{item.unit || ''}</td><td>{amount(item.price)}</td><td>{Number(item.ending ?? item.beginning) || 0}</td><td className="rpci-write-cell"></td><td className="rpci-write-cell"></td><td className="rpci-write-cell"></td><td className="rpci-remarks">{deliveryDates(item)}</td><td className="rpci-remarks">{deliveryQuantities(item)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="rpci-signatures"><div><span>Prepared by:</span><input className="rpci-signature-input rpci-signature-name" aria-label="Prepared by name" placeholder="Name, RPh" value={preparedBy} onChange={(event) => setPreparedBy(event.target.value)} /><input className="rpci-signature-input" aria-label="Prepared by position" value={preparedByPosition} onChange={(event) => setPreparedByPosition(event.target.value)} /></div><div><span>Noted by:</span><input className="rpci-signature-input rpci-signature-name" aria-label="Noted by name" value={notedBy} onChange={(event) => setNotedBy(event.target.value)} /><input className="rpci-signature-input" aria-label="Noted by position" value={notedByPosition} onChange={(event) => setNotedByPosition(event.target.value)} /></div></div>
      </article>
    </section>
  </div>
}
