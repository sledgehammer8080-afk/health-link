import { useEffect, useState, useRef } from 'react'

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [when, setWhen] = useState('08:00')
  const [repeatDaily, setRepeatDaily] = useState(true)
  const timers = useRef<any[]>([])

  const load = () => {
    fetch('/api/health/notifications', { headers: { Authorization: `Bearer ${localStorage.getItem('health-link-token')}` } })
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications || []))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    // schedule active notifications while page open
    timers.current.forEach((t) => clearTimeout(t))
    timers.current = []

    notifications.forEach((n) => {
      scheduleNotification(n)
    })

    return () => { timers.current.forEach((t) => clearTimeout(t)); timers.current = [] }
  }, [notifications])

  const scheduleNotification = (n: any) => {
    if (!('Notification' in window)) return
    const now = new Date()
    const [hh, mm] = (n.when || '08:00').split(':').map((s: string) => Number(s))
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0)
    if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1)
    const delay = next.getTime() - now.getTime()
    const id = setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification(n.title || 'Reminder')
      }
      if (n.repeatDaily) {
        scheduleNotification(n)
      } else {
        // non-repeating, optionally remove after firing
      }
    }, delay)
    timers.current.push(id)
  }

  const add = async (e: any) => {
    e.preventDefault()
    const res = await fetch('/api/health/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('health-link-token')}` }, body: JSON.stringify({ title, when, repeatDaily }) })
    if (res.ok) {
      setTitle('')
      setWhen('08:00')
      setRepeatDaily(true)
      load()
    }
  }

  const remove = async (id: string) => {
    await fetch(`/api/health/notifications/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('health-link-token')}` } })
    load()
  }

  const requestPermission = async () => {
    if (!('Notification' in window)) return alert('Notifications not supported in this browser')
    const p = await Notification.requestPermission()
    if (p !== 'granted') alert('Please allow notifications to receive reminders')
  }

  return (
    <div className="page notifications-page">
      <div className="hero-card">
        <h1>Notifications & Reminders</h1>
        <p>Schedule local reminders (browser must be open to deliver).</p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Add reminder</h3>
          <form onSubmit={add}>
            <label>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
            <label>Time</label>
            <input type="time" value={when} onChange={(e) => setWhen(e.target.value)} />
            <label><input type="checkbox" checked={repeatDaily} onChange={(e) => setRepeatDaily(e.target.checked)} /> Repeat daily</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="button" type="submit">Add</button>
              <button type="button" className="button button-secondary" onClick={requestPermission}>Enable Notifications</button>
            </div>
          </form>
        </div>

        <div className="dashboard-card">
          <h3>Scheduled reminders</h3>
          <ul>
            {notifications.map((n) => (
              <li key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>{n.title} — {n.when} {n.repeatDaily ? '(daily)' : ''}</div>
                <div><button className="button button-secondary" onClick={() => remove(n.id)}>Remove</button></div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
