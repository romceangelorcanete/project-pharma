function dateToISO(value = '') {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const match = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  return match ? `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}` : ''
}

function isReceipt(entry) {
  return Number(entry.receipt) > 0 || Boolean(entry.reference && Number(entry.issue) === 0)
}

export function reconcileStockCardEntries(item, stockMonth) {
  const existing = item.stockCardEntries || []
  const existingIssues = existing.filter((entry) => Number(entry.issue) > 0)
  const deliveries = (item.deliveries || [])
    .filter((delivery) => (delivery.qty !== '' && delivery.qty != null) || String(delivery.vendor || '').trim())
    .map((delivery) => ({ ...delivery, date: dateToISO(delivery.date), qty: Number(delivery.qty) || 0, vendor: String(delivery.vendor || '').trim() }))

  const [year, month] = stockMonth.split('-').map(Number)
  const dailyValues = Object.entries(item.daily || {}).reduce((result, [day, value]) => {
    const quantity = Number(value) || 0
    if (Number(day) >= 1 && Number(day) <= 31 && quantity > 0) result[Number(day)] = quantity
    return result
  }, {})
  const dailyDate = (day) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const issueSums = existingIssues.reduce((result, entry) => {
    const date = dateToISO(entry.date)
    result[date] = (result[date] || 0) + (Number(entry.issue) || 0)
    return result
  }, {})
  const validIssueDates = new Set(Object.entries(dailyValues)
    .filter(([day, quantity]) => issueSums[dailyDate(day)] === quantity)
    .map(([day]) => dailyDate(day)))
  const matchedDeliveries = new Set()
  const preservedEntries = []

  for (const entry of existing) {
    if (isReceipt(entry)) {
      const savedDate = dateToISO(entry.date)
      let index = deliveries.findIndex((delivery, rowIndex) => !matchedDeliveries.has(rowIndex) && delivery.date === savedDate && delivery.qty === (Number(entry.receipt) || 0) && delivery.vendor === String(entry.reference || '').trim())
      if (index < 0) index = deliveries.findIndex((delivery, rowIndex) => !matchedDeliveries.has(rowIndex) && delivery.date === savedDate && delivery.vendor === String(entry.reference || '').trim())
      if (index < 0) index = deliveries.findIndex((delivery, rowIndex) => !matchedDeliveries.has(rowIndex) && delivery.date === savedDate)
      if (index >= 0) {
        matchedDeliveries.add(index)
        const delivery = deliveries[index]
        preservedEntries.push({ ...entry, date: delivery.date, reference: delivery.vendor, receipt: delivery.qty, issue: 0 })
      }
      continue
    }
    if (Number(entry.issue) > 0) {
      if (validIssueDates.has(dateToISO(entry.date))) preservedEntries.push({ ...entry, date: dateToISO(entry.date) })
      continue
    }
    preservedEntries.push(entry)
  }

  const newReceipts = deliveries.filter((_, index) => !matchedDeliveries.has(index)).map((delivery) => ({ date: delivery.date, reference: delivery.vendor, receipt: delivery.qty, issue: 0, office: '', days: '' }))
  const newIssues = Object.entries(dailyValues).flatMap(([day, quantity]) => {
    const date = dailyDate(day)
    if (validIssueDates.has(date)) return []
    return [{ date, reference: '', receipt: 0, issue: quantity, office: '', days: '' }]
  })

  return [...preservedEntries, ...newReceipts, ...newIssues]
    .filter((entry) => entry.date || entry.reference || entry.office || entry.days || Number(entry.receipt) || Number(entry.issue))
}
