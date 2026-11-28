import { useCallback, useEffect, useRef, useState } from 'react'
import { calculateInventoryTotals } from '../utils/inventoryCalculations.js'

const storagePrefix = 'pharma-sample-inventory:'
const syncEventName = 'pharma-sample-inventory-change'
const basePeriod = '2026-11'

function periodKey(section, period) {
  return `${storagePrefix}${section}:${period}`
}

export function persistInventoryRows(section, period, rows) {
  try {
    window.localStorage.setItem(periodKey(section, period), JSON.stringify(rows))
    window.dispatchEvent(new CustomEvent(syncEventName, { detail: { section, period, rows } }))
    syncInventoryMetadataToOtherPeriods(section, period, rows)
  } catch {
    // Keep the current session usable if browser storage is unavailable.
  }
}

export function deleteInventoryItem(section, item) {
  if (typeof window === 'undefined') return
  const legacyKey = `${storagePrefix}${section}`
  const periodPrefix = `${storagePrefix}${section}:`
  const targetProduct = productKey(item)
  const keys = []
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (key === legacyKey || key?.startsWith(periodPrefix)) keys.push(key)
    }
    keys.forEach((key) => {
      const storedRows = readStored(key)
      if (!Array.isArray(storedRows)) return
      const remainingRows = storedRows.filter((storedItem) => {
        if (targetProduct !== '|||') return productKey(storedItem) !== targetProduct
        return itemKey(storedItem) !== itemKey(item)
      })
      if (remainingRows.length === storedRows.length) return
      window.localStorage.setItem(key, JSON.stringify(remainingRows))
      const period = key.startsWith(periodPrefix) ? key.slice(periodPrefix.length) : null
      window.dispatchEvent(new CustomEvent(syncEventName, { detail: { section, period, rows: remainingRows } }))
    })
  } catch {
    // Keep the current session usable if browser storage is unavailable.
  }
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
    return { ...item, beginning: balance, ending: balance, deliveries: [], daily: {}, stockCardEntries: [], monthly: 0, weekly: (item.weekly || [0, 0, 0, 0, 0]).map(() => 0) }
  })
}

function emptyPeriod(rows) {
  return rows.map((item) => ({ ...item, beginning: 0, ending: 0, deliveries: [], daily: {}, stockCardEntries: [], monthly: 0, weekly: (item.weekly || [0, 0, 0, 0, 0]).map(() => 0) }))
}

function itemKey(item) {
  return String(item.no ?? item.id ?? item.name ?? '')
}

function productKey(item) {
  return [item.name, item.unit, item.expiry, item.lot]
    .map((value) => String(value ?? '').trim().toLocaleLowerCase())
    .join('|')
}

function deduplicateProducts(rows, preferredRows) {
  const preferredByProduct = new Map()
  preferredRows.forEach((item) => {
    const key = productKey(item)
    if (key !== '|||') preferredByProduct.set(key, item)
  })
  const groups = new Map()
  rows.forEach((item) => {
    const key = productKey(item)
    if (key === '|||') return
    const group = groups.get(key) || []
    group.push(item)
    groups.set(key, group)
  })
  const duplicateKeys = new Set(groups.keys())
  const output = rows.filter((item) => !duplicateKeys.has(productKey(item)))
  groups.forEach((items, key) => {
    const preferred = preferredByProduct.get(key)
    const canonical = [...items].sort((left, right) => (Number(left.no) || Infinity) - (Number(right.no) || Infinity))[0]
    output.push({ ...(preferred || canonical), no: canonical.no })
  })
  return output
}

function carryNewItemsForward(previousRows, currentRows) {
  const currentKeys = new Set(currentRows.map(productKey))
  const newlyCarried = carryForward(previousRows).filter((item) => !currentKeys.has(productKey(item)))
  return [...currentRows, ...newlyCarried]
}

function inventoryItemMetadata(section, item) {
  const fields = section === 'regular'
    ? ['name', 'unit', 'price', 'dpri', 'category', 'other', 'expiry', 'lot']
    : ['name', 'unit', 'expiry', 'lot']
  return fields
    .reduce((metadata, field) => ({ ...metadata, [field]: item[field] }), {})
}

function dateMatchesPeriod(value, period) {
  const text = String(value ?? '')
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return `${iso[1]}-${iso[2]}` === period
  const us = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  return Boolean(us && `${us[3]}-${us[1].padStart(2, '0')}` === period)
}

