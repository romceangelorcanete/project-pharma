import { useCallback, useEffect, useRef, useState } from 'react'

const storagePrefix = 'pharma-sample-inventory:'
const syncEventName = 'pharma-sample-inventory-change'
const basePeriod = '2026-11'

function periodKey(section, period) {
  return `${storagePrefix}${section}:${period}`
}

function readStored(key) {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.localStorage.getItem(key)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function nextPeriod(period) {
  const [year, month] = period.split('-').map(Number)
  const date = new Date(year, month, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function carryForward(rows) {
  return rows.map((item) => {
    const balance = Number(item.ending ?? item.beginning ?? 0)
    return { ...item, beginning: balance, ending: balance, deliveries: [], daily: {}, monthly: 0, weekly: (item.weekly || [0, 0, 0, 0, 0]).map(() => 0) }
  })
}

function emptyPeriod(rows) {
  return rows.map((item) => ({ ...item, beginning: 0, ending: 0, deliveries: [], daily: {}, monthly: 0, weekly: (item.weekly || [0, 0, 0, 0, 0]).map(() => 0) }))
}

function rowsForPeriod(section, fallbackRows, period) {
  const exact = readStored(periodKey(section, period))
  if (exact) return exact

  if (period === basePeriod) return readStored(`${storagePrefix}${section}`) || fallbackRows
  if (period < basePeriod) return emptyPeriod(fallbackRows)

  let cursor = basePeriod
  let rows = readStored(periodKey(section, basePeriod)) || readStored(`${storagePrefix}${section}`) || fallbackRows
  let safety = 0
  while (cursor < period && safety < 1200) {
    cursor = nextPeriod(cursor)
    rows = readStored(periodKey(section, cursor)) || carryForward(rows)
    safety += 1
  }
  return rows
}

export function readInventoryRows(section, fallbackRows, period = basePeriod) {
  return rowsForPeriod(section, fallbackRows, period)
}

export default function useInventoryRows(section, fallbackRows, period = basePeriod) {
  const [rows, setRowsState] = useState(() => readInventoryRows(section, fallbackRows, period))
  const dirtyRef = useRef(false)

  useEffect(() => {
    const handleSync = (event) => {
      if (event.type === 'storage') {
        if (event.key === periodKey(section, period) || event.key === null) setRowsState(rowsForPeriod(section, fallbackRows, period))
      } else if (event.detail?.section === section) {
        if (event.detail.period === period) setRowsState(event.detail.rows)
      }
    }
    window.addEventListener(syncEventName, handleSync)
    window.addEventListener('storage', handleSync)
    return () => {
      window.removeEventListener(syncEventName, handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [section, fallbackRows, period])

  useEffect(() => {
    if (!dirtyRef.current) return
    try {
      window.localStorage.setItem(periodKey(section, period), JSON.stringify(rows))
      window.dispatchEvent(new CustomEvent(syncEventName, { detail: { section, period, rows } }))
    } catch {
      // Keep the current session usable if browser storage is unavailable.
    }
    dirtyRef.current = false
  }, [section, period, rows])

  const setRows = useCallback((nextRows) => {
    dirtyRef.current = true
    setRowsState(nextRows)
  }, [])
  return [rows, setRows]
}
