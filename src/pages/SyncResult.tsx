import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

export default function SyncResult() {
  const location = useLocation()
  const [result, setResult] = useState<{ status: string; imported?: string } | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const status = params.get('status') || 'unknown'
    const imported = params.get('imported') || undefined
    setResult({ status, imported })
  }, [location.search])

  return (
    <div className="page sync-result-page">
      <div className="hero-card">
        <h1>Sync result</h1>
        {result ? (
          <div>
            <p>Status: {result.status}</p>
            {result.imported && <p>Imported records: {result.imported}</p>}
          </div>
        ) : (
          <p>Waiting for sync status...</p>
        )}
      </div>
    </div>
  )
}
