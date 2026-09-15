import { useEffect, useState } from 'react'
import VitalsForm from '../components/VitalsForm'
import VitalsChart from '../components/VitalsChart'
import ImportPreview from '../components/ImportPreview'

export default function Vitals() {
  const [vitals, setVitals] = useState<any[]>([])
  const [from, setFrom] = useState<string | null>(null)
  const [to, setTo] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<File | null>(null)

  const load = (opts?: { from?: string | null; to?: string | null }) => {
    const token = localStorage.getItem('health-link-token')
    const params = new URLSearchParams()
    if (opts?.from) params.set('from', opts.from)
    if (opts?.to) params.set('to', opts.to)
    const url = `/api/health/vitals${params.toString() ? `?${params.toString()}` : ''}`
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setVitals(data.vitals || []))
      .catch(() => setVitals([]))
  }

  useEffect(() => { load({ from, to }) }, [from, to])

  const exportJSON = async () => {
    const token = localStorage.getItem('health-link-token')
    const res = await fetch('/api/health/export', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'health-export.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const importFile = async (file: File | null) => {
    if (!file) return
    // JSON import: keep previous behavior
    if (file.name.toLowerCase().endsWith('.json')) {
      const text = await file.text()
      try {
        const payload = JSON.parse(text)
        await fetch('/api/health/import', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('health-link-token')}` }, body: JSON.stringify(payload) })
        load()
        return
      } catch (e) {
        // fall through to treat as CSV
      }
    }

    // For CSV, show preview first
    if (file.name.toLowerCase().endsWith('.csv')) {
      setPreviewFile(file)
      return
    }

    // fallback: try to parse as CSV immediately
    const text = await file.text()
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    const vitals = lines.map((line) => {
      const parts = line.split(',')
      return { name: parts[0], value: isNaN(Number(parts[1])) ? parts[1] : Number(parts[1]), unit: parts[2] || '', recorded: parts[3] || undefined }
    })
    if (vitals.length) {
      await fetch('/api/health/import', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('health-link-token')}` }, body: JSON.stringify({ vitals }) })
      load()
    }
  }

  const onPreviewCancel = () => { setPreviewFile(null) }
  const onPreviewImported = () => { setPreviewFile(null); load() }

  const exportCSV = () => {
    const rows = [['name','value','unit','recorded'], ...vitals.map((v) => [v.name, String(v.value), v.unit || '', v.recorded])]
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'health-vitals.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page vitals-page">
      <div className="hero-card">
        <h1>Vitals</h1>
        <p>Track heart rate, blood pressure, weight and sleep.</p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Add a vital</h3>
          <VitalsForm onAdd={load} />
          <div className="vitals-action-row button-row button-row-start">
            <button onClick={exportJSON} className="button button-pill">Export JSON</button>
            <button onClick={exportCSV} className="button button-secondary button-pill">Export CSV</button>
            <label className="button button-secondary button-pill file-import-button">
              Import file
              <input type="file" accept=".json,.csv" onChange={(e) => importFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        {previewFile && (
          <div className="dashboard-card">
            <ImportPreview file={previewFile} onCancel={onPreviewCancel} onImported={onPreviewImported} />
          </div>
        )}

        <div className="dashboard-card">
          <h3>Heart rate trend</h3>
          <div className="vitals-filter-row button-row button-row-start">
            <label className="date-filter-label">From <input type="date" value={from||''} onChange={(e) => setFrom(e.target.value || null)} /></label>
            <label className="date-filter-label">To <input type="date" value={to||''} onChange={(e) => setTo(e.target.value || null)} /></label>
            <div className="filter-action-group">
              <button className="button button-pill" onClick={() => load({ from, to })}>Apply</button>
              <button className="button button-secondary button-pill" onClick={() => { setFrom(null); setTo(null); load({}) }}>Clear</button>
            </div>
          </div>
          <VitalsChart data={vitals.filter((v) => /heart/i.test(v.name)).map((v) => ({ date: v.recorded, value: Number(v.value) }))} />
        </div>

        {vitals.map((v) => (
          <div key={v.id} className="dashboard-card">
            <h3>{v.name}</h3>
            <div className="vital-value">{v.value} {v.unit}</div>
            <div className="vital-date">Recorded: {v.recorded}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
