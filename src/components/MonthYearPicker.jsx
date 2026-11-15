import { useState } from 'react'

const monthShortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function MonthPickerChevron() {
  return <svg className="month-picker-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m5.5 7.5 4.5 4.5 4.5-4.5" /></svg>
}

function MonthPickerArrow({ direction }) {
  const path = direction === 'previous' ? 'm12 4-6 6 6 6' : 'm8 4 6 6-6 6'
  return <svg className="month-picker-arrow-icon" viewBox="0 0 20 20" aria-hidden="true"><path d={path} /></svg>
}

export default function MonthYearPicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(() => Number(value.split('-')[0]))
  const [year, monthNumber] = value.split('-').map(Number)
  const monthLabel = new Date(year, monthNumber - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return <div className="month-picker-wrap">
    <button type="button" className="ledger-filter month-picker-trigger" aria-expanded={isOpen} aria-haspopup="dialog" onClick={() => { setPickerYear(year); setIsOpen((open) => !open) }}><span>{monthLabel}</span><MonthPickerChevron /></button>
    {isOpen && <div className="month-picker-popover" role="dialog" aria-label="Select inventory month">
      <div className="month-picker-header"><button type="button" aria-label="Previous year" onClick={() => setPickerYear((currentYear) => currentYear - 1)}><MonthPickerArrow direction="previous" /></button><strong>{pickerYear}</strong><button type="button" aria-label="Next year" onClick={() => setPickerYear((currentYear) => currentYear + 1)}><MonthPickerArrow direction="next" /></button></div>
      <div className="month-picker-grid">{monthShortNames.map((month, index) => <button type="button" key={month} className={year === pickerYear && monthNumber === index + 1 ? 'selected-month' : ''} aria-pressed={year === pickerYear && monthNumber === index + 1} onClick={() => { onChange(`${pickerYear}-${String(index + 1).padStart(2, '0')}`); setIsOpen(false) }}>{month}</button>)}</div>
    </div>}
  </div>
}

