import { useEffect, useState } from 'react'

export default function Insurance() {
  const [summary, setSummary] = useState<any>(null)
  const [claims, setClaims] = useState<any[]>([])
  const [type, setType] = useState('Prescription')
  const [amount, setAmount] = useState('')
  const [showCard, setShowCard] = useState(false)

  const load = async () => {
    const token = localStorage.getItem('health-link-token')
    const res = await fetch('/api/health/insurance', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    setSummary(data.summary)
    setClaims(data.claims || [])
  }

  useEffect(() => {
    load()
  }, [])

  const submitClaim = async (e: any) => {
    e.preventDefault()
    const token = localStorage.getItem('health-link-token')
    const res = await fetch('/api/health/insurance/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ claimType: type, amount }),
    })
    if (res.ok) {
      setAmount('')
      load()
    }
  }

  const updateClaimStatus = async (id: string, status: string) => {
    const token = localStorage.getItem('health-link-token')
    const res = await fetch(`/api/health/insurance/claim/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    })
    if (res.ok) load()
  }

  return (
    <div className="page insurance-page">
      <div className="hero-card">
        <h1>Insurance & Claims</h1>
        <p>Review coverage details and submit a pharmacy or provider claim.</p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Policy summary</h3>
          {summary ? (
            <div>
              <p><strong>{summary.planName}</strong> • {summary.provider}</p>
              <p>Member ID: {summary.memberId}</p>
              <p>Status: {summary.status}</p>
              <p>Effective: {summary.effectiveDate}</p>
              <p>Renewal: {summary.renewalDate}</p>
              <button className="button button-secondary insurance-card-toggle" type="button" onClick={() => setShowCard((visible) => !visible)}>
                {showCard ? 'Hide insurance card' : 'View insurance card'}
              </button>
              {showCard && (
                <div className="insurance-card-preview" aria-label="Insurance card">
                  <div className="insurance-card-header">
                    <strong>{summary.provider}</strong>
                    <span>HEALTH PLAN</span>
                  </div>
                  <div className="insurance-card-plan">{summary.planName}</div>
                  <div className="insurance-card-details">
                    <span><small>Member ID</small><strong>{summary.memberId}</strong></span>
                    <span><small>Status</small><strong>{summary.status}</strong></span>
                  </div>
                  <div className="insurance-card-footer">Effective {summary.effectiveDate} · Renewal {summary.renewalDate}</div>
                </div>
              )}
            </div>
          ) : (
            <p className="empty-state">No coverage summary available.</p>
          )}
        </div>

        <div className="dashboard-card">
          <h3>Submit a claim</h3>
          <form onSubmit={submitClaim} className="stack-form">
            <label>Claim type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option>Prescription</option>
              <option>Doctor visit</option>
              <option>Lab test</option>
            </select>
            <label>Amount</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="$120.00" />
            <button className="button" type="submit">Submit claim</button>
          </form>
        </div>
      </div>

      <div className="dashboard-card">
        <h3>Recent claims</h3>
        {claims.length === 0 ? (
          <p className="empty-state">No claims filed yet.</p>
        ) : (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr key={claim.id}>
                    <td>{claim.claimType}</td>
                    <td>{claim.amount}</td>
                    <td>{claim.status}</td>
                    <td>{claim.submittedAt}</td>
                    <td>
                      {claim.status === 'Pending' ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="button button-secondary" onClick={() => updateClaimStatus(claim.id, 'Approved')}>Approve</button>
                          <button className="button button-danger" onClick={() => updateClaimStatus(claim.id, 'Denied')}>Deny</button>
                        </div>
                      ) : (
                        <span>{claim.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
