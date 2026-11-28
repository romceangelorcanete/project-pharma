import { Fragment, useEffect, useMemo, useState } from 'react'
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

function isDateInStockMonth(value, stockMonth) {
  const iso = toISODate(value)
  return iso ? iso.slice(0, 7) === stockMonth : false
}

function getSavedHistory(item, section, stockMonth) {
  if (typeof window === 'undefined' || !section) return []
  const prefix = `pharma-sample-inventory:${section}:`
  const periods = []
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (!key?.startsWith(prefix)) continue
    const period = key.slice(prefix.length)
    if (!/^\d{4}-\d{2}$/.test(period) || period >= stockMonth) continue
    try {
      const rows = JSON.parse(window.localStorage.getItem(key) || 'null')
      const savedItem = Array.isArray(rows) && rows.find((row) => String(row.no) === String(item.no) && String(row.name || '').trim().toLowerCase() === String(item.name || '').trim().toLowerCase())
      if (!savedItem) continue
      const entries = Array.isArray(savedItem.stockCardEntries) && savedItem.stockCardEntries.length
        ? savedItem.stockCardEntries.filter((entry) => isDateInStockMonth(entry.date, period))
        : [
          ...(savedItem.deliveries || []).filter((delivery) => isDateInStockMonth(delivery.date, period)).map((delivery) => ({ date: toISODate(delivery.date), reference: delivery.vendor || '', receipt: Number(delivery.qty) || 0, issue: 0, office: '', days: '' })),
          ...Object.entries(savedItem.daily || {}).filter(([day, qty]) => day !== 'return' && Number(qty) > 0).map(([day, qty]) => ({ date: `${period}-${String(day).padStart(2, '0')}`, reference: '', receipt: 0, issue: Number(qty) || 0, office: '', days: '' })),
        ]
      periods.push({ period, beginning: Number(savedItem.beginning) || 0, entries: entries.map((entry) => ({ ...entry, date: toISODate(entry.date) })).sort((left, right) => left.date.localeCompare(right.date)) })
    } catch { /* Ignore malformed saved periods and keep the card usable. */ }
  }
  const savedByPeriod = new Map(periods.map((period) => [period.period, period]))
  const sortedPeriods = [...savedByPeriod.keys()].sort()
  if (!sortedPeriods.length) return []

  const history = []
  let cursor = sortedPeriods[0]
  let carriedBalance = 0
  while (cursor < stockMonth) {
    const saved = savedByPeriod.get(cursor)
    const beginning = saved ? saved.beginning : carriedBalance
    const entries = saved?.entries || []
    history.push({ period: cursor, beginning, entries })
    carriedBalance = entries.reduce((balance, entry) => balance + (Number(entry.receipt) || 0) - (Number(entry.issue) || 0), beginning)
    const [year, month] = cursor.split('-').map(Number)
    const next = new Date(year, month, 1)
    cursor = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
  }
  return history
}

function openingDateForPeriod(period) {
  const [year, month] = period.split('-').map(Number)
  const day = Math.min(new Date().getDate(), new Date(year, month, 0).getDate())
  return `${period}-${String(day).padStart(2, '0')}`
}

