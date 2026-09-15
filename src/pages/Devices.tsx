import { useEffect, useState } from 'react'

const providers = [
  { id: 'fitbit', name: 'Fitbit', status: 'Disconnected' },
  { id: 'garmin', name: 'Garmin', status: 'Disconnected' },
  { id: 'apple-health', name: 'Apple Health', status: 'Disconnected' },
]

function getDeviceIcon(device: { id?: string; name?: string }) {
  const deviceName = `${device.id || ''} ${device.name || ''}`.toLowerCase()
  if (deviceName.includes('apple')) return '⌚'
  if (deviceName.includes('garmin')) return '🏃'
  return '📱'
}

export default function Devices() {
  const [devices, setDevices] = useState<any[]>([])
  const [connecting, setConnecting] = useState('')

  const load = async () => {
    const token = localStorage.getItem('health-link-token')
    const res = await fetch('/api/health/devices', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    setDevices(data.devices || [])
  }

  useEffect(() => {
    load()
  }, [])

  const connect = async (provider: string) => {
    setConnecting(provider)
    const token = localStorage.getItem('health-link-token')
    const res = await fetch('/api/health/devices/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ provider }),
    })
    if (res.ok) {
      await load()
    }
    setConnecting('')
  }

  const disconnect = async (id: string) => {
    const token = localStorage.getItem('health-link-token')
    const res = await fetch(`/api/health/devices/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) await load()
  }

  return (
    <div className="page devices-page">
      <div className="hero-card">
        <h1>Health Devices</h1>
        <p>Connect wearable and health devices to sync activity, sleep, and vital data.</p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Available connections</h3>
          <ul className="feature-list">
            {providers.map((provider) => (
              <li key={provider.id} className="feature-row">
                <div>
                  <strong>{provider.name}</strong>
                  <p className="muted">Keep your workouts, sleep, and vitals in sync from {provider.name}.</p>
                </div>
                <button
                  className="button"
                  onClick={() => connect(provider.id)}
                  disabled={connecting === provider.id}
                >
                  {connecting === provider.id ? 'Connecting…' : 'Connect'}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="dashboard-card">
          <h3>Connected devices</h3>
          <ul className="feature-list">
            {devices.length === 0 ? (
              <li className="empty-state">No devices connected yet.</li>
            ) : (
              devices.map((device) => (
                <li key={device.id} className="feature-row">
                  <div className="device-details">
                    <span className="device-icon" aria-hidden="true">{getDeviceIcon(device)}</span>
                    <div>
                      <strong>{device.name}</strong>
                    <p className="muted">Status: {device.status} • Last sync {device.lastSynced}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className={`status-badge ${device.status === 'Connected' ? 'status-badge-success' : 'status-badge-warning'}`}>{device.status}</span>
                    <button className="button button-danger" onClick={() => disconnect(device.id)}>Disconnect</button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
