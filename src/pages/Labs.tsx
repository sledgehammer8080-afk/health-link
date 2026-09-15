import { useEffect, useState } from 'react'

export default function Labs() {
  const [labs, setLabs] = useState<any[]>([])
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState('mg/dL')
  const [provider, setProvider] = useState('Lab Center')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')

  const load = async () => {
    const token = localStorage.getItem('health-link-token')
    const res = await fetch('/api/health/labs', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    setLabs(data.labs || [])
  }

  useEffect(() => {
    load()
  }, [])

  const addLab = async (event: any) => {
    event.preventDefault()
    const token = localStorage.getItem('health-link-token')
    const res = await fetch('/api/health/labs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, value, unit, date, provider, notes }),
    })
    if (res.ok) {
      setName('')
      setValue('')
      setUnit('mg/dL')
      setProvider('Lab Center')
      setDate(new Date().toISOString().slice(0, 10))
      setNotes('')
      load()
    }
  }

  return (
    <div className="page labs-page">
      <div className="hero-card">
        <h1>Lab Results</h1>
        <p>View your latest labs and track results over time.</p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Submit a lab result</h3>
          <form onSubmit={addLab} className="stack-form">
            <label>
              Test name
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Hemoglobin A1C" />
            </label>
            <label>
              Value
              <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="5.4" />
            </label>
            <label>
              Unit
              <input value={unit} onChange={(e) => setUnit(e.target.value)} />
            </label>
            <label>
              Provider
              <input value={provider} onChange={(e) => setProvider(e.target.value)} />
            </label>
            <label>
              Date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label>
              Notes
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Fasting lab" />
            </label>
            <button className="button" type="submit">Add lab result</button>
          </form>
        </div>

        <div className="dashboard-card">
          <h3>Recent lab reports</h3>
          {labs.length === 0 ? (
            <p className="empty-state">No lab results available yet.</p>
          ) : (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Test</th>
                    <th>Value</th>
                    <th>Date</th>
                    <th>Provider</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {labs.map((lab) => (
                    <tr key={lab.id}>
                      <td>{lab.name}</td>
                      <td>{lab.value} {lab.unit}</td>
                      <td>{lab.date}</td>
                      <td>{lab.provider}</td>
                      <td>{lab.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
