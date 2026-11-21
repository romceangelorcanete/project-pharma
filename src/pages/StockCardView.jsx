import { useEffect, useState } from 'react'
import './StockCardView.css'

function toISODate(value = '') {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (match) return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`
  return ''
}

function displayDate(value) {
  const iso = toISODate(value)
  if (!iso) return ''
  const [year, month, day] = iso.split('-')
  return `${Number(month)}/${Number(day)}/${year}`
}

function todayISO() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

function getInitialRows(item, stockMonth) {
  const [year, month] = stockMonth.split('-').map(Number)
  const rows = item.stockCardEntries?.length
    ? item.stockCardEntries.map((row) => ({ ...row, date: toISODate(row.date) }))
    : [
      ...(item.deliveries || []).map((delivery) => ({ date: toISODate(delivery.date), reference: delivery.vendor || '', receipt: Number(delivery.qty) || 0, issue: 0, office: '', days: '' })),
      ...Object.entries(item.daily || {}).filter(([day, qty]) => day !== 'return' && Number(qty) > 0).map(([day, qty]) => ({ date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, reference: '', receipt: 0, issue: Number(qty) || 0, office: '', days: '' })),
    ].sort((left, right) => left.date.localeCompare(right.date))

  return [...rows, ...Array.from({ length: Math.max(0, 20 - rows.length) }, () => ({ date: '', reference: '', receipt: '', issue: '', office: '', days: '' }))]
}

function hasEntry(row) {
  return Boolean(row.reference || row.office || row.days || row.receipt !== '' && Number(row.receipt) !== 0 || row.issue !== '' && Number(row.issue) !== 0)
}

export default function StockCardView({ item, stockMonth, returnSection, onBack, backLabel = 'Back to inventory', preparedBy = '', preparedByPosition = '' }) {
  const [year, month] = stockMonth.split('-').map(Number)
  const draftStorageKey = `pharma-stock-card-draft:${returnSection}:${item.no}:${stockMonth}`
  const [savedCardDraft] = useState(() => {
    try {
      const draft = JSON.parse(window.sessionStorage.getItem(draftStorageKey) || 'null')
      return draft?.itemName === item.name ? draft : null
    } catch { return null }
  })
  const [rows, setRows] = useState(() => savedCardDraft?.rows || getInitialRows(item, stockMonth))
  const [beginningBalance, setBeginningBalance] = useState(() => Number(savedCardDraft?.beginningBalance ?? item.beginning) || 0)
  let balance = beginningBalance
  const sheetRows = rows.map((row) => {
    if (hasEntry(row)) balance += (Number(row.receipt) || 0) - (Number(row.issue) || 0)
    return { ...row, balance: hasEntry(row) ? balance : '' }
  })

  useEffect(() => {
    try {
      window.sessionStorage.setItem(draftStorageKey, JSON.stringify({ itemName: item.name, rows, beginningBalance }))
    } catch { /* Keep the stock card usable when browser storage is unavailable. */ }
  }, [draftStorageKey, item.name, rows, beginningBalance])

  function updateCell(index, key, value) {
    setRows((current) => {
      const next = current.map((row, rowIndex) => rowIndex === index ? {
        ...row,
        date: row.date || value !== '' ? row.date || todayISO() : '',
        [key]: value,
      } : row)
      if (index === next.length - 1 && hasEntry(next[index])) next.push({ date: '', reference: '', receipt: '', issue: '', office: '', days: '' })
      return next
    })
  }

  function returnToInventory() {
    const entries = rows.filter((row) => hasEntry(row)).map((row) => ({ ...row, date: row.date || todayISO() }))
    const deliveries = entries.filter((row) => Number(row.receipt) > 0 || row.reference && Number(row.issue) === 0).map((row) => ({ date: row.date, qty: Number(row.receipt) || 0, vendor: row.reference || '' }))
    const daily = entries.reduce((result, row) => {
      if (Number(row.issue) > 0) {
        const day = Number(row.date.slice(8, 10))
        if (day) result[day] = (Number(result[day]) || 0) + Number(row.issue)
      }
      return result
    }, {})
    try { window.sessionStorage.removeItem(draftStorageKey) } catch { /* Ignore unavailable browser storage. */ }
    onBack({ ...item, beginning: beginningBalance, deliveries, daily, stockCardEntries: entries })
  }

  return (
    <div className="section-page-content stock-card-page">
      <div className="stock-card-view-actions"><button className="stock-card-back-button" type="button" onClick={returnToInventory}>← {backLabel}</button><button className="stock-card-print-button" type="button" onClick={() => window.print()}>Print card</button></div>
      <section className="dashboard-card stock-card-sheet" aria-label="Editable stock card">
        <div className="stock-card-sheet-heading">
          <div className="stock-card-main-title">STOCK CARD</div>
          <div className="stock-card-stock-no"><span>Stock No.:</span><strong>{item.no}</strong></div>
          <div className="stock-card-item-name">Item {item.no} {item.name}</div>
          <div className="stock-card-description"><span>Description:</span><strong>{item.category || item.other || ''}</strong></div>
          <div className="stock-card-reorder"><span>Re-order Point</span><strong>—</strong></div>
          <div className="stock-card-unit-measure"><span>Unit of Measurement:</span><strong>{item.unit || ''}</strong></div>
        </div>
        <div className="stock-card-table-scroll">
          <table className="stock-card-table">
            <colgroup><col className="stock-card-col-date" /><col className="stock-card-col-reference" /><col className="stock-card-col-receipt" /><col className="stock-card-col-issue" /><col className="stock-card-col-office" /><col className="stock-card-col-balance" /><col className="stock-card-col-days" /></colgroup>
            <thead>
              <tr className="stock-card-groups"><th rowSpan="2">Date</th><th rowSpan="2">Reference</th><th colSpan="1">Receipt</th><th colSpan="2">Issuance</th><th colSpan="1">Balance</th><th rowSpan="2">No. of Days to Consume</th></tr>
              <tr><th>Qty.</th><th>Qty.</th><th>Office</th><th>Qty.</th></tr>
            </thead>
            <tbody>
              <tr className="stock-card-opening-row"><td></td><td>Beginning balance</td><td></td><td></td><td></td><td><input aria-label="Beginning balance" type="number" min="0" value={beginningBalance} onChange={(event) => setBeginningBalance(Number(event.target.value) || 0)} /></td><td></td></tr>
              {sheetRows.map((row, index) => <tr key={index}>
                <td>{displayDate(row.date)}</td>
                <td><input aria-label={`Row ${index + 1} reference`} value={row.reference ?? ''} onChange={(event) => updateCell(index, 'reference', event.target.value)} /></td>
                <td><input aria-label={`Row ${index + 1} receipt quantity`} type="number" min="0" value={row.receipt ?? ''} onChange={(event) => updateCell(index, 'receipt', event.target.value)} /></td>
                <td><input aria-label={`Row ${index + 1} issuance quantity`} type="number" min="0" value={row.issue ?? ''} onChange={(event) => updateCell(index, 'issue', event.target.value)} /></td>
                <td><input aria-label={`Row ${index + 1} office`} value={row.office ?? ''} onChange={(event) => updateCell(index, 'office', event.target.value)} /></td>
                <td>{row.balance}</td>
                <td><input aria-label={`Row ${index + 1} days to consume`} value={row.days ?? ''} onChange={(event) => updateCell(index, 'days', event.target.value)} /></td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <footer className="stock-card-sheet-footer"><span>{item.name}</span><span>{new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span><span className="stock-card-prepared-by">Prepared by: <strong>{preparedBy}</strong>{preparedByPosition && <b>{preparedByPosition}</b>}</span></footer>
      </section>
    </div>
  )
}
