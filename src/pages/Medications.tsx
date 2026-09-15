import { useEffect, useState } from 'react'

export default function Medications() {
  const [meds, setMeds] = useState<any[]>([])
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [schedule, setSchedule] = useState('08:00')
  const [autoSchedule, setAutoSchedule] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDose, setEditDose] = useState('')
  const [editSchedule, setEditSchedule] = useState('')

  const load = () => {
    fetch('/api/health/medications', { headers: { Authorization: `Bearer ${localStorage.getItem('health-link-token')}` } })
      .then((r) => r.json())
      .then((d) => setMeds(d.medications || []))
  }

  useEffect(() => { load() }, [])

  const add = async (e: any) => {
    e.preventDefault()
    const token = localStorage.getItem('health-link-token')
    const res = await fetch('/api/health/medications', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name, dose, schedule }) })
    if (!res.ok) return
    setName('')
    setDose('')
    if (autoSchedule) {
      try {
        await fetch('/api/health/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ title: `Take ${name}`, when: schedule, repeatDaily: true }) })
      } catch (e) {
        console.error('Failed to schedule reminder', e)
      }
    }
    load()
  }

  const startEdit = (med: any) => {
    setEditingId(med.id)
    setEditName(med.name)
    setEditDose(med.dose)
    setEditSchedule(med.schedule || '08:00')
  }

  const saveEdit = async () => {
    if (!editingId) return
    const token = localStorage.getItem('health-link-token')
    const res = await fetch(`/api/health/medications/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: editName, dose: editDose, schedule: editSchedule }),
    })
    if (res.ok) {
      setEditingId(null)
      setEditName('')
      setEditDose('')
      setEditSchedule('08:00')
      load()
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditDose('')
    setEditSchedule('')
  }

  const deleteMedication = async (id: string) => {
    const token = localStorage.getItem('health-link-token')
    const res = await fetch(`/api/health/medications/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) load()
  }

  const scheduleReminder = async (med: any) => {
    const when = med.schedule || schedule || '08:00'
    const token = localStorage.getItem('health-link-token')
    await fetch('/api/health/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ title: `Take ${med.name}`, when, repeatDaily: true }) })
    alert('Reminder scheduled for ' + med.name + ' at ' + when)
  }

  return (
    <div className="page meds-page">
      <div className="hero-card">
        <h1>Medications</h1>
        <p>Manage medications for your family.</p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Add medication</h3>
          <form onSubmit={add}>
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
            <label>Dose</label>
            <input value={dose} onChange={(e) => setDose(e.target.value)} />
            <label>Reminder time</label>
            <input type="time" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
            <label><input type="checkbox" checked={autoSchedule} onChange={(e) => setAutoSchedule(e.target.checked)} /> Schedule reminder on add</label>
            <button type="submit" className="button">Add</button>
          </form>
        </div>

        <div className="dashboard-card">
          <h3>Active medications</h3>
          <ul className="medication-list">
            {meds.map((m) => (
              <li key={m.id} className="medication-row">
                {editingId === m.id ? (
                  <div className="medication-edit">
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
                    <input value={editDose} onChange={(e) => setEditDose(e.target.value)} placeholder="Dose" />
                    <input type="time" value={editSchedule} onChange={(e) => setEditSchedule(e.target.value)} />
                    <button className="button" onClick={saveEdit}>Save</button>
                    <button className="button button-secondary" onClick={cancelEdit}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <div className="medication-details">{m.name} — {m.dose} {m.schedule ? `(${m.schedule})` : ''}</div>
                    <div className="medication-actions">
                      <button className="button button-secondary" onClick={() => scheduleReminder(m)}>Schedule reminder</button>
                      <button className="button" onClick={() => startEdit(m)}>Edit</button>
                      <button className="button button-danger" onClick={() => deleteMedication(m.id)}>Delete</button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
