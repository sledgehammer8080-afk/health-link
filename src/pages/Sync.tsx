import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'

export default function Sync() {
  const { token } = useAuth()
  const [status, setStatus] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [googleFitStatus, setGoogleFitStatus] = useState<{ connected: boolean; lastSync: string | null; tokenUpdatedAt: string | null } | null>(null)

  const doGoogleFit = async () => {
    setStatus('Connecting to Google Fit...')
    setMessage(null)
    try {
      const res = await fetch('/api/auth/google-fit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.message || 'Google Fit not configured')
      }
      const data = await res.json()
      if (!data.url) throw new Error('Missing redirect URL')
      window.location.href = data.url
    } catch (err) {
      if (err instanceof Error) setMessage(err.message)
      else setMessage(String(err))
      setStatus(null)
    }
  }

  const syncGoogleFitNow = async () => {
    setStatus('Syncing saved Google Fit connection...')
    setMessage(null)
    try {
      const res = await fetch('/api/health/sync/google-fit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Google Fit sync failed')
      }
      setStatus(`Imported ${data.imported} records from Google Fit.`)
      loadHistory()
      loadGoogleFitStatus()
    } catch (err) {
      if (err instanceof Error) setMessage(err.message)
      else setMessage(String(err))
      setStatus(null)
    }
  }

  const loadGoogleFitStatus = async () => {
    try {
      const res = await fetch('/api/health/sync/google-fit/status', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const data = await res.json()
      setGoogleFitStatus(data)
    } catch {
      setGoogleFitStatus(null)
    }
  }

  const disconnectGoogleFit = async () => {
    setStatus('Disconnecting Google Fit...')
    setMessage(null)
    try {
      const res = await fetch('/api/health/sync/google-fit', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.message || 'Disconnect failed')
      }
      setStatus('Google Fit disconnected.')
      setGoogleFitStatus({ connected: false, lastSync: null, tokenUpdatedAt: null })
      loadHistory()
    } catch (err) {
      if (err instanceof Error) setMessage(err.message)
      else setMessage(String(err))
      setStatus(null)
    }
  }

  const doFHIRExport = async () => {
    setStatus('Preparing FHIR export...')
    setMessage(null)
    try {
      const res = await fetch('/api/health/fhir/export', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.message || 'FHIR export failed')
      }
      const bundle = await res.json()
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'health-fhir-bundle.json'
      a.click()
      URL.revokeObjectURL(url)
      setStatus('FHIR export complete')
    } catch (err) {
      if (err instanceof Error) setMessage(err.message)
      else setMessage(String(err))
      setStatus(null)
    }
  }

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/health/sync/history', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const data = await res.json()
      setHistory(data.history || [])
    } catch {
      setHistory([])
    }
  }

  useEffect(() => {
    loadHistory()
    loadGoogleFitStatus()
  }, [token])

  return (
    <div className="page sync-page">
      <div className="hero-card">
        <h1>Sync</h1>
        <p>Connect your health platforms and export standardized medical data.</p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="sync-card-header">
            <div className="sync-card-title-row">
              <h3>
                <span
                  className={`sync-card-icon ${googleFitStatus ? (googleFitStatus.connected ? 'status-ok' : 'status-warning') : ''}`}
                  aria-label={googleFitStatus ? (googleFitStatus.connected ? 'Connected' : 'Not connected') : 'Loading status'}
                ></span>
                Google Fit import
              </h3>
              {googleFitStatus?.lastSync ? (
                <span className="sync-last-sync">Last sync: {new Date(googleFitStatus.lastSync).toLocaleString()}</span>
              ) : null}
            </div>
            <span
              className={`sync-card-status ${googleFitStatus ? (googleFitStatus.connected ? 'status-ok' : 'status-warning') : 'status-loading'}`}
            >
              {googleFitStatus ? (
                googleFitStatus.connected ? '✅ Connected' : '⚠️ Not connected'
              ) : (
                '⏳ Loading status…'
              )}
            </span>
          </div>
          <p>Connect Google Fit to pull workout and vital sign data into Health Link.</p>
          <div className="sync-status-block">
            {googleFitStatus ? (
              googleFitStatus.connected ? (
                <div className="sync-status-details">
                  <span className="status-badge status-badge-success">Connected</span>
                  <p className="status-line">Last sync: {googleFitStatus.lastSync ? new Date(googleFitStatus.lastSync).toLocaleString() : 'Never'}</p>
                  <p className="status-line">Token last updated: {googleFitStatus.tokenUpdatedAt ? new Date(googleFitStatus.tokenUpdatedAt).toLocaleString() : 'Unknown'}</p>
                </div>
              ) : (
                <div className="sync-status-details">
                  <span className="status-badge status-badge-warning">Not connected</span>
                </div>
              )
            ) : (
              <div className="sync-status-details">
                <span className="status-badge">Loading status…</span>
              </div>
            )}
          </div>
          <div className="button-row button-row-start">
            <button className="button button-pill" onClick={doGoogleFit}>Connect Google Fit</button>
            <button className="button button-secondary button-pill" onClick={syncGoogleFitNow}>
              Sync saved Google Fit
            </button>
            <button className="button button-secondary button-pill" onClick={loadGoogleFitStatus}>
              Refresh status
            </button>
            {googleFitStatus?.connected && (
              <button className="button button-danger button-pill" onClick={disconnectGoogleFit}>
                Disconnect
              </button>
            )}
          </div>
        </div>

        <div className="dashboard-card">
          <h3>Apple Health import</h3>
          <p>Import Apple Health data from a HealthKit export JSON payload.</p>
          <p>Use a mobile client or copy/paste a HealthKit export payload to import vitals.</p>
          <label className="button button-pill" htmlFor="applePayload">Upload HealthKit JSON</label>
          <input
            id="applePayload"
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (!file) return
              const text = await file.text()
              try {
                const payload = JSON.parse(text)
                const response = await fetch('/api/health/sync/apple', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify(payload),
                })
                const data = await response.json()
                if (!response.ok) throw new Error(data.message || 'Apple Health import failed')
                setStatus(`Imported ${data.imported} records from Apple Health.`)
              } catch (err) {
                if (err instanceof Error) setMessage(err.message)
                else setMessage(String(err))
                setStatus(null)
              }
            }}
          />
        </div>

        <div className="dashboard-card">
          <h3>FHIR export</h3>
          <p>Download current vitals as a FHIR Bundle for clinical transfer.</p>
          <div className="button-row button-row-start">
            <button className="button button-pill" onClick={doFHIRExport}>Export FHIR Bundle</button>
          </div>
        </div>
      </div>

      {status && <div className="status-message">{status}</div>}
      {message && <div className="error-message">{message}</div>}

      <div className="dashboard-card" style={{ gridColumn: '1 / -1' }}>
        <h3>Sync history</h3>
        {history.length ? (
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Provider</th>
                <th>Status</th>
                <th>Imported</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.createdAt).toLocaleString()}</td>
                  <td>{item.provider}</td>
                  <td>{item.status}</td>
                  <td>{item.importedCount}</td>
                  <td>{item.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No sync history yet.</p>
        )}
      </div>
    </div>
  )
}
