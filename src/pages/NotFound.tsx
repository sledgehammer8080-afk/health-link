import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="page notfound-page">
      <div className="card">
        <h1>Page not found</h1>
        <p>The page you were looking for does not exist.</p>
        <Link className="button" to="/">
          Back to home
        </Link>
      </div>
    </div>
  )
}
