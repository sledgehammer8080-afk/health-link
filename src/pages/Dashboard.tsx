import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

type Task = {
  id: string
  title: string
  status: string
}

type Appointment = {
  id: string
  date: string
  time: string
  provider: string
  type: string
}

function getDeviceIcon(device: { id?: string; name?: string }) {
  const deviceName = `${device.id || ''} ${device.name || ''}`.toLowerCase()
  if (deviceName.includes('apple')) return '⌚'
  if (deviceName.includes('garmin')) return '🏃'
  return '📱'
}

function getTaskStatusIcon(status: string) {
  const normalizedStatus = status.toLowerCase()
  if (normalizedStatus === 'completed' || normalizedStatus === 'done') return '✅'
  if (normalizedStatus === 'in progress' || normalizedStatus === 'in-progress') return '🔄'
  return '📋'
}

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [pharmacyOrders, setPharmacyOrders] = useState<any[]>([])
  const [devices, setDevices] = useState<any[]>([])
  const [labs, setLabs] = useState<any[]>([])
  const [insuranceSummary, setInsuranceSummary] = useState<any>(null)
  const [insuranceClaims, setInsuranceClaims] = useState<any[]>([])
  const [telehealthVisits, setTelehealthVisits] = useState<any[]>([])
  const [syncStatus, setSyncStatus] = useState<{ connected: boolean; lastSync: string | null; tokenUpdatedAt: string | null }>({ connected: false, lastSync: null, tokenUpdatedAt: null })
  const [loading, setLoading] = useState(true)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('health-link-token')
    const headers = { Authorization: `Bearer ${token}` }

    async function loadDashboard() {
      setLoading(true)
      try {
        const [tasksData, appointmentsData, notificationsData, pharmacyData, devicesData, labsData, insuranceData, telehealthData, syncData] = await Promise.all([
          fetch('/api/health/tasks', { headers }).then((res) => res.json()),
          fetch('/api/health/appointments', { headers }).then((res) => res.json()),
          fetch('/api/health/notifications', { headers }).then((res) => res.json()),
          fetch('/api/pharmacy/orders', { headers }).then((res) => res.json()),
          fetch('/api/health/devices', { headers }).then((res) => res.json()),
          fetch('/api/health/labs', { headers }).then((res) => res.json()),
          fetch('/api/health/insurance', { headers }).then((res) => res.json()),
          fetch('/api/health/telehealth', { headers }).then((res) => res.json()),
          fetch('/api/health/sync/google-fit/status', { headers }).then((res) => res.json()),
        ])

        setTasks(tasksData || [])
        setAppointments(appointmentsData || [])
        setNotifications(notificationsData.notifications || [])
        setPharmacyOrders(pharmacyData.orders || [])
        setDevices(devicesData.devices || [])
        setLabs(labsData.labs || [])
        setInsuranceSummary(insuranceData.summary || null)
        setInsuranceClaims(insuranceData.claims || [])
        setTelehealthVisits(telehealthData.visits || [])
        setSyncStatus({
          connected: Boolean(syncData.connected),
          lastSync: syncData.lastSync || null,
          tokenUpdatedAt: syncData.tokenUpdatedAt || null,
        })
      } catch (error) {
        console.error('Dashboard load failed', error)
        setTasks([])
        setAppointments([])
        setNotifications([])
        setPharmacyOrders([])
        setDevices([])
        setLabs([])
        setInsuranceSummary(null)
        setInsuranceClaims([])
        setTelehealthVisits([])
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const pendingClaims = insuranceClaims.filter((claim) => claim.status === 'Pending').length
  const healthScore = Math.max(
    0,
    Math.min(
      100,
      60
        + (devices.length ? 10 : -5)
        + (notifications.length ? 5 : -10)
        + (pendingClaims ? -5 : 10)
        + (telehealthVisits.length ? 5 : 0)
        + (syncStatus.connected ? 10 : -20)
        + (syncStatus.lastSync ? 10 : -10),
    ),
  )
  const healthLabel = healthScore >= 80 ? 'Strong' : healthScore >= 60 ? 'Balanced' : 'Needs attention'
  const healthMessage = healthScore >= 80
    ? 'Your household health coordination is in great shape.'
    : healthScore >= 60
    ? 'Some areas can improve, but overall things are stable.'
    : 'Consider reviewing low activity or pending care items.'

  return (
    <div className="page dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Welcome back, {user?.name || 'family member'}.</h1>
          <p>Here is your health coordination board.</p>
        </div>

        <div className="dashboard-header-actions">
          <div className="dashboard-profile-pill">
            <span className="sidebar-user-avatar dashboard-profile-avatar">{user?.name?.charAt(0) || 'H'}</span>
            <div>
              <small>Profile</small>
              <strong>{user?.name || 'Family Member'}</strong>
            </div>
          </div>

          <div className={`dashboard-score-inline ${healthScore >= 80 ? 'score-good' : healthScore >= 60 ? 'score-ok' : 'score-low'}`}>
            <span className="dashboard-score-value">{healthScore}</span>
            <div>
              <small>Family score</small>
              <strong>{healthLabel}</strong>
            </div>
          </div>

          <button className="button button-secondary" onClick={() => { signOut(); navigate('/login') }}>
            Sign out
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading dashboard…</div>
      ) : (
        <div className="dashboard-grid">
          <section className="dashboard-card quick-actions-card">
            <h2>Quick actions</h2>
            <div className="quick-actions-grid">
              <button className="quick-action-card" onClick={() => navigate('/pharmacy')}>
                <span className="quick-action-icon" aria-hidden="true">💊</span>
                <span><strong>Order from Pharmacy</strong><small>Refill or track medication</small></span>
                <span className="quick-action-arrow" aria-hidden="true">→</span>
              </button>
              <button className="quick-action-card" onClick={() => navigate('/devices')}>
                <span className="quick-action-icon" aria-hidden="true">📱</span>
                <span><strong>Connect a Device</strong><small>Sync a health tracker</small></span>
                <span className="quick-action-arrow" aria-hidden="true">→</span>
              </button>
              <button className="quick-action-card" onClick={() => navigate('/labs')}>
                <span className="quick-action-icon" aria-hidden="true">🧪</span>
                <span><strong>Add Lab Result</strong><small>Record a new result</small></span>
                <span className="quick-action-arrow" aria-hidden="true">→</span>
              </button>
              <button className="quick-action-card" onClick={() => navigate('/insurance')}>
                <span className="quick-action-icon" aria-hidden="true">🛡️</span>
                <span><strong>File a Claim</strong><small>Submit insurance details</small></span>
                <span className="quick-action-arrow" aria-hidden="true">→</span>
              </button>
              <button className="quick-action-card" onClick={() => navigate('/telehealth')}>
                <span className="quick-action-icon" aria-hidden="true">💬</span>
                <span><strong>Book Telehealth</strong><small>Schedule virtual care</small></span>
                <span className="quick-action-arrow" aria-hidden="true">→</span>
              </button>
              <button className="quick-action-card" onClick={() => navigate('/medications')}>
                <span className="quick-action-icon" aria-hidden="true">🩺</span>
                <span><strong>Manage Medications</strong><small>Review your medicines</small></span>
                <span className="quick-action-arrow" aria-hidden="true">→</span>
              </button>
            </div>
          </section>

          <section className="dashboard-card sync-summary-card">
            <h2>Sync status</h2>
            <div>
              <p><strong>{syncStatus.connected ? 'Connected' : 'Disconnected'}</strong></p>
              <p>Last sync: {syncStatus.lastSync || 'never'}</p>
              <p>Token refreshed: {syncStatus.tokenUpdatedAt || 'not available'}</p>
            </div>
          </section>

          <section className="dashboard-card health-score-card">
            <h2>Family health score</h2>
            <div className="health-score-display">
              <span className={`score-badge ${healthScore >= 80 ? 'score-good' : healthScore >= 60 ? 'score-ok' : 'score-low'}`}>
                {healthScore}
              </span>
              <div>
                <p className="health-score-label">{healthLabel}</p>
                <p>{healthMessage}</p>
              </div>
            </div>
          </section>

          <section className="dashboard-card">
            <h2>Upcoming appointments</h2>
            {appointments.length ? (
              <ul>
                {appointments.map((appointment) => (
                  <li key={appointment.id}>
                    <strong>{appointment.date} @ {appointment.time}</strong>
                    <div>{appointment.provider}</div>
                    <div>{appointment.type}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No upcoming appointments yet.</p>
            )}
          </section>

          <section className="dashboard-card">
            <h2>Reminders</h2>
            {notifications.length ? (
              <ul>
                {notifications.map((n) => (
                  <li key={n.id} className="dashboard-list-item">
                    <span className="list-item-icon" aria-hidden="true">⏰</span>
                    <span>{n.title} — {n.when}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No reminders.</p>
            )}
          </section>

          <section className="dashboard-card">
            <h2>Pharmacy orders</h2>
            {pharmacyOrders.length ? (
              <ul>
                {pharmacyOrders.slice(0, 3).map((order) => (
                  <li key={order.id}>
                    <span className="dashboard-list-item-title">
                      <span className="list-item-icon" aria-hidden="true">💊</span>
                      <strong>{order.name}</strong>
                    </span>
                    <div>{order.quantity} × {order.dose} • {order.price}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No pharmacy orders yet.</p>
            )}
          </section>

          <section className="dashboard-card">
            <h2>Connected devices</h2>
            {devices.length ? (
              <ul>
                {devices.map((device) => (
                  <li key={device.id}>
                    <span className="dashboard-list-item-title">
                      <span className="list-item-icon" aria-hidden="true">{getDeviceIcon(device)}</span>
                      <strong>{device.name}</strong>
                    </span>
                    <div>{device.status} • Last sync {device.lastSynced}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No devices connected.</p>
            )}
          </section>

          <section className="dashboard-card">
            <h2>Recent labs</h2>
            {labs.length ? (
              <ul>
                {labs.slice(0, 3).map((lab) => (
                  <li key={lab.id}>
                    <strong>{lab.name}</strong>
                    <div>{lab.value}{lab.unit ? ` ${lab.unit}` : ''} — {lab.provider}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No lab results yet.</p>
            )}
          </section>

          <section className="dashboard-card">
            <h2>Insurance overview</h2>
            {insuranceSummary ? (
              <div>
                <p><strong>{insuranceSummary.planName}</strong> • {insuranceSummary.provider}</p>
                <p>Status: {insuranceSummary.status}</p>
                <p>{insuranceClaims.filter((claim) => claim.status === 'Pending').length} pending claim(s)</p>
              </div>
            ) : (
              <p>No insurance data available.</p>
            )}
          </section>

          <section className="dashboard-card">
            <h2>Telehealth visits</h2>
            {telehealthVisits.length ? (
              <ul>
                {telehealthVisits.map((visit) => (
                  <li key={visit.id}>
                    <span className="dashboard-list-item-title">
                      <span className="list-item-icon" aria-hidden="true">💬</span>
                      <strong>{visit.provider}</strong>
                    </span>
                    <div>{visit.date} at {visit.time} • {visit.status}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No telehealth visits scheduled.</p>
            )}
          </section>

          <section className="dashboard-card">
            <h2>Task progress</h2>
            {tasks.length ? (
              <ul>
                {tasks.map((task) => (
                  <li key={task.id}>
                    <strong>{task.title}</strong>
                    <div className="dashboard-list-item">
                      <span className="list-item-icon" aria-hidden="true">{getTaskStatusIcon(task.status)}</span>
                      <span>Status: {task.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No tasks available.</p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
