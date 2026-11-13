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

const sampleInventory = [
  { name: 'Amoxicillin 500 mg', category: 'Antibiotic', stock: 18, unit: 'boxes', status: 'Low stock' },
  { name: 'Paracetamol 500 mg', category: 'Analgesic', stock: 42, unit: 'boxes', status: 'Reorder soon' },
  { name: 'Cetirizine 10 mg', category: 'Antihistamine', stock: 9, unit: 'boxes', status: 'Low stock' },
  { name: 'Omeprazole 20 mg', category: 'Gastrointestinal', stock: 64, unit: 'boxes', status: 'In stock' },
]

const sampleActivity = [
  { action: 'Stock received', item: 'Paracetamol 500 mg', detail: 'Added 24 boxes', time: 'Today, 9:42 AM', mark: '+' },
  { action: 'Low stock alert', item: 'Cetirizine 10 mg', detail: '9 boxes remaining', time: 'Today, 8:15 AM', mark: '!' },
  { action: 'Stock issued', item: 'Omeprazole 20 mg', detail: 'Issued 6 boxes', time: 'Yesterday, 4:30 PM', mark: '−' },
]

function AdminDashboard({ user, onLogout, submitting }) {
  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <a className="brand dashboard-brand" href="/" aria-label="JVGH Pharmacy home">
          <span className="brand-mark" aria-hidden="true">+</span>
          <span>JVGH <strong>PHARMACY</strong></span>
        </a>
        <p className="sidebar-caption">WORKSPACE</p>
        <nav className="sidebar-nav" aria-label="Admin navigation">
          <a className="sidebar-link active" href="#overview"><span>▦</span> Overview</a>
          <a className="sidebar-link" href="#inventory"><span>▤</span> Inventory <small>Sample</small></a>
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
          <div><p className="eyebrow">PHARMACY INVENTORY SYSTEM</p><h1>Dashboard</h1></div>
          <div className="dashboard-header-actions"><span className="sample-indicator"><i /> Sample data</span><button className="text-button" type="button" onClick={onLogout} disabled={submitting}>{submitting ? 'Signing out…' : 'Sign out'}</button></div>
        </header>

        <div className="dashboard-welcome"><div><h2>Good day, {user.fullName?.split(' ')[0] || 'Admin'}</h2><p>Here’s what’s happening with your pharmacy today.</p></div><span className="dashboard-date">JVGH PHARMACY · ADMIN</span></div>

        <section className="metric-grid" aria-label="Sample inventory summary">
          <article className="metric-card"><div className="metric-label">TOTAL MEDICINES <span className="metric-icon green">▤</span></div><strong>248</strong><p><span className="metric-positive">+12</span> this month</p></article>
          <article className="metric-card"><div className="metric-label">LOW STOCK ITEMS <span className="metric-icon amber">!</span></div><strong>08</strong><p><span className="metric-warning">Needs attention</span></p></article>
          <article className="metric-card"><div className="metric-label">EXPIRING SOON <span className="metric-icon blue">◷</span></div><strong>03</strong><p>Within the next 90 days</p></article>
          <article className="metric-card"><div className="metric-label">STOCK MOVEMENTS <span className="metric-icon violet">↗</span></div><strong>36</strong><p>Recorded this month</p></article>
        </section>

        <div className="dashboard-content-grid">
          <section className="dashboard-card inventory-card" id="inventory">
            <div className="card-heading"><div><h2>Stock watch</h2><p>Items that may need a reorder</p></div><a href="#inventory">View inventory <span>→</span></a></div>
            <div className="table-wrap"><table><thead><tr><th>MEDICINE</th><th>CATEGORY</th><th>ON HAND</th><th>STATUS</th></tr></thead><tbody>{sampleInventory.map((item) => <tr key={item.name}><td><strong>{item.name}</strong></td><td>{item.category}</td><td>{item.stock} {item.unit}</td><td><span className={`stock-status ${item.status === 'Low stock' ? 'status-low' : item.status === 'Reorder soon' ? 'status-soon' : 'status-ok'}`}><i />{item.status}</span></td></tr>)}</tbody></table></div>
          </section>

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
