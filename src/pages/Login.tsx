import { FormEvent, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { buildApiUrl } from '../lib/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/dashboard'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      await signIn(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(String(err))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page auth-page">
      <div className="auth-card">
        <h1>Login</h1>
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@health.link"
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
          />

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p>
          New here? <Link to="/signup">Create an account</Link>
        </p>
        <div style={{ marginTop: 12 }}>
          <a className="button google-button" href={buildApiUrl('/api/auth/google')}>
            <span className="google-icon" aria-hidden="true">G</span>
            <span>Sign in with Google</span>
          </a>
        </div>
      </div>
    </div>
  )
}
