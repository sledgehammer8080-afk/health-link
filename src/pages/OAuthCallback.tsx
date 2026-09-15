import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function OAuthCallback() {
  const navigate = useNavigate()
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      localStorage.setItem('health-link-token', token)
      // reload to let AuthProvider pick it up
      window.location.href = '/dashboard'
    } else {
      navigate('/login')
    }
  }, [])
  return <div>Processing login...</div>
}
