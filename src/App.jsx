import { useEffect, useState } from 'react'
import './App.css'

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
  })

  let data
  try {
    data = await response.json()
  } catch {
    throw new Error('The server returned an invalid response.')
  }

  if (!response.ok) {
    throw new Error(data.error || 'The request could not be completed.')
  }

  return data
}

function roleTitle(role) {
  return role === 'admin' ? 'Admin' : role === 'pharmacist' ? 'Pharmacist' : role
}

const sampleRegularRows = [
  { no: 1, name: '0.9 Sodium Chloride, 50ml vial', unit: 'vial', price: '₱44.55', dpri: '₱59.88', category: 'SMALL VIALS', other: 'NONE', expiry: '04/2031', lot: '260418', beginning: 734, deliveries: [{ date: '7/2/2026', qty: 300, vendor: 'EUROMED' }], daily: { 3: 8, 4: 1 }, ending: 725, monthly: 9, weekly: [9, 0, 0, 0, 0] },
  { no: 9, name: 'Acetylcysteine 600mg tablet', unit: 'tablet', price: '₱23.00', dpri: '₱36.36', category: 'COUGH SUPPRESSANTS', other: '', expiry: '03/2029', lot: '2603085\n0495', beginning: 1661, deliveries: [{ date: '10/14/2026', qty: 50, vendor: 'OAK' }, { date: '10/23/2026', qty: 100, vendor: 'ICS' }], daily: { 1: 63, 2: 38, 3: 34, 5: 36 }, ending: 1490, monthly: 171, weekly: [135, 36, 0, 0, 0] },
  { no: 14, name: 'Albendazole 400mg tablet', unit: 'tablet', price: '₱7.00', dpri: '₱8.00', category: 'ANTI-BIOTICS / MICROBIALS', other: '', expiry: '02/2028\n10/2027', lot: 'XT6C022\nXT5K007', beginning: 294, deliveries: [{ date: '4/28/2026', qty: 200, vendor: 'DYNA' }, { date: '5/5/2026', qty: 100, vendor: 'OAK' }], daily: {}, ending: 294, monthly: 0, weekly: [0, 0, 0, 0, 0] },
]