function inventoryMonthItem(section, item, period, previous = null) {
  const hasStockCardEntries = Array.isArray(item.stockCardEntries) && item.stockCardEntries.length > 0
  const entries = hasStockCardEntries
    ? item.stockCardEntries.filter((entry) => dateMatchesPeriod(entry.date, period)).map((entry) => ({ ...entry }))
    : item.stockCardEntries || []
  const deliveries = hasStockCardEntries
    ? entries.filter((entry) => Number(entry.receipt) > 0 || entry.reference && Number(entry.issue) === 0)
      .map((entry) => ({ date: entry.date, qty: Number(entry.receipt) || 0, vendor: entry.reference || '' }))
    : (item.deliveries || []).filter((delivery) => dateMatchesPeriod(delivery.date, period))
  const daily = hasStockCardEntries
    ? entries.reduce((result, entry) => {
      const issue = Number(entry.issue) || 0
      const date = String(entry.date || '')
      const day = Number(date.match(/(?:-|\/)(\d{1,2})$/)?.[1])
      if (issue > 0 && day) result[day] = (Number(result[day]) || 0) + issue
      return result
    }, {})
    : item.daily || {}
  const beginning = previous ? Number(previous.ending ?? previous.beginning) || 0 : Number(item.beginning) || 0
  return { ...item, ...(previous ? inventoryItemMetadata(section, previous) : {}), beginning, deliveries, daily, stockCardEntries: entries }
}

function syncInventoryMetadataToOtherPeriods(section, currentPeriod, masterRows) {
  const prefix = `${storagePrefix}${section}:`
  const updates = []
  const keys = []
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (key?.startsWith(prefix) && key !== periodKey(section, currentPeriod)) keys.push(key)
  }
  keys.forEach((key) => {
    const storedRows = readStored(key)
    if (!Array.isArray(storedRows)) return
    let changed = false
    const nextRows = storedRows.map((item) => {
      const master = findPreviousItem(item, masterRows)
      if (!master) return item
      const updated = { ...item, ...inventoryItemMetadata(section, master), no: master.no }
      if (Object.keys(updated).some((field) => updated[field] !== item[field])) changed = true
      return updated
    })
    if (!changed) return
    window.localStorage.setItem(key, JSON.stringify(nextRows))
    updates.push({ period: key.slice(prefix.length), rows: nextRows })
  })
  updates.forEach(({ period, rows }) => {
    window.dispatchEvent(new CustomEvent(syncEventName, { detail: { section, period, rows } }))
  })
}

function findPreviousItem(item, previousRows) {
  const product = productKey(item)
  const exactProduct = previousRows.find((candidate) => productKey(candidate) === product)
  if (exactProduct) return exactProduct
  return previousRows.find((candidate) => {
    if (String(candidate.no) !== String(item.no)) return false
    const sameName = String(candidate.name || '').trim().toLowerCase() === String(item.name || '').trim().toLowerCase()
    const sameUnit = candidate.unit && item.unit && String(candidate.unit).trim().toLowerCase() === String(item.unit).trim().toLowerCase()
    const sameLot = candidate.lot && item.lot && String(candidate.lot).trim() === String(item.lot).trim()
    const sameExpiry = candidate.expiry && item.expiry && String(candidate.expiry).trim() === String(item.expiry).trim()
    return sameName || sameUnit && (sameLot || sameExpiry)
  })
}

function mergeInventoryMonth(section, previousRows, currentRows, period) {
  const rows = [...currentRows]
  previousRows.forEach((previous) => {
    if (!findPreviousItem(previous, currentRows)) rows.push(...carryForward([previous]))
  })
  const weeklyRanges = section === 'regular' ? ['1-7', '8-14', '15-21', '22-28', '29-30'] : ['1-3', '4-10', '11-17', '18-24', '25-30']
  return rows.map((item) => {
    const previous = findPreviousItem(item, previousRows)
    const normalized = inventoryMonthItem(section, item, period, previous)
    const totals = calculateInventoryTotals(normalized, weeklyRanges)
    return { ...normalized, ending: totals.ending, monthly: totals.monthly, weekly: totals.weekly }
  })
}

