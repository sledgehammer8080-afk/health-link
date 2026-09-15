import { useEffect, useState } from 'react'

export default function Telehealth() {
  const [visits, setVisits] = useState<any[]>([])
  const [provider, setProvider] = useState('Dr. A. Mensah')
  const [date, setDate] = useState('2026-08-25')
  const [time, setTime] = useState('10:00')

  const loadVisits = async () => {
    const token = localStorage.getItem('health-link-token')
    const res = await fetch('/api/health/telehealth', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    setVisits(data.visits || [])
  }

  useEffect(() => {
    loadVisits()
  }, [])

  const book = async (e: any) => {
    e.preventDefault()
    const token = localStorage.getItem('health-link-token')
    const res = await fetch('/api/health/telehealth/book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ provider, date, time }),
    })
    if (res.ok) {
      await loadVisits()
    }
  }

  const cancelVisit = async (id: string) => {
    const token = localStorage.getItem('health-link-token')
    const res = await fetch(`/api/health/telehealth/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) loadVisits()
  }

  return (
    <div className="page telehealth-page">
      <div className="hero-card">
        <h1>Telehealth</h1>
        <p>Book virtual care visits and keep track of upcoming telehealth appointments.</p>
      </div>

      <div className="dashboard-grid telehealth-grid">
        <div className="dashboard-card telehealth-card">
          <h3>Book a visit</h3>
          <form onSubmit={book} className="stack-form">
            <label>Provider</label>
            <input value={provider} onChange={(e) => setProvider(e.target.value)} />
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <label>Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            <button className="button" type="submit">Book visit</button>
          </form>
        </div>

        <div className="dashboard-card telehealth-card">
          <h3>Upcoming telehealth visits</h3>
          {visits.length === 0 ? (
            <p className="empty-state">No visits scheduled.</p>
          ) : (
            <ul className="feature-list">
              {visits.map((visit) => (
                <li key={visit.id} className="feature-row telehealth-visit-row">
                  <div className="telehealth-visit-details">
                    <strong>{visit.provider}</strong>
                    <p className="muted">{visit.date} at {visit.time} • {visit.status}</p>
                  </div>
                  <div className="telehealth-visit-actions">
                    <span className="status-badge status-badge-success">{visit.status}</span>
                    <button className="button button-danger" onClick={() => cancelVisit(visit.id)}>Cancel</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
