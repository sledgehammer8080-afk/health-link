import { Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import NotFound from './pages/NotFound'
import Vitals from './pages/Vitals'
import Activity from './pages/Activity'
import Profile from './pages/Profile'
import Sync from './pages/Sync'
import SyncResult from './pages/SyncResult'
import Medications from './pages/Medications'
import Notifications from './pages/Notifications'
import OAuthCallback from './pages/OAuthCallback'
import Admin from './pages/Admin'
import Pharmacy from './pages/Pharmacy'
import Devices from './pages/Devices'
import Labs from './pages/Labs'
import Insurance from './pages/Insurance'
import Telehealth from './pages/Telehealth'
import Emergency from './pages/Emergency'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import { useAuth } from './auth/AuthProvider'

function App() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const publicRoute = pathname === '/' || pathname === '/login' || pathname === '/signup' || pathname === '/auth/callback'

  const routes = (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/vitals" element={<ProtectedRoute><Vitals /></ProtectedRoute>} />
      <Route path="/activity" element={<ProtectedRoute><Activity /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/sync" element={<ProtectedRoute><Sync /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
      <Route path="/pharmacy" element={<ProtectedRoute><Pharmacy /></ProtectedRoute>} />
      <Route path="/devices" element={<ProtectedRoute><Devices /></ProtectedRoute>} />
      <Route path="/labs" element={<ProtectedRoute><Labs /></ProtectedRoute>} />
      <Route path="/insurance" element={<ProtectedRoute><Insurance /></ProtectedRoute>} />
      <Route path="/telehealth" element={<ProtectedRoute><Telehealth /></ProtectedRoute>} />
      <Route path="/emergency" element={<ProtectedRoute><Emergency /></ProtectedRoute>} />
      <Route path="/sync/result" element={<ProtectedRoute><SyncResult /></ProtectedRoute>} />
      <Route path="/medications" element={<ProtectedRoute><Medications /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/auth/callback" element={<OAuthCallback />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )

  if (!user || publicRoute) {
    return <div className="public-shell">{routes}</div>
  }

  return (
    <div className="app-shell">
      <div className="app-layout">
        <Sidebar />
        <main className="app-content">
          {routes}
        </main>
      </div>
    </div>
  )
}

export default App