function todayISO(stockMonth, useSelectedMonth = false) {
  const today = new Date()
  const [selectedYear, selectedMonth] = stockMonth.split('-').map(Number)
  const year = useSelectedMonth ? selectedYear : today.getFullYear()
  const month = useSelectedMonth ? selectedMonth : today.getMonth() + 1
  const day = Math.min(today.getDate(), new Date(year, month, 0).getDate())
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getInitialRows(item, stockMonth) {
  const [year, month] = stockMonth.split('-').map(Number)
  const rows = item.stockCardEntries?.length
    ? item.stockCardEntries
      .filter((row) => isDateInStockMonth(row.date, stockMonth))
      .map((row) => ({ ...row, date: toISODate(row.date) }))
      .sort((left, right) => left.date.localeCompare(right.date))
    : [
      ...(item.deliveries || []).filter((delivery) => isDateInStockMonth(delivery.date, stockMonth)).map((delivery) => ({ date: toISODate(delivery.date), reference: delivery.vendor || '', receipt: Number(delivery.qty) || 0, issue: 0, office: '', days: '' })),
      ...Object.entries(item.daily || {}).filter(([day, qty]) => day !== 'return' && Number(qty) > 0).map(([day, qty]) => ({ date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, reference: '', receipt: 0, issue: Number(qty) || 0, office: '', days: '' })),
    ].sort((left, right) => left.date.localeCompare(right.date))

  return [...rows, ...Array.from({ length: Math.max(0, 20 - rows.length) }, () => ({ date: '', reference: '', receipt: '', issue: '', office: '', days: '' }))]
}

function hasEntry(row) {
  return Boolean(row.reference || row.office || row.days || row.receipt !== '' && Number(row.receipt) !== 0 || row.issue !== '' && Number(row.issue) !== 0)
}

export default function StockCardView({ item, stockMonth, returnSection, onBack, registerStockCardActions, backLabel = 'Back to inventory', preparedBy = '', preparedByPosition = '' }) {
  const [year, month] = stockMonth.split('-').map(Number)
  const useSelectedMonth = ['regular', 'donation', 'mhmap'].includes(returnSection)
  const draftStorageKey = `pharma-stock-card-draft:${returnSection}:${item.no}:${stockMonth}`
  const [savedCardDraft] = useState(() => {
    try {
      const draft = JSON.parse(window.sessionStorage.getItem(draftStorageKey) || 'null')
      return draft?.itemName === item.name ? draft : null
    } catch { return null }
  })
  const [rows, setRows] = useState(() => savedCardDraft?.rows || getInitialRows(item, stockMonth))
  const [beginningBalance, setBeginningBalance] = useState(() => Number(savedCardDraft?.beginningBalance ?? item.beginning) || 0)
  const historicalPeriods = useMemo(() => getSavedHistory(item, returnSection, stockMonth), [item, returnSection, stockMonth])
  const [isDirty, setIsDirty] = useState(() => Boolean(savedCardDraft?.isDirty))
  const sheetRows = useMemo(() => rows.reduce((result, row) => {
    const hasTransaction = hasEntry(row)
    const previousBalance = result.balance
    const balance = hasTransaction
      ? previousBalance + (Number(row.receipt) || 0) - (Number(row.issue) || 0)
      : previousBalance
    result.rows.push({ ...row, balance: hasTransaction ? balance : '' })
    return { balance, rows: result.rows }
  }, { balance: beginningBalance, rows: [] }).rows, [beginningBalance, rows])

  useEffect(() => {
    try {
      if (isDirty) window.sessionStorage.setItem(draftStorageKey, JSON.stringify({ itemName: item.name, rows, beginningBalance, isDirty }))
      else window.sessionStorage.removeItem(draftStorageKey)
    } catch { /* Keep the stock card usable when browser storage is unavailable. */ }
  }, [draftStorageKey, item.name, rows, beginningBalance, isDirty])

  function getUpdatedItem() {
    const entries = rows.filter((row) => hasEntry(row))
      .map((row) => ({ ...row, date: row.date || todayISO(stockMonth, useSelectedMonth) }))
      .sort((left, right) => toISODate(left.date).localeCompare(toISODate(right.date)))
    const deliveries = entries.filter((row) => Number(row.receipt) > 0 || row.reference && Number(row.issue) === 0).map((row) => ({ date: row.date, qty: Number(row.receipt) || 0, vendor: row.reference || '' }))
    const daily = entries.reduce((result, row) => {
      if (Number(row.issue) > 0) {
        const day = Number(row.date.slice(8, 10))
        if (day) result[day] = (Number(result[day]) || 0) + Number(row.issue)
      }
      return result
    }, {})
    return { ...item, beginning: beginningBalance, deliveries, daily, stockCardEntries: entries }
  }

  function clearDraft() {
    try { window.sessionStorage.removeItem(draftStorageKey) } catch { /* Ignore unavailable storage. */ }
    setIsDirty(false)
  }

  useEffect(() => {
    if (!registerStockCardActions) return undefined
    registerStockCardActions({ isDirty, getUpdatedItem, clearDraft })
    return () => registerStockCardActions(null)
  }, [registerStockCardActions, isDirty, rows, beginningBalance])

  function updateCell(index, key, value) {
    setIsDirty(true)
    setRows((current) => {
      const next = current.map((row, rowIndex) => rowIndex === index ? {
        ...row,
        date: row.date || value !== '' ? row.date || todayISO(stockMonth, useSelectedMonth) : '',
        [key]: value,
      } : row)
      if (index === next.length - 1 && hasEntry(next[index])) next.push({ date: '', reference: '', receipt: '', issue: '', office: '', days: '' })
      return next
    })
  }

  function returnToInventory() {
    const updatedItem = getUpdatedItem()
    clearDraft()
    onBack(updatedItem)
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
              {historicalPeriods.map(({ period, beginning, entries }) => {
                let balance = beginning
                return <Fragment key={period}>
                  <tr className="stock-card-history-opening-row"><td>{beginning > 0 ? displayDate(openingDateForPeriod(period)) : ''}</td><td>Beginning balance</td><td></td><td></td><td></td><td>{beginning || ''}</td><td></td></tr>
                  {entries.map((entry, index) => {
                    const receipt = Number(entry.receipt) || 0
                    const issue = Number(entry.issue) || 0
                    if (hasEntry({ ...entry, receipt, issue })) balance += receipt - issue
                    return <tr className="stock-card-history-row" key={`${period}-${index}`}><td>{displayDate(entry.date)}</td><td>{entry.reference || ''}</td><td>{receipt || ''}</td><td>{issue || ''}</td><td>{entry.office || ''}</td><td>{hasEntry({ ...entry, receipt, issue }) ? balance : ''}</td><td>{entry.days || ''}</td></tr>
                  })}
                </Fragment>
              })}
              <tr className="stock-card-opening-row"><td>{beginningBalance > 0 ? displayDate(todayISO(stockMonth, useSelectedMonth)) : ''}</td><td>Beginning balance</td><td></td><td></td><td></td><td><input aria-label="Beginning balance" type="number" min="0" value={beginningBalance} onChange={(event) => { setBeginningBalance(Number(event.target.value) || 0); setIsDirty(true) }} /></td><td></td></tr>
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
        <footer className="stock-card-sheet-footer"><span className="stock-card-prepared-by">Prepared by: <strong>{preparedBy}</strong>{preparedByPosition && <b>{preparedByPosition}</b>}</span></footer>
      </section>
    </div>
  )
}
