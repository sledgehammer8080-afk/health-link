import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import logo from '../assets/health-link-logo.svg'

export default function Navbar() {
  const { user } = useAuth()

  return (
    <nav className="navbar">
      <div className="nav-inner">
        <Link className="nav-brand" to="/" title="Health Link — family health dashboard">
          <img className="nav-brand-logo" src={logo} alt="Health Link logo" />
          <span>Health Link</span>
        </Link>
        <div className="nav-links">
          {user ? (
            <span className="nav-user">{user.name || 'Family Member'}</span>
          ) : (
            <Link className="nav-link" to="/login">Sign in</Link>
          )}
        </div>
      </div>
    </nav>
  )
}
