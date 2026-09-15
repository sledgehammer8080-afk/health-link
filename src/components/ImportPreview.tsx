import { useEffect, useState } from 'react'

function parseCSV(text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (!lines.length) return []

  const rows = lines.map((line) => {
    // naive split supporting quoted values
    const values: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i+1] === '"') { cur += '"'; i++ } else { inQuotes = !inQuotes }
        continue
      }
      if (ch === ',' && !inQuotes) { values.push(cur); cur = ''; continue }
      cur += ch
    }
    values.push(cur)
    return values.map((v) => v.trim())
  })

  // detect header
  const header = rows[0].map((c) => c.toLowerCase())
  const hasHeader = header.includes('name') || header.includes('value') || header.includes('recorded')
  const dataRows = hasHeader ? rows.slice(1) : rows

  const mapped = dataRows.map((cols) => {
    if (hasHeader) {
      const map: any = {}
      header.forEach((h, i) => { map[h] = cols[i] })
      return { name: map.name || map.metric || '', value: map.value || map.val || '', unit: map.unit || '', recorded: map.recorded || map.date || '' }
    }
    // assume order: name,value,unit,recorded
    return { name: cols[0] || '', value: cols[1] || '', unit: cols[2] || '', recorded: cols[3] || '' }
  })

  return mapped
}

export default function ImportPreview({ file, onCancel, onImported }: { file: File; onCancel: () => void; onImported: () => void }) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const text = await file.text()
      if (!mounted) return
      const parsed = parseCSV(text)
      setRows(parsed)
    })()
    return () => { mounted = false }
  }, [file])

  const confirm = async () => {
    setLoading(true)
    try {
      await fetch('/api/health/import', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('health-link-token')}` }, body: JSON.stringify({ vitals: rows }) })
      onImported()
    } catch (e) {
      console.error(e)
    } finally { setLoading(false) }
  }

  return (
    <div className="import-preview">
      <h4>CSV Import Preview — {file.name}</h4>
      {rows.length ? (
        <div style={{ maxHeight: 240, overflow: 'auto' }}>
          <table className="table">
            <thead><tr><th>Name</th><th>Value</th><th>Unit</th><th>Recorded</th></tr></thead>
            <tbody>
              {rows.slice(0, 50).map((r, i) => (
                <tr key={i}><td>{r.name}</td><td>{r.value}</td><td>{r.unit}</td><td>{r.recorded}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No rows parsed from this CSV.</p>
      )}
      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button className="button" onClick={confirm} disabled={loading || !rows.length}>{loading ? 'Importing...' : 'Confirm Import'}</button>
        <button className="button button-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
