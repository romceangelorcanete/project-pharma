function quantity(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function calculateInventoryTotals(item, weeklyRanges) {
  const daily = Object.entries(item.daily || {}).reduce((totals, [dayText, value]) => {
    const day = Number(dayText)
    if (day >= 1 && day <= 31) totals[day] = quantity(value)
    return totals
  }, {})
  const monthly = Object.values(daily).reduce((sum, value) => sum + value, 0)
  const delivered = (item.deliveries || []).reduce((sum, delivery) => sum + quantity(delivery.qty), 0)
  const weekly = weeklyRanges.map((range, index) => {
    const [start, configuredEnd] = String(range).match(/\d+/g)?.map(Number) || [1, 0]
    const end = index === weeklyRanges.length - 1 ? Math.max(configuredEnd, 31) : configuredEnd
    let total = 0
    for (let day = start; day <= end; day += 1) total += daily[day] || 0
    return total
  })

  return {
    ending: quantity(item.beginning) + delivered - monthly,
    monthly,
    weekly,
  }
}
