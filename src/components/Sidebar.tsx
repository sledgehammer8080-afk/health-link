import SidebarItem from './SidebarItem'
import { useAuth } from '../auth/AuthProvider'
import { useState } from 'react'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/emergency', label: 'Emergency', icon: '🚑' },
  { path: '/activity', label: 'Activity', icon: '🏃' },
  { path: '/vitals', label: 'Vitals', icon: '❤️' },
  { path: '/sync', label: 'Sync', icon: '🔄' },
  { path: '/pharmacy', label: 'Pharmacy', icon: '💊' },
  { path: '/devices', label: 'Devices', icon: '📱' },
  { path: '/labs', label: 'Labs', icon: '🧪' },
  { path: '/insurance', label: 'Insurance', icon: '🛡️' },
  { path: '/telehealth', label: 'Telehealth', icon: '💬' },
  { path: '/medications', label: 'Medications', icon: '🩺' },
  { path: '/notifications', label: 'Reminders', icon: '⏰' },
  { path: '/profile', label: 'Profile', icon: '👤' },
]

export default function Sidebar() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <aside className="sidebar">
      <button
        className="sidebar-toggle"
        type="button"
        aria-label="Navigation"
        aria-expanded={isOpen}
        aria-controls="health-link-navigation"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="menu-icon" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      <div id="health-link-navigation" className={`sidebar-panel${isOpen ? ' is-open' : ''}`}>
        <div className="sidebar-card">
          <div className="sidebar-user">
            <span className="sidebar-user-avatar">{user?.name?.charAt(0) || 'H'}</span>
            <div>
              <p className="sidebar-user-name">{user?.name || 'Health Link User'}</p>
              <p className="sidebar-user-email">{user?.email || 'not signed in'}</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-card sidebar-nav-card" aria-label="Primary navigation">
          <p className="sidebar-heading">Navigation</p>
          <div className="sidebar-nav">
            {navItems.map((item) => (
              <SidebarItem key={item.path} path={item.path} label={item.label} icon={item.icon} onNavigate={() => setIsOpen(false)} />
            ))}
            {user && (user.email === 'family@health.link' || user.id === '1') && (
              <SidebarItem path="/admin" label="Admin" icon="⚙️" onNavigate={() => setIsOpen(false)} />
            )}
          </div>
        </nav>
      </div>
    </aside>
  )
}
