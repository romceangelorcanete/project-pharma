export default function MonthlyStockCard({ rows, periodLabels, regular = false, monthLabel = 'November 2026', onItemClick }) {
  const days = Array.from({ length: 31 }, (_, index) => index + 1)
  const currentYear = new Date().getFullYear()
  return (
    <div className="ledger-scroll" role="region" aria-label={`${regular ? 'Regular' : 'Donation'} inventory monthly stock card, scroll horizontally to view all columns`} tabIndex="0">
      <table className={`ledger-table ${regular ? 'regular-grid-table' : 'donation-grid-table'}`}>
        <thead>
          <tr>
            <th rowSpan="2" className="ledger-num sticky-num">#</th><th rowSpan="2" className="ledger-item sticky-item">ITEMS</th>
            {regular && <><th rowSpan="2" className="ledger-unit">UNIT OF<br />MEASURE</th><th rowSpan="2" className="ledger-price">UNIT<br />PRICE</th><th rowSpan="2" className="ledger-price">DPRI<br />PRICE</th><th rowSpan="2" className="ledger-category">CATEGORY</th><th rowSpan="2" className="ledger-other">OTHER CATEGORY<br />(MOBCHA, YAKAP)</th></>}
            <th rowSpan="2" className="ledger-expiry">EXPIRY<br />DATE</th><th rowSpan="2" className="ledger-lot">LOT<br />NUMBER</th><th rowSpan="2" className="ledger-beginning">BEGINNING<br />BALANCE</th><th rowSpan="2" className="ledger-delivery">DELIVERY<br />DATE</th><th rowSpan="2" className="ledger-qty">QTY<br />DELIVERED</th>
            <th colSpan={regular ? 32 : 31} className="ledger-month">{monthLabel.toUpperCase()}</th><th rowSpan="2" className="ledger-ending">ENDING<br />BALANCE</th><th rowSpan="2" className="ledger-month-total">MONTHLY<br />CONSUMPTION</th><th colSpan="5" className="ledger-week-group">WEEKLY CONSUMPTION</th>
          </tr>
          <tr>
            {(regular ? days.slice(0, 3) : days).map((day) => <th className={regular ? 'ledger-day' : day === 2 ? 'ledger-day selected-day' : 'ledger-day'} key={day}>{day}</th>)}
            {regular && days.slice(3).map((day) => <th className="ledger-day" key={day}>{day}</th>)}
            {periodLabels.map((range) => <th className="ledger-week" key={range}>{range}</th>)}
          </tr>
        </thead>
        <tbody>{rows.map((item) => <tr key={item.no}>
          <td className="ledger-num sticky-num">{item.no}</td><td className="ledger-item sticky-item">{onItemClick ? <button className="ledger-item-edit-trigger" type="button" onClick={() => onItemClick(item)}>{item.name}</button> : item.name}</td>
          {regular && <><td className="ledger-unit">{item.unit}</td><td className="ledger-price">{item.price}</td><td className="ledger-price">{item.dpri}</td><td className="ledger-category">{item.category}</td><td className="ledger-other">{item.other}</td></>}
          <td className={`ledger-expiry ${regular ? 'ledger-expiry-colored' : ''}`}>{regular ? String(item.expiry || '').split('\n').filter(Boolean).map((expiry, index) => {
            const yearMatch = expiry.match(/(\d{4})\s*$/)
            const expiryYear = yearMatch ? Number(yearMatch[1]) : null
            const yearClass = expiryYear === currentYear ? 'expiry-current-year' : expiryYear === currentYear + 1 ? 'expiry-next-year' : 'expiry-normal-year'
            return <span className={`ledger-expiry-date ${yearClass}`} key={`${expiry}-${index}`}>{expiry}</span>
          }) : item.expiry}</td><td className="ledger-lot">{item.lot}</td><td className="ledger-beginning">{item.beginning}</td>
          <td className="ledger-delivery ledger-multiline">{item.deliveries.map((entry) => <span key={entry.date}>{entry.date}</span>)}</td><td className="ledger-qty ledger-multiline">{item.deliveries.map((entry) => <span key={entry.date}>{entry.qty}<small>{entry.vendor}</small></span>)}</td>
          {regular && <>{days.slice(0, 3).map((day) => <td className="ledger-day" key={day}>{item.daily[day] || ''}</td>)}{days.slice(3).map((day) => <td className="ledger-day" key={day}>{item.daily[day] || ''}</td>)}</>}
          {!regular && days.map((day) => <td className={day === 2 ? 'ledger-day selected-day' : 'ledger-day'} key={day}>{item.daily[day] || ''}</td>)}
          <td className={`ledger-ending ${item.ending < 0 ? 'ledger-negative' : ''}`}>{item.ending}</td><td className="ledger-month-total">{item.monthly}</td>{item.weekly.map((count, index) => <td className="ledger-week" key={periodLabels[index]}>{count}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
  )
}


