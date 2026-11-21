import { useEffect, useState } from 'react'
import { requestJson, roleTitle } from '../services/api.js'
import './UserManagement.css'

function getEditUserIdFromPath() {
  const match = window.location.pathname.match(/^\/user-management\/([^/]+)\/edit\/?$/)
  return match ? decodeURIComponent(match[1]) : null
}

export default function UserManagement({ csrfToken, onUserUpdated }) {
  const [users, setUsers] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [editingUser, setEditingUser] = useState(null)
  const [userFormOpen, setUserFormOpen] = useState(false)
  const [form, setForm] = useState({ fullName: '', positionTitle: '', username: '', password: '', role: 'pharmacist', isActive: true })
  const [formError, setFormError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [savingUser, setSavingUser] = useState(false)
  const [routeEditUserId, setRouteEditUserId] = useState(getEditUserIdFromPath)

  async function loadUsers() {
    setLoadingUsers(true)
    setLoadError('')
    try {
      const result = await requestJson('/api/users/index.php')
      setUsers(result.users || [])
    } catch (error) {
      setLoadError(error.message || 'Could not load users.')
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    function syncEditRoute() {
      setRouteEditUserId(getEditUserIdFromPath())
    }
    window.addEventListener('popstate', syncEditRoute)
    return () => window.removeEventListener('popstate', syncEditRoute)
  }, [])

  useEffect(() => {
    if (!routeEditUserId) {
      setUserFormOpen(false)
      setEditingUser(null)
      return
    }
    const user = users.find((entry) => String(entry.id) === routeEditUserId)
    if (user) openForm(user)
  }, [routeEditUserId, users])

  function openForm(user = null) {
    setEditingUser(user)
    setUserFormOpen(true)
    setForm(user
      ? { fullName: user.fullName, positionTitle: user.positionTitle || '', username: user.username, password: '', role: user.role, isActive: user.isActive }
      : { fullName: '', positionTitle: '', username: '', password: '', role: 'pharmacist', isActive: true })
    setFormError('')
  }

  function openEditRoute(user) {
    const userId = String(user.id)
    window.history.pushState(
      { ...(window.history.state || {}), section: 'user-management', editUserId: userId },
      '',
      `/user-management/${encodeURIComponent(userId)}/edit`,
    )
    setRouteEditUserId(userId)
    openForm(user)
  }

  function closeForm() {
    if (routeEditUserId) {
      if (window.history.state?.editUserId === routeEditUserId) {
        window.history.back()
      } else {
        window.history.replaceState({ section: 'user-management' }, '', '/user-management')
      }
      setRouteEditUserId(null)
    }
    setUserFormOpen(false)
    setEditingUser(null)
  }

  async function saveUser(event) {
    event.preventDefault()
    setFormError('')
    if (!form.fullName.trim() || !form.username.trim()) {
      setFormError('Enter the userâ€™s full name and username.')
      return
    }
    if ((!editingUser || form.password) && form.password.length < 8) {
      setFormError('Password must be at least 8 characters.')
      return
    }

    setSavingUser(true)
    try {
      const payload = { fullName: form.fullName.trim(), positionTitle: form.positionTitle.trim().toLocaleUpperCase(), username: form.username.trim(), role: form.role, isActive: form.isActive }
      if (form.password) payload.password = form.password
      const result = await requestJson(editingUser ? '/api/users/update.php' : '/api/users/create.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify(editingUser ? { ...payload, id: editingUser.id } : payload),
      })
      onUserUpdated?.(result.user)
      closeForm()
      if (!editingUser && result.user) setSelectedId(result.user.id)
      await loadUsers()
    } catch (error) {
      setFormError(error.message || 'Could not save the user account.')
    } finally {
      setSavingUser(false)
    }
  }

  async function deleteUser(user) {
    if (!window.confirm(`Delete ${user.fullName} (${user.username})?`)) return
    try {
      await requestJson('/api/users/delete.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ id: user.id }),
      })
      if (selectedId === user.id) setSelectedId(null)
      await loadUsers()
    } catch (error) {
      setLoadError(error.message || 'Could not delete the user account.')
    }
  }

  return (
    <div className="section-page-content user-management-page">
      <div className="user-page-heading"><div><span className="ledger-kicker">WORKSPACE / USER MANAGEMENT</span><h2>Users and roles</h2><p>Manage staff accounts and their assigned access.</p></div><button className="add-user-button" type="button" onClick={() => openForm()}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12" /></svg><span>Add user</span></button></div>
      <div className="user-summary-row"><article><span>ALL USERS</span><strong>{users.length.toString().padStart(2, '0')}</strong></article><article><span>ADMINS</span><strong>{users.filter((user) => user.role === 'admin').length.toString().padStart(2, '0')}</strong></article><article><span>PHARMACISTS</span><strong>{users.filter((user) => user.role === 'pharmacist').length.toString().padStart(2, '0')}</strong></article></div>
      <section className="dashboard-card users-table-card">
        <div className="users-table-heading"><div><h3>Staff accounts</h3><p>Select a row to highlight an account. Passwords are never displayed.</p></div><span className="section-pill">PHARMA_INVENTORY</span></div>
        {loadError && <p className="users-load-error" role="alert">{loadError}</p>}
        <div className="users-table-scroll"><table className="users-table"><thead><tr><th>USER ID</th><th>FULL NAME</th><th>POSITION / TITLE</th><th>USERNAME</th><th>ROLE</th><th>STATUS</th><th>CREATED AT</th><th className="users-actions-heading">ACTIONS</th></tr></thead><tbody>
          {users.map((user) => <tr key={user.id} className={selectedId === user.id ? 'selected-user-row' : ''} aria-selected={selectedId === user.id} onClick={() => setSelectedId(user.id)} tabIndex="0" onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedId(user.id) }}>
            <td className="user-id-cell">{user.id.toString().padStart(3, '0')}</td><td><strong className="user-full-name">{user.fullName}</strong></td><td>{user.positionTitle || '—'}</td><td className="username-cell">{user.username}</td><td><span className={`user-role-badge ${user.role === 'admin' ? 'admin-role' : 'pharmacist-role'}`}>{roleTitle(user.role)}</span></td><td><span className={`user-status ${user.isActive ? 'user-active' : 'user-inactive'}`}><i />{user.isActive ? 'Active' : 'Inactive'}</span></td><td className="user-created-cell">{user.createdAt ? new Date(user.createdAt.replace(' ', 'T')).toLocaleDateString() : 'â€”'}</td><td><div className="user-row-actions"><button type="button" onClick={(event) => { event.stopPropagation(); openEditRoute(user) }}>Edit</button><button type="button" className="delete-user-action" onClick={(event) => { event.stopPropagation(); deleteUser(user) }}>Delete</button></div></td>
          </tr>)}
          {loadingUsers && <tr><td className="users-empty-state" colSpan="8">Loading user accountsâ€¦</td></tr>}
          {!loadingUsers && users.length === 0 && <tr><td className="users-empty-state" colSpan="8">No user accounts found. Add a user to get started.</td></tr>}
        </tbody></table></div>
        <div className="users-table-footer">{selectedId ? `Selected user ID ${selectedId}` : 'Select a user row to highlight it'}<span>Showing {users.length} account{users.length === 1 ? '' : 's'}</span></div>
      </section>

      {userFormOpen && <div className="user-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm() }}>
        <section className="user-modal" role="dialog" aria-modal="true" aria-labelledby="user-form-title">
          <div className="user-modal-heading"><div><span className="ledger-kicker">USER ACCOUNT</span><h2 id="user-form-title">{editingUser ? 'Edit user' : 'Add user'}</h2></div></div>
          <form className="user-form" onSubmit={saveUser}>
            <label>Full name<input autoFocus value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} placeholder="e.g. Juan Dela Cruz" /></label>
            <label>Position / title<input value={form.positionTitle} onChange={(event) => setForm((current) => ({ ...current, positionTitle: event.target.value.toLocaleUpperCase() }))} placeholder="e.g. PHARMACIST I" maxLength="100" /></label>
            <label>Username<input autoCapitalize="none" value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} placeholder="e.g. juan.delacruz" /></label>
            <label>{editingUser ? 'New password (optional)' : 'Password'}<input type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder={editingUser ? 'Leave blank to keep current password' : 'At least 8 characters'} /></label>
            <label>Role<select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}><option value="admin">Admin</option><option value="pharmacist">Pharmacist</option></select></label>
            <label className="user-active-toggle"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} /> Active account</label>
            {formError && <p className="user-form-error" role="alert">{formError}</p>}
            <p className="user-form-note">Passwords are hashed before they are stored. The password is never displayed.</p>
            <div className="user-form-actions"><button type="button" className="cancel-user-button" onClick={closeForm} disabled={savingUser}>Cancel</button><button type="submit" className="add-user-button" disabled={savingUser}>{savingUser ? 'Savingâ€¦' : editingUser ? 'Save changes' : 'Add user'}</button></div>
          </form>
        </section>
      </div>}
    </div>
  )
}

