import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'

export default function Profile() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<any>(null)
  const phoneUrl = 'http://192.168.100.36:4173'
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(phoneUrl)}`

  useEffect(() => {
    const token = localStorage.getItem('health-link-token')
    fetch('/api/health/metrics', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setMetrics(data.metrics || null))
      .catch(() => setMetrics(null))
  }, [])

  return (
    <div className="page profile-page">
      <div className="hero-card">
        <h1>Profile</h1>
        <p>Account and health summary for {user?.name}</p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Basic info</h3>
          <div>Email: {user?.email}</div>
        </div>

        <div className="dashboard-card">
          <h3>Recent heart rate</h3>
          {metrics?.heartRate ? (
            <ul>
              {metrics.heartRate.map((m: any) => (
                <li key={m.date}>{m.date}: {m.value} bpm</li>
              ))}
            </ul>
          ) : (
            <div>No metrics yet</div>
          )}
        </div>

        <div className="dashboard-card profile-qr-card">
          <h3>Open Health Link on your phone</h3>
          <img className="profile-qr-code" src={qrCodeUrl} alt="QR code for opening Health Link on your phone" />
          <p className="profile-qr-url">{phoneUrl}</p>
          <p className="muted">Connect your phone to the same Wi-Fi, then scan this code.</p>
        </div>
      </div>
    </div>
  )
}
