import { useEffect, useState } from 'react'
import ActivityRings from '../components/ActivityRings'

export default function Activity() {
  const [rings, setRings] = useState({ move: 0.5, exercise: 0.3, stand: 0.6 })
  const [workouts, setWorkouts] = useState<any[]>([])

  useEffect(() => {
    const token = localStorage.getItem('health-link-token')
    fetch('/api/health/activity', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        setRings(data.rings || rings)
        setWorkouts(data.workouts || [])
      })
      .catch(() => {})
  }, [])

  return (
    <div className="page activity-page">
      <div className="hero-card">
        <h1>Activity</h1>
        <p>Your activity rings and recent workouts.</p>
      </div>

      <div className="activity-section">
        <ActivityRings move={rings.move} exercise={rings.exercise} stand={rings.stand} />

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3>Recent Workouts</h3>
            <ul>
              {workouts.map((w) => (
                <li key={w.id}>{w.date} — {w.type} — {w.durationMins} mins — {w.calories} kcal</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
