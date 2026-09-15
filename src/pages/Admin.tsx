import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'

export default function Admin() {
  const { token } = useAuth()
  const [history, setHistory] = useState<any[]>([])
  const [tokens, setTokens] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [medications, setMedications] = useState<any[]>([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    setMsg('')
    try {
      const h = await fetch('/api/admin/sync/history', { headers: { Authorization: `Bearer ${token}` } })
      const ht = await h.json()
      setHistory(ht.history || [])
    } catch (e) {
      console.warn('Failed to load sync history', e)
    }
    try {
      const t = await fetch('/api/admin/oauth-tokens', { headers: { Authorization: `Bearer ${token}` } })
      const td = await t.json()
      setTokens(td.tokens || [])
    } catch (e) {
      console.warn('Failed to load oauth tokens', e)
    }
    try {
      const u = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
      const ud = await u.json()
      setUsers(ud.users || [])
    } catch (e) {
      console.warn('Failed to load users', e)
    }
    try {
      const m = await fetch('/api/health/medications', { headers: { Authorization: `Bearer ${token}` } })
      const md = await m.json()
      setMedications(md.medications || [])
    } catch (e) {
      console.warn('Failed to load medications', e)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [token])

  const trigger = async (userId: string) => {
    setMsg('Triggering sync...')
    try {
      const res = await fetch(`/api/admin/sync/${userId}/google-fit`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed')
      setMsg(`Imported ${data.imported} items for ${userId}`)
      load()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err))
    }
  }

  const revoke = async (userId: string, provider: string) => {
    try {
      const res = await fetch(`/api/admin/oauth/${userId}/${provider}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to revoke')
      setMsg('Revoked')
      load()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err))
    }
  }

  const setRole = async (userId: string, role: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed')
      setMsg(`Set role ${role} for ${userId}`)
      load()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err))
    }
  }

  const totalUsers = users.length
  const totalAdmins = users.filter((u) => u.role === 'admin').length
  const totalTokens = tokens.length
  const totalHistory = history.length
  const totalMedications = medications.length

  return (
    <div className="page admin-page">
      <div className="hero-card admin-hero">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Manage users, OAuth connectors, and sync history from one place.</p>
        </div>
        <div className="admin-hero-note">Use the actions below to keep your family health syncs up to date.</div>
      </div>

      <div className="admin-summary-grid">
        <div className="admin-summary-card">
          <span>Users</span>
          <strong>{totalUsers}</strong>
          <p>{totalAdmins} admins • {totalUsers - totalAdmins} members</p>
        </div>
        <div className="admin-summary-card">
          <span>Connections</span>
          <strong>{totalTokens}</strong>
          <p>Active token records for external providers</p>
        </div>
        <div className="admin-summary-card">
          <span>Sync events</span>
          <strong>{totalHistory}</strong>
          <p>Recent sync history entries</p>
        </div>
        <div className="admin-summary-card">
          <span>Pharmacy meds</span>
          <strong>{totalMedications}</strong>
          <p>Medication entries tracked for the household</p>
        </div>
      </div>

      {msg && <div className="status-message admin-status">{msg}</div>}

      {loading ? (
        <div className="loading">Loading admin data…</div>
      ) : (
        <div className="dashboard-grid admin-dashboard-grid">
          <div className="dashboard-card admin-card">
            <div className="card-header">
              <div>
                <h3>OAuth token management</h3>
                <p>Review and refresh connected health providers.</p>
              </div>
            </div>
            {tokens.length ? (
              <div className="table-wrapper">
                <table className="admin-table">
                  <thead><tr><th>User</th><th>Provider</th><th>Updated</th><th>Actions</th></tr></thead>
                  <tbody>
                    {tokens.map((t) => (
                      <tr key={`${t.userId}-${t.provider}`}>
                        <td>{t.userId}</td>
                        <td>{t.provider}</td>
                        <td>{t.updatedAt || t.updated_at || 'n/a'}</td>
                        <td className="admin-actions-cell">
                          <button className="btn btn-primary" onClick={() => trigger(t.userId)}>Refresh</button>
                          <button className="btn btn-danger" onClick={() => revoke(t.userId, t.provider)}>Revoke</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-state">No stored OAuth tokens. Connect a provider from Sync.</p>
            )}
          </div>

          <div className="dashboard-card admin-card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header">
              <div>
                <h3>Sync Activity</h3>
                <p>Track recent imports and automation status for your family.</p>
              </div>
            </div>
            {history.length ? (
              <div className="table-wrapper">
                <table className="admin-table history-table">
                  <thead><tr><th>Date</th><th>User</th><th>Provider</th><th>Status</th><th>Imported</th><th>Message</th></tr></thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id}>
                        <td>{new Date(h.createdAt).toLocaleString()}</td>
                        <td>{h.userId}</td>
                        <td>{h.provider}</td>
                        <td>{h.status}</td>
                        <td>{h.importedCount}</td>
                        <td>{h.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-state">No sync activity recorded yet.</p>
            )}
          </div>

          <div className="dashboard-card admin-card">
            <div className="card-header">
              <div>
                <h3>Pharmacy & medication overview</h3>
                <p>Keep track of prescription entries and refill cadence.</p>
              </div>
            </div>
            {medications.length ? (
              <div className="table-wrapper">
                <table className="admin-table">
                  <thead><tr><th>Name</th><th>Dose</th><th>Schedule</th></tr></thead>
                  <tbody>
                    {medications.map((med) => (
                      <tr key={med.id}>
                        <td>{med.name}</td>
                        <td>{med.dose || '—'}</td>
                        <td>{med.schedule || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-state">No pharmacy medication records yet.</p>
            )}
          </div>

          <div className="dashboard-card admin-card">
            <div className="card-header">
              <div>
                <h3>Users & roles</h3>
                <p>Grant and revoke admin access for family members.</p>
              </div>
            </div>
            {users.length ? (
              <div className="table-wrapper">
                <table className="admin-table">
                  <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td><span className={`role-badge ${u.role === 'admin' ? 'role-admin' : 'role-user'}`}>{u.role || 'user'}</span></td>
                        <td className="admin-actions-cell">
                          <button className="btn btn-secondary" onClick={() => setRole(u.id, 'admin')}>Make Admin</button>
                          <button className="btn btn-muted" onClick={() => setRole(u.id, 'user')}>Make User</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-state">No registered users found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
