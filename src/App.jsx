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