const weeklyRanges = ['1-7', '8-14', '15-21', '22-28', '29-30']
const donationWeeklyRanges = ['1-3', '4-10', '11-17', '18-24', '25-30']
const sampleDonationRows = [
  { no: 1, name: 'Aciclovir 250mg vial', unit: 'vial', category: 'Donation', expiry: '', lot: '', beginning: 0, deliveries: [], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 2, name: 'Amikacin 125mg/ml vial', unit: 'vial', category: 'Donation', expiry: '', lot: '', beginning: 0, deliveries: [{ date: '9/4/2026', qty: 68, vendor: 'PGH' }], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 4, name: 'Amino Acid 7%', unit: 'bottle', category: 'Donation', expiry: '12/2026', lot: '2250117', beginning: 10, deliveries: [{ date: '10/14/2026', qty: 20, vendor: 'VMC' }], daily: { 1: 1, 3: 4, 4: 5 }, ending: 0, monthly: 10, weekly: [10, 0, 0, 0, 0] },
  { no: 5, name: '5% Amino Acids in 5% Sorbitol', unit: 'bottle', category: 'Donation', expiry: '', lot: '', beginning: 0, deliveries: [], daily: { 4: 1 }, ending: -1, monthly: 1, weekly: [1, 0, 0, 0, 0] },
  { no: 16, name: 'Azithromycin 500mg vial', unit: 'vial', category: 'Donation', expiry: '01/2027', lot: 'R45240151', beginning: 397, deliveries: [{ date: '7/16/2026', qty: 600, vendor: 'CONRADO' }], daily: { 1: 1, 4: 4 }, ending: 392, monthly: 5, weekly: [5, 0, 0, 0, 0] },
]
const sampleMhmapRows = [
  { no: 1, name: 'Carbamazepine 200mg tablet', expiry: '', lot: 'PH21-79\n20072773', beginning: 0, deliveries: [{ date: '7/10/2025', qty: 100, vendor: 'NO PAPERS' }, { date: '12/12/2025', qty: 100, vendor: '' }], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 2, name: 'Chlorpromazine HCl 200mg tablet', expiry: '', lot: '', beginning: 0, deliveries: [], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 3, name: 'Clozapine 100mg tablet', expiry: '2/1/2027', lot: 'B344K015', beginning: 0, deliveries: [{ date: '5/19/2025', qty: 100, vendor: '' }, { date: '11/30/2025', qty: 550, vendor: '' }], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 4, name: 'Diphenhydramine HCl 50mg/ml, 1ml ampule', expiry: '', lot: '', beginning: 0, deliveries: [], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 5, name: 'Donepezil HCl 10mg tablet', expiry: '07/01/2027', lot: 'BZ01K010', beginning: 100, deliveries: [{ date: '12/15/2025', qty: 100, vendor: 'DOHCLCHD' }], daily: {}, ending: 100, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 6, name: 'Escitalopram oxalate 10mg tablet', expiry: '', lot: '', beginning: 73, deliveries: [], daily: {}, ending: 73, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 7, name: 'Fluoxetine 20mg capsule', expiry: '2/1/2027', lot: 'PH-2519', beginning: 0, deliveries: [{ date: '3/10/2026', qty: 150, vendor: 'DOHCLHD' }], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 8, name: 'Fluphenazine Decanoate 25mg/ml, 1ml amp', expiry: '', lot: '', beginning: 0, deliveries: [], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 9, name: 'Haloperidol 5mg tablet', expiry: '11/30/2027', lot: 'CFB24004', beginning: 88, deliveries: [{ date: '7/15/2026', qty: 100, vendor: 'BPHO' }], daily: {}, ending: 88, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 10, name: 'Haloperidol 5mg/ml 1ml solution for injection ampule', expiry: '11/30/2027', lot: '243532', beginning: 3, deliveries: [{ date: '7/15/2026', qty: 3, vendor: 'BPHO' }], daily: {}, ending: 3, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 11, name: 'Lamotrigine 100mg tablet', expiry: '12/2028', lot: 'B662L006', beginning: 90, deliveries: [{ date: '12/15/2025', qty: 90, vendor: 'DOHCLCHD' }], daily: {}, ending: 90, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 12, name: 'Lithium Carbonate 450mg tablet', expiry: '', lot: '', beginning: 0, deliveries: [], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 13, name: 'Memantine HCl 10mg tablet', expiry: '05/31/2027', lot: 'BDMGL004\nHYT2402', beginning: 0, deliveries: [{ date: '12/15/2025', qty: 290, vendor: 'DOHCLCHD' }], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 14, name: 'Olanzapine HCl 10mg tablet', expiry: '', lot: '', beginning: 0, deliveries: [], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 15, name: 'Quetiapine fumarate 200mg tablet', expiry: '9/1/2026', lot: 'BUX2303', beginning: 0, deliveries: [{ date: '6/5/2026', qty: 300, vendor: 'NCMH' }], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 16, name: 'Risperidone 2mg tablet', expiry: '', lot: '', beginning: 0, deliveries: [], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 17, name: 'Sertraline 50mg tablet', expiry: '10/2026', lot: '', beginning: 0, deliveries: [{ date: '7/15/2026', qty: 631, vendor: 'BPHO' }], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 18, name: 'Valproic acid 250mg tablet', expiry: '', lot: '', beginning: 0, deliveries: [], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 19, name: 'Valproic acid 500mg tablet', expiry: '', lot: '', beginning: 0, deliveries: [], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 20, name: 'Valproic acid 250mg/5ml syrup, 120ml bottle', expiry: '', lot: '', beginning: 0, deliveries: [], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
]

function MonthlyStockCard({ rows, periodLabels, regular = false }) {
  const days = Array.from({ length: 31 }, (_, index) => index + 1)
  return (
    <div className="ledger-scroll" role="region" aria-label={`${regular ? 'Regular' : 'Donation'} inventory monthly stock card, scroll horizontally to view all columns`} tabIndex="0">
      <table className={`ledger-table ${regular ? 'regular-grid-table' : 'donation-grid-table'}`}>
        <thead>
          <tr>
            <th rowSpan="2" className="ledger-num sticky-num">#</th><th rowSpan="2" className="ledger-item sticky-item">ITEMS</th>
            {regular && <><th rowSpan="2" className="ledger-unit">UNIT OF<br />MEASURE</th><th rowSpan="2" className="ledger-price">UNIT<br />PRICE</th><th rowSpan="2" className="ledger-price">DPRI<br />PRICE</th><th rowSpan="2" className="ledger-category">CATEGORY</th><th rowSpan="2" className="ledger-other">OTHER CATEGORY<br />(MOBCHA, YAKAP)</th></>}
            <th rowSpan="2" className="ledger-expiry">EXPIRY<br />DATE</th><th rowSpan="2" className="ledger-lot">LOT<br />NUMBER</th><th rowSpan="2" className="ledger-beginning">BEGINNING<br />BALANCE</th><th rowSpan="2" className="ledger-delivery">DELIVERY<br />DATE</th><th rowSpan="2" className="ledger-qty">QTY<br />DELIVERED</th>
            <th colSpan={regular ? 32 : 31} className="ledger-month">NOVEMBER 2026</th><th rowSpan="2" className="ledger-ending">ENDING<br />BALANCE</th><th rowSpan="2" className="ledger-month-total">MONTHLY<br />CONSUMPTION</th><th colSpan="5" className="ledger-week-group">WEEKLY CONSUMPTION</th>
          </tr>
          <tr>
            {(regular ? days.slice(0, 3) : days).map((day) => <th className={day === 2 ? 'ledger-day selected-day' : 'ledger-day'} key={day}>{day}</th>)}
            {regular && <th className="ledger-return">SL<br />RET</th>}
            {regular && days.slice(3).map((day) => <th className="ledger-day" key={day}>{day}</th>)}
            {periodLabels.map((range) => <th className="ledger-week" key={range}>{range}</th>)}
          </tr>
        </thead>
        <tbody>{rows.map((item) => <tr key={item.no}>
          <td className="ledger-num sticky-num">{item.no}</td><td className="ledger-item sticky-item">{item.name}</td>
          {regular && <><td className="ledger-unit">{item.unit}</td><td className="ledger-price">{item.price}</td><td className="ledger-price">{item.dpri}</td><td className="ledger-category">{item.category}</td><td className="ledger-other">{item.other}</td></>}
          <td className="ledger-expiry">{item.expiry}</td><td className="ledger-lot">{item.lot}</td><td className="ledger-beginning">{item.beginning}</td>
          <td className="ledger-delivery ledger-multiline">{item.deliveries.map((entry) => <span key={entry.date}>{entry.date}</span>)}</td><td className="ledger-qty ledger-multiline">{item.deliveries.map((entry) => <span key={entry.date}>{entry.qty}<small>{entry.vendor}</small></span>)}</td>
          {regular && <>{days.slice(0, 3).map((day) => <td className={day === 2 ? 'ledger-day selected-day' : 'ledger-day'} key={day}>{item.daily[day] || ''}</td>)}<td className="ledger-return">{item.daily.return || ''}</td>{days.slice(3).map((day) => <td className="ledger-day" key={day}>{item.daily[day] || ''}</td>)}</>}
          {!regular && days.map((day) => <td className={day === 2 ? 'ledger-day selected-day' : 'ledger-day'} key={day}>{item.daily[day] || ''}</td>)}
          <td className={`ledger-ending ${item.ending < 0 ? 'ledger-negative' : ''}`}>{item.ending}</td><td className="ledger-month-total">{item.monthly}</td>{item.weekly.map((count, index) => <td className="ledger-week" key={periodLabels[index]}>{count}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
  )
}

const sampleActivity = [
  { action: 'Stock received', item: 'Paracetamol 500 mg', detail: 'Added 24 boxes', time: 'Today, 9:42 AM', mark: '+' },
  { action: 'Low stock alert', item: 'Cetirizine 10 mg', detail: '9 boxes remaining', time: 'Today, 8:15 AM', mark: '!' },
  { action: 'Stock issued', item: 'Omeprazole 20 mg', detail: 'Issued 6 boxes', time: 'Yesterday, 4:30 PM', mark: '−' },
]

function AdminDashboard({ user, onLogout, submitting }) {
  const [stockMenuOpen, setStockMenuOpen] = useState(true)
  const [activeSection, setActiveSection] = useState('overview')
  const sectionTitle = activeSection === 'overview' ? 'Dashboard' : activeSection === 'regular' ? 'Regular inventory' : activeSection === 'donation' ? 'Donation inventory' : 'MHMAP inventory'

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <a className="brand dashboard-brand" href="/" aria-label="JVGH Pharmacy home">
          <span className="brand-mark" aria-hidden="true">+</span>
          <span>JVGH <strong>PHARMACY</strong></span>
        </a>
        <p className="sidebar-caption">WORKSPACE</p>
        <nav className="sidebar-nav" aria-label="Admin navigation">
          <button className={`sidebar-link ${activeSection === 'overview' ? 'active' : ''}`} type="button" onClick={() => setActiveSection('overview')}><span>▦</span> Overview</button>
          <div className={`sidebar-group ${stockMenuOpen ? 'is-open' : ''}`}>
            <button className="sidebar-link sidebar-parent" type="button" aria-expanded={stockMenuOpen} onClick={() => setStockMenuOpen((open) => !open)}>
              <span>▤</span> E-STOCK <span className="sidebar-chevron" aria-hidden="true">⌄</span>
            </button>
            {stockMenuOpen && <div className="sidebar-submenu">
              <button className={`sidebar-sublink ${activeSection === 'regular' ? 'active' : ''}`} type="button" onClick={() => setActiveSection('regular')}>Regular</button>
              <button className={`sidebar-sublink ${activeSection === 'donation' ? 'active' : ''}`} type="button" onClick={() => setActiveSection('donation')}>Donation</button>
              <button className={`sidebar-sublink ${activeSection === 'mhmap' ? 'active' : ''}`} type="button" onClick={() => setActiveSection('mhmap')}>MHMAP</button>
            </div>}
          </div>
          <a className="sidebar-link" href="#activity"><span>↻</span> Stock movements <small>Sample</small></a>
          <a className="sidebar-link" href="#team"><span>♙</span> User management <small>Sample</small></a>
          <a className="sidebar-link" href="#reports"><span>▥</span> Reports <small>Sample</small></a>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-user-mark">{user.fullName?.charAt(0)?.toUpperCase() || 'A'}</div>
          <div className="sidebar-user-info"><strong>{user.fullName}</strong><span>Administrator</span></div>
          <button className="sidebar-logout" type="button" onClick={onLogout} disabled={submitting} aria-label="Sign out">↗</button>
        </div>
      </aside>

      <section className="dashboard-main" id="overview">
        <header className="dashboard-header">
          <div><p className="eyebrow">PHARMACY INVENTORY SYSTEM</p><h1>{sectionTitle}</h1></div>
          <div className="dashboard-header-actions"><span className="sample-indicator"><i /> Sample data</span><button className="text-button" type="button" onClick={onLogout} disabled={submitting}>{submitting ? 'Signing out…' : 'Sign out'}</button></div>
        </header>

        {activeSection === 'overview' && <>
        <div className="dashboard-welcome"><div><h2>Good day, {user.fullName?.split(' ')[0] || 'Admin'}</h2><p>Here’s what’s happening with your pharmacy today.</p></div><span className="dashboard-date">JVGH PHARMACY · ADMIN</span></div>

        <section className="metric-grid" aria-label="Sample inventory summary">
          <article className="metric-card"><div className="metric-label">TOTAL MEDICINES <span className="metric-icon green">▤</span></div><strong>248</strong><p><span className="metric-positive">+12</span> this month</p></article>
          <article className="metric-card"><div className="metric-label">LOW STOCK ITEMS <span className="metric-icon amber">!</span></div><strong>08</strong><p><span className="metric-warning">Needs attention</span></p></article>
          <article className="metric-card"><div className="metric-label">EXPIRING SOON <span className="metric-icon blue">◷</span></div><strong>03</strong><p>Within the next 90 days</p></article>
          <article className="metric-card"><div className="metric-label">STOCK MOVEMENTS <span className="metric-icon violet">↗</span></div><strong>36</strong><p>Recorded this month</p></article>
        </section>

        <div className="dashboard-content-grid">
          <section className="dashboard-card movement-card" id="reports">
            <div className="card-heading"><div><h2>Stock movement</h2><p>Sample activity this week</p></div><span className="period-chip">This week⌄</span></div>
            <div className="chart-total"><strong>126</strong><span>items moved</span></div>
            <div className="movement-chart" role="img" aria-label="Sample stock movement chart for Monday through Sunday">{[{d:'Mon',a:46,b:25},{d:'Tue',a:64,b:38},{d:'Wed',a:42,b:52},{d:'Thu',a:77,b:37},{d:'Fri',a:59,b:49},{d:'Sat',a:35,b:22},{d:'Sun',a:26,b:16}].map((day) => <div className="chart-day" key={day.d}><div className="chart-bars"><i style={{height:`${day.a}%`}}/><i style={{height:`${day.b}%`}}/></div><span>{day.d}</span></div>)}</div>
            <div className="chart-legend"><span><i className="legend-in"/>Stock received</span><span><i className="legend-out"/>Stock issued</span></div>
          </section>

          <section className="dashboard-card activity-card" id="activity">
            <div className="card-heading"><div><h2>Recent activity</h2><p>Latest sample stock updates</p></div><a href="#activity">View all <span>→</span></a></div>
            <div className="activity-list">{sampleActivity.map((item) => <article className="activity-row" key={`${item.action}-${item.item}`}><span className={`activity-mark ${item.mark === '!' ? 'activity-alert' : ''}`}>{item.mark}</span><div className="activity-copy"><strong>{item.action}</strong><span>{item.item} · {item.detail}</span></div><time>{item.time}</time></article>)}</div>
          </section>

          <section className="dashboard-card team-card" id="team">
            <div className="card-heading"><div><h2>Team access</h2><p>Sample workspace summary</p></div><span className="team-icon">♙</span></div>
            <div className="team-total"><strong>06</strong><span>active staff accounts</span></div>
            <div className="team-roles"><span>Admin <b>1</b></span><span>Pharmacist <b>5</b></span></div>
            <a className="team-link" href="#team">Manage users <span>→</span></a>
          </section>
        </div>
        <footer className="dashboard-footer">Dashboard preview · All inventory and activity figures shown are sample data.</footer>
        </>}

        {activeSection === 'regular' && <div className="section-page-content">
          <section className="dashboard-card regular-ledger-card" id="regular">
            <div className="ledger-heading">
              <div><span className="ledger-kicker">E-STOCK / REGULAR</span><h2>Regular inventory</h2><p>Monthly stock card · November 2026</p></div>
              <div className="ledger-actions"><span className="sample-indicator"><i /> Sample data</span><button type="button" className="ledger-filter">November 2026 <span>⌄</span></button></div>
            </div>
            <div className="ledger-hint"><span>↔</span> Swipe or scroll horizontally to view all stock-card columns</div>
            <MonthlyStockCard rows={sampleRegularRows} periodLabels={weeklyRanges} regular />
          </section>
        </div>}

        {activeSection === 'donation' && <div className="section-page-content">
          <section className="dashboard-card regular-ledger-card" id="donation">
            <div className="ledger-heading"><div><span className="ledger-kicker">E-STOCK / DONATION</span><h2>Donation inventory</h2><p>Monthly stock card · November 2026</p></div><div className="ledger-actions"><span className="sample-indicator"><i /> Sample data</span><button type="button" className="ledger-filter">November 2026 <span>⌄</span></button></div></div>
            <div className="ledger-hint"><span>↔</span> Swipe or scroll horizontally to view all stock-card columns</div>
            <MonthlyStockCard rows={sampleDonationRows} periodLabels={donationWeeklyRanges} />
          </section>
        </div>}

        {activeSection === 'mhmap' && <div className="section-page-content">
          <section className="dashboard-card regular-ledger-card">
            <div className="ledger-heading"><div><span className="ledger-kicker">E-STOCK / MHMAP</span><h2>MHMAP inventory</h2><p>Monthly stock card · November 2026</p></div><div className="ledger-actions"><span className="sample-indicator"><i /> Sample data</span><button type="button" className="ledger-filter">November 2026 <span>⌄</span></button></div></div>
            <div className="ledger-hint"><span>↔</span> Swipe or scroll horizontally to view all stock-card columns</div>
            <MonthlyStockCard rows={sampleMhmapRows} periodLabels={donationWeeklyRanges} />
          </section>
        </div>}
      </section>
    </main>
  )
}

export default function App() {
  const [auth, setAuth] = useState({ status: 'loading', user: null, csrfToken: '' })
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function loadSession() {
    setError('')
    setAuth((current) => ({ ...current, status: 'loading' }))

    try {
      const session = await requestJson('/api/auth/session.php')
      setAuth({ status: 'ready', user: session.user, csrfToken: session.csrfToken })
    } catch (requestError) {
      setAuth({ status: 'error', user: null, csrfToken: '' })
      setError(requestError.message || 'Could not connect to the PHP API.')
    }
  }

  useEffect(() => {
    let active = true

    requestJson('/api/auth/session.php')
      .then((session) => {
        if (active) {
          setAuth({ status: 'ready', user: session.user, csrfToken: session.csrfToken })
        }
      })
      .catch((requestError) => {
        if (active) {
          setAuth({ status: 'error', user: null, csrfToken: '' })
          setError(requestError.message || 'Could not connect to the PHP API.')
        }
      })

    return () => {
      active = false
    }
  }, [])

  async function handleLogin(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const result = await requestJson('/api/auth/login.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': auth.csrfToken,
        },
        body: JSON.stringify({ username, password }),
      })
      setAuth({ status: 'ready', user: result.user, csrfToken: result.csrfToken })
      setPassword('')
    } catch (requestError) {
      setError(requestError.message || 'Login failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLogout() {
    setError('')
    setSubmitting(true)

    try {
      const result = await requestJson('/api/auth/logout.php', {
        method: 'POST',
        headers: { 'X-CSRF-Token': auth.csrfToken },
      })
      setAuth({ status: 'ready', user: null, csrfToken: result.csrfToken })
      setPassword('')
    } catch (requestError) {
      setError(requestError.message || 'Could not sign out. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (auth.status === 'loading') {
    return (
      <main className="page-shell">
        <div className="loading-card" role="status">Connecting to JVGH Pharmacy…</div>
      </main>
    )
  }

  if (auth.user) {
    const roles = auth.user.roles || []
    const isAdmin = roles.includes('admin')

    if (isAdmin) {
      return <AdminDashboard user={auth.user} onLogout={handleLogout} submitting={submitting} />
    }

    return (
      <main className="page-shell">
        <header className="topbar">
          <a className="brand" href="/" aria-label="JVGH Pharmacy home">
            <span className="brand-mark" aria-hidden="true">+</span>
            <span>JVGH <strong>PHARMACY</strong></span>
          </a>
          <button className="text-button" type="button" onClick={handleLogout} disabled={submitting}>
            {submitting ? 'Signing out…' : 'Sign out'}
          </button>
        </header>

        <section className="welcome-panel">
          <div className="welcome-copy">
            <p className="eyebrow">PHARMACY INVENTORY SYSTEM</p>
            <h1>Welcome, {auth.user.fullName}</h1>
            <p className="welcome-description">
              You are signed in. Your account role determines which pharmacy tools you can use.
            </p>
          </div>
          <div className="role-card">
            <span className="role-card-label">SIGNED IN AS</span>
            <div className="role-list">
              {roles.map((role) => <span className="role-badge" key={role}>{roleTitle(role)}</span>)}
            </div>
            <p>{auth.user.username}</p>
          </div>
        </section>

        <section className="next-step-card">
          <div className="next-step-icon" aria-hidden="true">✓</div>
          <div>
            <h2>{isAdmin ? 'Administrator access' : 'Pharmacist access'}</h2>
            <p>
              {isAdmin
                ? 'Admin accounts are intended to manage users and the pharmacy system.'
                : 'Pharmacist accounts are intended to work with inventory and stock cards, without user management.'}
            </p>
            <p className="module-note">Login and role recognition are ready. Inventory and user-management screens are next.</p>
          </div>
        </section>

        {error && <p className="form-message form-message-error" role="alert">{error}</p>}
      </main>
    )
  }

  return (
    <main className="page-shell login-layout">
      <section className="login-intro" aria-label="Pharmacy inventory system">
        <a className="brand" href="/" aria-label="JVGH Pharmacy home">
          <span className="brand-mark" aria-hidden="true">+</span>
          <span>JVGH <strong>PHARMACY</strong></span>
        </a>
        <div className="intro-copy">
          <p className="eyebrow">PHARMACY INVENTORY SYSTEM</p>
          <h1>Better visibility for every stock movement.</h1>
          <p>Sign in to continue to the pharmacy inventory workspace.</p>
        </div>
        <div className="intro-footer">Secure access for authorized pharmacy staff</div>
      </section>

      <section className="login-panel">
        <div className="login-heading">
          <p className="eyebrow">WELCOME BACK</p>
          <h2>Sign in to your account</h2>
          <p>Use the username and password assigned to you.</p>
        </div>

        {error && <p className="form-message form-message-error" role="alert">{error}</p>}

        {auth.status === 'error' && (
          <button className="text-button retry-button" type="button" onClick={loadSession}>
            Retry connection
          </button>
        )}

        <form className="login-form" onSubmit={handleLogin}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <button className="submit-button" type="submit" disabled={submitting || !auth.csrfToken}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="login-note">Access is managed by your pharmacy system administrator.</p>
      </section>
    </main>
  )
}