function rowsForPeriod(section, fallbackRows, period) {
  let rows

  if (period < basePeriod) {
    rows = emptyPeriod(fallbackRows)
  } else if (period === basePeriod) {
    const exactBase = readStored(periodKey(section, basePeriod))
    const baseRows = exactBase || readStored(`${storagePrefix}${section}`) || fallbackRows
    if (exactBase) {
      const weeklyRanges = section === 'regular' ? ['1-7', '8-14', '15-21', '22-28', '29-30'] : ['1-3', '4-10', '11-17', '18-24', '25-30']
      rows = baseRows.map((item) => {
        const normalized = inventoryMonthItem(section, item, basePeriod)
        const totals = calculateInventoryTotals(normalized, weeklyRanges)
        return { ...normalized, ending: totals.ending, monthly: totals.monthly, weekly: totals.weekly }
      })
    } else {
      rows = baseRows
    }
  } else {
    let cursor = basePeriod
    rows = readStored(periodKey(section, basePeriod)) || readStored(`${storagePrefix}${section}`) || fallbackRows
    let safety = 0
    while (cursor < period && safety < 1200) {
      cursor = nextPeriod(cursor)
      const storedPeriod = readStored(periodKey(section, cursor))
      rows = storedPeriod ? mergeInventoryMonth(section, rows, storedPeriod, cursor) : carryForward(rows)
      safety += 1
    }
  }

  // Keep one shared product catalog across months and years. Match by item
  // identity rather than row number, since separately edited months can reuse
  // the same number for different products.
  const periodRows = rows
  if (typeof window !== 'undefined') {
    const prefix = `${storagePrefix}${section}:`
    const storedKeys = []
    try {
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index)
        if (key?.startsWith(prefix)) storedKeys.push(key)
      }
    } catch {
      // Keep the inventory view usable if browser storage is unavailable.
    }
    storedKeys.sort()
    const catalogByProduct = new Map()
    const catalogSources = [readStored(`${storagePrefix}${section}`), ...storedKeys.map(readStored), fallbackRows]
    catalogSources.forEach((source) => {
      if (!Array.isArray(source)) return
      source.forEach((item) => {
        const key = productKey(item)
        if (key !== '|||') catalogByProduct.set(key, catalogByProduct.get(key) || item)
      })
    })
    // Include any carried-forward products not present in stored snapshots yet.
    periodRows.forEach((item) => {
      const key = productKey(item)
      if (key !== '|||') catalogByProduct.set(key, catalogByProduct.get(key) || item)
    })

    const catalog = [...catalogByProduct.values()]
    let nextNo = catalog.reduce((maximum, item) => Math.max(maximum, Number(item.no) || 0), 0) + 1
    const usedNumbers = new Set()
    const numberedCatalog = catalog.map((item) => {
      let no = Number(item.no)
      if (!Number.isFinite(no) || usedNumbers.has(no)) no = nextNo++
      usedNumbers.add(no)
      return { ...item, no }
    })
    const catalogByKey = new Map(numberedCatalog.map((item) => [productKey(item), item]))
    const periodByKey = new Map()
    periodRows.forEach((item) => {
      const key = productKey(item)
      if (key !== '|||') periodByKey.set(key, periodByKey.get(key) || item)
    })
    rows = numberedCatalog.map((catalogItem) => {
      const key = productKey(catalogItem)
      const current = periodByKey.get(key)
      const canonical = catalogByKey.get(key)
      return current ? { ...canonical, ...current, no: canonical.no } : emptyPeriod([canonical])[0]
    })
  }

  return deduplicateProducts(rows, periodRows)
}

export function readInventoryRows(section, fallbackRows, period = basePeriod) {
  return rowsForPeriod(section, fallbackRows, period)
}

export function useInventoryYearRows(section, fallbackRows, year) {
  const [monthlyRows, setMonthlyRows] = useState(() => Array.from(
    { length: 12 },
    (_, index) => rowsForPeriod(section, fallbackRows, `${year}-${String(index + 1).padStart(2, '0')}`),
  ))

  useEffect(() => {
    const refresh = () => setMonthlyRows(Array.from(
      { length: 12 },
      (_, index) => rowsForPeriod(section, fallbackRows, `${year}-${String(index + 1).padStart(2, '0')}`),
    ))
    refresh()
    window.addEventListener(syncEventName, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(syncEventName, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [section, fallbackRows, year])

  return monthlyRows
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
    persistInventoryRows(section, period, rows)
    dirtyRef.current = false
  }, [section, period, rows])

  const setRows = useCallback((nextRows) => {
    dirtyRef.current = true
    setRowsState(nextRows)
  }, [])
  return [rows, setRows]
}
