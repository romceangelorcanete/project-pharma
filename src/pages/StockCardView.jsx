import './StockCardView.css'

function displayDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
}

export default function StockCardView({ item, stockMonth, onBack, backLabel = 'Back to Regular inventory' }) {
  const [year, month] = stockMonth.split('-').map(Number)
  const movements = [
    ...(item.deliveries || []).map((delivery) => ({ date: delivery.date, reference: delivery.vendor, receipt: Number(delivery.qty) || 0, issue: 0 })),
    ...Object.entries(item.daily || {}).filter(([day, qty]) => day !== 'return' && Number(qty) > 0).map(([day, qty]) => ({ date: `${month}/${day}/${year}`, reference: '', receipt: 0, issue: Number(qty) || 0 })),
  ].sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())

  let balance = Number(item.beginning) || 0
  const ledgerRows = movements.length ? movements.map((movement) => {
    balance += movement.receipt - movement.issue
    return { ...movement, balance }
  }) : [{ date: '', reference: 'Beginning balance', receipt: '', issue: '', balance, office: '', days: '' }]
  const sheetRows = [
    ...ledgerRows,
    ...Array.from({ length: Math.max(0, 20 - ledgerRows.length) }, () => ({ date: '', reference: '', receipt: '', issue: '', office: '', balance: '', days: '' })),
  ]

  return (
    <div className="section-page-content stock-card-page">
      <section className="dashboard-card stock-card-sheet" aria-label="Stock card">
        <div className="stock-card-sheet-heading">
          <div className="stock-card-main-title">STOCK CARD</div>
          <div className="stock-card-stock-no"><span>Stock No.:</span><strong>{item.no}</strong></div>
          <div className="stock-card-item-name">Item {item.no} {item.name}</div>
          <div className="stock-card-description"><span>Description:</span><strong>{[item.unit, item.category].filter(Boolean).join(' · ')}</strong></div>
          <div className="stock-card-reorder"><span>Re-order Point</span><strong>—</strong></div>
        </div>
        <div className="stock-card-table-scroll">
          <table className="stock-card-table">
            <colgroup><col className="stock-card-col-date" /><col className="stock-card-col-reference" /><col className="stock-card-col-receipt" /><col className="stock-card-col-issue" /><col className="stock-card-col-office" /><col className="stock-card-col-balance" /><col className="stock-card-col-days" /></colgroup>
            <thead>
              <tr className="stock-card-groups"><th rowSpan="2">Date</th><th rowSpan="2">Reference</th><th colSpan="1">Receipt</th><th colSpan="2">Issuance</th><th colSpan="1">Balance</th><th rowSpan="2">No. of Days to Consume</th></tr>
              <tr><th>Qty.</th><th>Qty.</th><th>Office</th><th>Qty.</th></tr>
            </thead>
            <tbody>
              {sheetRows.map((row, index) => <tr key={`${row.date}-${index}`}><td>{displayDate(row.date)}</td><td>{row.reference || ''}</td><td>{row.receipt}</td><td>{row.issue}</td><td>{row.office || ''}</td><td>{row.balance}</td><td>{row.days || ''}</td></tr>)}
            </tbody>
          </table>
        </div>
        <footer className="stock-card-sheet-footer"><span>{item.name}</span><span>{new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span></footer>
      </section>
      <div className="stock-card-view-actions"><button className="stock-card-back-button" type="button" onClick={onBack}>← {backLabel}</button><button className="stock-card-print-button" type="button" onClick={() => window.print()}>Print card</button></div>
    </div>
  )
}
