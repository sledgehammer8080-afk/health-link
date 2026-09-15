import { useState } from 'react'

export default function VitalsForm({ onAdd }: { onAdd?: () => void }) {
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('health-link-token')
      const res = await fetch('/api/health/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, value: isNaN(Number(value)) ? value : Number(value), unit, recorded: date }),
      })
      if (!res.ok) throw new Error((await res.json()).message || 'Failed')
      setName('')
      setValue('')
      setUnit('')
      if (onAdd) onAdd()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="vitals-form" onSubmit={submit}>
      <label>Name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Resting Heart Rate" />
      <label>Value</label>
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="62" />
      <label>Unit</label>
      <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="bpm" />
      <label>Date</label>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      {error && <div className="error-message">{error}</div>}
      <button type="submit" disabled={loading}>{loading ? 'Adding…' : 'Add vital'}</button>
    </form>
  )
}
