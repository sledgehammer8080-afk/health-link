import path from 'path'
import fs from 'fs'

let useSqlite = false
let Database
let db
try {
  Database = (await import('better-sqlite3')).default
  useSqlite = true
} catch (e) {
  // sqlite not installed, fall back to JSON
  useSqlite = false
}

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'server')
const DATA_FILE = path.join(DATA_DIR, 'data.json')
const DB_FILE = path.join(DATA_DIR, 'health.db')

fs.mkdirSync(DATA_DIR, { recursive: true })

function readDataFile() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8')
    return JSON.parse(raw)
  } catch (e) {
    return {
      vitals: [],
      medications: [],
      notifications: [],
      pharmacyOrders: [],
      devices: [],
      labs: [],
      insuranceSummary: {
        planName: 'Family Care Plus',
        provider: 'HealthSecure Insurance',
        memberId: 'HS-4521-9980',
        status: 'Active',
        effectiveDate: '2026-01-01',
        renewalDate: '2027-01-01',
      },
      insuranceClaims: [],
      telehealthVisits: [],
      metrics: { heartRate: [], weight: [] },
    }
  }
}
function writeDataFile(data) {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8') } catch (e) { console.error('writeDataFile error', e) }
}

export function init() {
  if (!useSqlite) return
  db = new Database(DB_FILE)
  db.exec(`
    CREATE TABLE IF NOT EXISTS vitals (
      id TEXT PRIMARY KEY,
      name TEXT,
      value TEXT,
      unit TEXT,
      recorded TEXT
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      passwordHash TEXT,
      createdAt TEXT
    );
    CREATE TABLE IF NOT EXISTS medications (
      id TEXT PRIMARY KEY,
      name TEXT,
      dose TEXT,
      schedule TEXT
    );
    CREATE TABLE IF NOT EXISTS pharmacy_orders (
      id TEXT PRIMARY KEY,
      name TEXT,
      dose TEXT,
      quantity INTEGER,
      price TEXT,
      provider TEXT,
      orderedAt TEXT
    );
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT,
      status TEXT,
      lastSynced TEXT
    );
    CREATE TABLE IF NOT EXISTS labs (
      id TEXT PRIMARY KEY,
      name TEXT,
      value TEXT,
      unit TEXT,
      date TEXT,
      provider TEXT,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS insurance_claims (
      id TEXT PRIMARY KEY,
      claimType TEXT,
      amount TEXT,
      status TEXT,
      submittedAt TEXT
    );
    CREATE TABLE IF NOT EXISTS telehealth_visits (
      id TEXT PRIMARY KEY,
      provider TEXT,
      date TEXT,
      time TEXT,
      status TEXT
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      title TEXT,
      time TEXT,
      repeatDaily INTEGER
    );
    CREATE TABLE IF NOT EXISTS google_fit_tokens (
      userId TEXT PRIMARY KEY,
      accessToken TEXT,
      refreshToken TEXT,
      expiresAt INTEGER,
      updatedAt TEXT
    );
    CREATE TABLE IF NOT EXISTS oauth_tokens (
      userId TEXT,
      provider TEXT,
      accessToken TEXT,
      refreshToken TEXT,
      expiresAt INTEGER,
      updatedAt TEXT,
      PRIMARY KEY(userId, provider)
    );
    CREATE TABLE IF NOT EXISTS roles (
      userId TEXT PRIMARY KEY,
      role TEXT,
      updatedAt TEXT
    );
    CREATE TABLE IF NOT EXISTS sync_history (
      id TEXT PRIMARY KEY,
      userId TEXT,
      provider TEXT,
      status TEXT,
      importedCount INTEGER,
      message TEXT,
      createdAt TEXT
    );
  `)
}

function generateId(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random()*1000)}`
}

export function getVitals({ from, to } = {}) {
  if (useSqlite && db) {
    let sql = 'SELECT id,name,value,unit,recorded FROM vitals'
    const conds = []
    const params = []
    if (from) { conds.push('recorded >= ?'); params.push(from) }
    if (to) { conds.push('recorded <= ?'); params.push(to) }
    if (conds.length) sql += ' WHERE ' + conds.join(' AND ')
    sql += ' ORDER BY recorded ASC'
    const stmt = db.prepare(sql)
    return stmt.all(...params)
  }
  const data = readDataFile()
  let list = data.vitals || []
  if (from) list = list.filter((e) => String(e.recorded) >= String(from))
  if (to) list = list.filter((e) => String(e.recorded) <= String(to))
  return list
}

export function insertVital(entry) {
  const id = entry.id || generateId('v')
  const e = { id, name: entry.name, value: String(entry.value), unit: entry.unit || '', recorded: entry.recorded || new Date().toISOString().slice(0,10) }
  if (useSqlite && db) {
    const stmt = db.prepare('INSERT INTO vitals (id,name,value,unit,recorded) VALUES (?,?,?,?,?)')
    stmt.run(e.id, e.name, e.value, e.unit, e.recorded)
    return e
  }
  const data = readDataFile()
  data.vitals = data.vitals || []
  data.vitals.push(e)
  // simple metrics update
  if (/heart/i.test(e.name)) data.metrics = data.metrics || { heartRate: [], weight: [] }, data.metrics.heartRate.push({ date: e.recorded, value: Number(e.value) })
  if (/weight/i.test(e.name)) data.metrics = data.metrics || { heartRate: [], weight: [] }, data.metrics.weight.push({ date: e.recorded, value: Number(e.value) })
  writeDataFile(data)
  return e
}

export function insertVitals(entries) {
  const added = []
  for (const v of entries) {
    added.push(insertVital(v))
  }
  return added
}

export function getMedications() {
  if (useSqlite && db) {
    return db.prepare('SELECT id,name,dose,schedule FROM medications ORDER BY id ASC').all()
  }
  const data = readDataFile()
  return data.medications || []
}

export function insertMedication(m) {
  const id = m.id || generateId('m')
  const med = { id, name: m.name, dose: m.dose || '', schedule: m.schedule || '' }
  if (useSqlite && db) {
    db.prepare('INSERT INTO medications (id,name,dose,schedule) VALUES (?,?,?,?)').run(med.id, med.name, med.dose, med.schedule)
    return med
  }
  const data = readDataFile()
  data.medications = data.medications || []
  data.medications.push(med)
  writeDataFile(data)
  return med
}

export function updateMedication(id, updates) {
  if (!id) return null
  if (useSqlite && db) {
    const current = db.prepare('SELECT id,name,dose,schedule FROM medications WHERE id = ?').get(id)
    if (!current) return null
    const updated = {
      id,
      name: updates.name || current.name,
      dose: updates.dose || current.dose,
      schedule: updates.schedule || current.schedule,
    }
    db.prepare('UPDATE medications SET name = ?, dose = ?, schedule = ? WHERE id = ?').run(updated.name, updated.dose, updated.schedule, id)
    return updated
  }
  const data = readDataFile()
  const meds = data.medications || []
  const idx = meds.findIndex((m) => m.id === id)
  if (idx === -1) return null
  const existing = meds[idx]
  const updated = {
    ...existing,
    name: updates.name || existing.name,
    dose: updates.dose || existing.dose,
    schedule: updates.schedule || existing.schedule,
  }
  data.medications[idx] = updated
  writeDataFile(data)
  return updated
}

export function deleteMedication(id) {
  if (!id) return false
  if (useSqlite && db) {
    db.prepare('DELETE FROM medications WHERE id = ?').run(id)
    return true
  }
  const data = readDataFile()
  data.medications = (data.medications || []).filter((m) => m.id !== id)
  writeDataFile(data)
  return true
}

export function getNotifications() {
  if (useSqlite && db) {
    return db.prepare('SELECT id,title,time,repeatDaily FROM notifications ORDER BY id ASC').all().map((r) => ({ id: r.id, title: r.title, when: r.time, repeatDaily: !!r.repeatDaily }))
  }
  const data = readDataFile()
  return data.notifications || []
}

export function insertNotification(n) {
  const id = n.id || generateId('n')
  const note = { id, title: n.title, when: n.when, repeatDaily: !!n.repeatDaily }
  if (useSqlite && db) {
    db.prepare('INSERT INTO notifications (id,title,time,repeatDaily) VALUES (?,?,?,?)').run(note.id, note.title, note.when, note.repeatDaily ? 1 : 0)
    return note
  }
  const data = readDataFile()
  data.notifications = data.notifications || []
  data.notifications.push(note)
  writeDataFile(data)
  return note
}

export function getPharmacyOrders() {
  if (useSqlite && db) {
    return db.prepare('SELECT id,name,dose,quantity,price,provider,orderedAt FROM pharmacy_orders ORDER BY orderedAt DESC').all()
  }
  const data = readDataFile()
  return data.pharmacyOrders || []
}

export function insertPharmacyOrder(order) {
  const id = order.id || generateId('o')
  const record = {
    id,
    name: order.name,
    dose: order.dose || '',
    quantity: Number(order.quantity) || 1,
    price: order.price || '',
    provider: order.provider || 'Bolt Pharmacy',
    orderedAt: order.orderedAt || new Date().toISOString(),
  }
  if (useSqlite && db) {
    db.prepare('INSERT INTO pharmacy_orders (id,name,dose,quantity,price,provider,orderedAt) VALUES (?,?,?,?,?,?,?)').run(
      record.id,
      record.name,
      record.dose,
      record.quantity,
      record.price,
      record.provider,
      record.orderedAt,
    )
    return record
  }
  const data = readDataFile()
  data.pharmacyOrders = data.pharmacyOrders || []
  data.pharmacyOrders.push(record)
  writeDataFile(data)
  return record
}

export function deletePharmacyOrder(id) {
  if (!id) return false
  if (useSqlite && db) {
    db.prepare('DELETE FROM pharmacy_orders WHERE id = ?').run(id)
    return true
  }
  const data = readDataFile()
  data.pharmacyOrders = (data.pharmacyOrders || []).filter((order) => order.id !== id)
  writeDataFile(data)
  return true
}

export function getDeviceConnections() {
  if (useSqlite && db) {
    return db.prepare('SELECT id,name,status,lastSynced FROM devices ORDER BY name ASC').all()
  }
  const data = readDataFile()
  return data.devices || []
}

export function upsertDeviceConnection(device) {
  if (useSqlite && db) {
    db.prepare('INSERT INTO devices (id,name,status,lastSynced) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET status = excluded.status, lastSynced = excluded.lastSynced').run(
      device.id,
      device.name,
      device.status,
      device.lastSynced,
    )
    return device
  }
  const data = readDataFile()
  data.devices = data.devices || []
  const idx = data.devices.findIndex((x) => x.id === device.id)
  if (idx >= 0) data.devices[idx] = device
  else data.devices.push(device)
  writeDataFile(data)
  return device
}

export function deleteDeviceConnection(id) {
  if (!id) return false
  if (useSqlite && db) {
    db.prepare('DELETE FROM devices WHERE id = ?').run(id)
    return true
  }
  const data = readDataFile()
  data.devices = (data.devices || []).filter((device) => device.id !== id)
  writeDataFile(data)
  return true
}

export function getLabResults() {
  if (useSqlite && db) {
    return db.prepare('SELECT id,name,value,unit,date,provider,notes FROM labs ORDER BY date DESC').all()
  }
  const data = readDataFile()
  return data.labs || []
}

export function insertLabResult(lab) {
  const id = lab.id || generateId('l')
  const entry = {
    id,
    name: lab.name,
    value: lab.value,
    unit: lab.unit || '',
    date: lab.date || new Date().toISOString().slice(0, 10),
    provider: lab.provider || 'Lab Center',
    notes: lab.notes || '',
  }
  if (useSqlite && db) {
    db.prepare('INSERT INTO labs (id,name,value,unit,date,provider,notes) VALUES (?,?,?,?,?,?,?)').run(
      entry.id,
      entry.name,
      entry.value,
      entry.unit,
      entry.date,
      entry.provider,
      entry.notes,
    )
    return entry
  }
  const data = readDataFile()
  data.labs = data.labs || []
  data.labs.push(entry)
  writeDataFile(data)
  return entry
}

export function getInsuranceSummary() {
  if (useSqlite && db) {
    return {
      planName: 'Family Care Plus',
      provider: 'HealthSecure Insurance',
      memberId: 'HS-4521-9980',
      status: 'Active',
      effectiveDate: '2026-01-01',
      renewalDate: '2027-01-01',
    }
  }
  const data = readDataFile()
  return data.insuranceSummary
}

export function getInsuranceClaims() {
  if (useSqlite && db) {
    return db.prepare('SELECT id,claimType,amount,status,submittedAt FROM insurance_claims ORDER BY submittedAt DESC').all()
  }
  const data = readDataFile()
  return data.insuranceClaims || []
}

export function insertInsuranceClaim(claim) {
  const id = claim.id || generateId('c')
  const entry = {
    id,
    claimType: claim.claimType,
    amount: claim.amount,
    status: 'Pending',
    submittedAt: claim.submittedAt || new Date().toISOString(),
  }
  if (useSqlite && db) {
    db.prepare('INSERT INTO insurance_claims (id,claimType,amount,status,submittedAt) VALUES (?,?,?,?,?)').run(
      entry.id,
      entry.claimType,
      entry.amount,
      entry.status,
      entry.submittedAt,
    )
    return entry
  }
  const data = readDataFile()
  data.insuranceClaims = data.insuranceClaims || []
  data.insuranceClaims.push(entry)
  writeDataFile(data)
  return entry
}

export function updateInsuranceClaimStatus(id, status) {
  if (!id || !status) return null
  if (useSqlite && db) {
    const existing = db.prepare('SELECT id,claimType,amount,status,submittedAt FROM insurance_claims WHERE id = ?').get(id)
    if (!existing) return null
    db.prepare('UPDATE insurance_claims SET status = ? WHERE id = ?').run(status, id)
    return { ...existing, status }
  }
  const data = readDataFile()
  const claims = data.insuranceClaims || []
  const idx = claims.findIndex((c) => c.id === id)
  if (idx === -1) return null
  claims[idx] = { ...claims[idx], status }
  data.insuranceClaims = claims
  writeDataFile(data)
  return claims[idx]
}

export function getTelehealthVisits() {
  if (useSqlite && db) {
    return db.prepare('SELECT id,provider,date,time,status FROM telehealth_visits ORDER BY date ASC').all()
  }
  const data = readDataFile()
  return data.telehealthVisits || []
}

export function insertTelehealthVisit(visit) {
  const id = visit.id || generateId('t')
  const entry = {
    id,
    provider: visit.provider,
    date: visit.date,
    time: visit.time,
    status: visit.status || 'Scheduled',
  }
  if (useSqlite && db) {
    db.prepare('INSERT INTO telehealth_visits (id,provider,date,time,status) VALUES (?,?,?,?,?)').run(
      entry.id,
      entry.provider,
      entry.date,
      entry.time,
      entry.status,
    )
    return entry
  }
  const data = readDataFile()
  data.telehealthVisits = data.telehealthVisits || []
  data.telehealthVisits.push(entry)
  writeDataFile(data)
  return entry
}

export function cancelTelehealthVisit(id) {
  if (!id) return false
  if (useSqlite && db) {
    db.prepare('DELETE FROM telehealth_visits WHERE id = ?').run(id)
    return true
  }
  const data = readDataFile()
  data.telehealthVisits = (data.telehealthVisits || []).filter((v) => v.id !== id)
  writeDataFile(data)
  return true
}

export function deleteNotification(id) {
  if (useSqlite && db) {
    db.prepare('DELETE FROM notifications WHERE id = ?').run(id)
    return true
  }
  const data = readDataFile()
  data.notifications = (data.notifications || []).filter((x) => x.id !== id)
  writeDataFile(data)
  return true
}

export function storeGoogleFitTokens(userId, tokens) {
  const now = Date.now()
  const expiresAt = tokens.expires_in ? now + tokens.expires_in * 1000 : null
  const record = {
    userId,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || '',
    expiresAt: expiresAt || null,
    updatedAt: new Date().toISOString(),
  }
  if (useSqlite && db) {
    db.prepare(`INSERT INTO google_fit_tokens (userId, accessToken, refreshToken, expiresAt, updatedAt)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(userId) DO UPDATE SET accessToken = excluded.accessToken, refreshToken = excluded.refreshToken, expiresAt = excluded.expiresAt, updatedAt = excluded.updatedAt`).run(
      record.userId,
      record.accessToken,
      record.refreshToken,
      record.expiresAt,
      record.updatedAt,
    )
    return record
  }
  const data = readDataFile()
  data.googleFitTokens = data.googleFitTokens || []
  const existingIndex = data.googleFitTokens.findIndex((x) => x.userId === userId)
  if (existingIndex >= 0) data.googleFitTokens[existingIndex] = record
  else data.googleFitTokens.push(record)
  writeDataFile(data)
  return record
}

export function storeOAuthTokens(userId, provider, tokens) {
  const now = Date.now()
  const expiresAt = tokens.expires_in ? now + tokens.expires_in * 1000 : (tokens.expiresAt || null)
  const record = {
    userId,
    provider,
    accessToken: tokens.access_token || tokens.accessToken || '',
    refreshToken: tokens.refresh_token || tokens.refreshToken || '',
    expiresAt: expiresAt || null,
    updatedAt: new Date().toISOString(),
  }
  if (useSqlite && db) {
    db.prepare(`INSERT INTO oauth_tokens (userId, provider, accessToken, refreshToken, expiresAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(userId, provider) DO UPDATE SET accessToken = excluded.accessToken, refreshToken = excluded.refreshToken, expiresAt = excluded.expiresAt, updatedAt = excluded.updatedAt`).run(
      record.userId,
      record.provider,
      record.accessToken,
      record.refreshToken,
      record.expiresAt,
      record.updatedAt,
    )
    return record
  }
  const data = readDataFile()
  data.oauthTokens = data.oauthTokens || []
  const idx = data.oauthTokens.findIndex((x) => x.userId === userId && x.provider === provider)
  if (idx >= 0) data.oauthTokens[idx] = record
  else data.oauthTokens.push(record)
  writeDataFile(data)
  return record
}

export function getOAuthTokens(userId, provider) {
  if (useSqlite && db) {
    return db.prepare('SELECT userId, provider, accessToken, refreshToken, expiresAt, updatedAt FROM oauth_tokens WHERE userId = ? AND provider = ?').get(userId, provider) || null
  }
  const data = readDataFile()
  return (data.oauthTokens || []).find((x) => x.userId === userId && x.provider === provider) || null
}

export function getAllOAuthTokens(provider) {
  if (useSqlite && db) {
    const stmt = provider
      ? db.prepare('SELECT userId, provider, accessToken, refreshToken, expiresAt, updatedAt FROM oauth_tokens WHERE provider = ?')
      : db.prepare('SELECT userId, provider, accessToken, refreshToken, expiresAt, updatedAt FROM oauth_tokens')
    return provider ? stmt.all(provider) : stmt.all()
  }
  const data = readDataFile()
  const list = data.oauthTokens || []
  return provider ? list.filter((x) => x.provider === provider) : list
}

export function setUserRole(userId, role) {
  const rec = { userId, role, updatedAt: new Date().toISOString() }
  if (useSqlite && db) {
    db.prepare(`INSERT INTO roles (userId, role, updatedAt) VALUES (?, ?, ?) ON CONFLICT(userId) DO UPDATE SET role = excluded.role, updatedAt = excluded.updatedAt`).run(rec.userId, rec.role, rec.updatedAt)
    return rec
  }
  const data = readDataFile()
  data.roles = data.roles || []
  const idx = data.roles.findIndex((r) => r.userId === userId)
  if (idx >= 0) data.roles[idx] = rec
  else data.roles.push(rec)
  writeDataFile(data)
  return rec
}

export function getUserRole(userId) {
  if (useSqlite && db) {
    return db.prepare('SELECT userId, role, updatedAt FROM roles WHERE userId = ?').get(userId) || null
  }
  const data = readDataFile()
  return (data.roles || []).find((r) => r.userId === userId) || null
}

export function listUserRoles() {
  if (useSqlite && db) {
    return db.prepare('SELECT userId, role, updatedAt FROM roles ORDER BY userId ASC').all()
  }
  const data = readDataFile()
  return data.roles || []
}

// Users persistence
export function createUser({ id, name, email, passwordHash } = {}) {
  const uid = id || generateId('u')
  const rec = { id: uid, name: name || '', email: (email || '').toLowerCase(), passwordHash: passwordHash || '', createdAt: new Date().toISOString() }
  if (useSqlite && db) {
    try {
      db.prepare('INSERT INTO users (id,name,email,passwordHash,createdAt) VALUES (?, ?, ?, ?, ?)').run(rec.id, rec.name, rec.email, rec.passwordHash, rec.createdAt)
      return rec
    } catch (e) {
      // if email unique constraint fails, return existing
      try { return db.prepare('SELECT id,name,email,passwordHash,createdAt FROM users WHERE email = ?').get(rec.email) } catch (ee) { throw e }
    }
  }
  const data = readDataFile()
  data.users = data.users || []
  const existing = data.users.find((u) => u.email === rec.email)
  if (existing) return existing
  data.users.push(rec)
  writeDataFile(data)
  return rec
}

export function getUserByEmail(email) {
  if (!email) return null
  if (useSqlite && db) {
    return db.prepare('SELECT id,name,email,passwordHash,createdAt FROM users WHERE email = ?').get(String(email).toLowerCase()) || null
  }
  const data = readDataFile()
  return (data.users || []).find((u) => String(u.email).toLowerCase() === String(email).toLowerCase()) || null
}

export function getUserById(id) {
  if (!id) return null
  if (useSqlite && db) {
    return db.prepare('SELECT id,name,email,passwordHash,createdAt FROM users WHERE id = ?').get(id) || null
  }
  const data = readDataFile()
  return (data.users || []).find((u) => u.id === id) || null
}

export function listUsers() {
  if (useSqlite && db) {
    return db.prepare('SELECT id,name,email,createdAt FROM users ORDER BY id ASC').all()
  }
  const data = readDataFile()
  return (data.users || []).map((u) => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt }))
}

export function deleteOAuthTokens(userId, provider) {
  if (useSqlite && db) {
    db.prepare('DELETE FROM oauth_tokens WHERE userId = ? AND provider = ?').run(userId, provider)
    return true
  }
  const data = readDataFile()
  data.oauthTokens = (data.oauthTokens || []).filter((x) => !(x.userId === userId && x.provider === provider))
  writeDataFile(data)
  return true
}

export function getGoogleFitTokens(userId) {
  if (useSqlite && db) {
    return db.prepare('SELECT userId, accessToken, refreshToken, expiresAt, updatedAt FROM google_fit_tokens WHERE userId = ?').get(userId) || null
  }
  const data = readDataFile()
  return (data.googleFitTokens || []).find((x) => x.userId === userId) || null
}

export function deleteGoogleFitTokens(userId) {
  if (useSqlite && db) {
    db.prepare('DELETE FROM google_fit_tokens WHERE userId = ?').run(userId)
    return true
  }
  const data = readDataFile()
  data.googleFitTokens = (data.googleFitTokens || []).filter((x) => x.userId !== userId)
  writeDataFile(data)
  return true
}

export function insertSyncLog(log) {
  const id = log.id || generateId('s')
  const entry = {
    id,
    userId: log.userId,
    provider: log.provider,
    status: log.status,
    importedCount: Number(log.importedCount || 0),
    message: log.message || '',
    createdAt: new Date().toISOString(),
  }
  if (useSqlite && db) {
    db.prepare('INSERT INTO sync_history (id, userId, provider, status, importedCount, message, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(entry.id, entry.userId, entry.provider, entry.status, entry.importedCount, entry.message, entry.createdAt)
    return entry
  }
  const data = readDataFile()
  data.syncHistory = data.syncHistory || []
  data.syncHistory.push(entry)
  writeDataFile(data)
  return entry
}

export function getSyncLogs(userId, provider) {
  if (useSqlite && db) {
    const stmt = provider
      ? db.prepare('SELECT id, userId, provider, status, importedCount, message, createdAt FROM sync_history WHERE userId = ? AND provider = ? ORDER BY createdAt DESC')
      : db.prepare('SELECT id, userId, provider, status, importedCount, message, createdAt FROM sync_history WHERE userId = ? ORDER BY createdAt DESC')
    return provider ? stmt.all(userId, provider) : stmt.all(userId)
  }
  const data = readDataFile()
  const all = data.syncHistory || []
  return all.filter((x) => x.userId === userId && (!provider || x.provider === provider))
}


export function exportAll() {
  const vitals = getVitals()
  const meds = getMedications()
  const notifications = getNotifications()
  // build simple metrics
  const metrics = { heartRate: [], weight: [] }
  for (const v of vitals) {
    if (/heart/i.test(v.name)) metrics.heartRate.push({ date: v.recorded, value: Number(v.value) })
    if (/weight/i.test(v.name)) metrics.weight.push({ date: v.recorded, value: Number(v.value) })
  }
  return { vitals, metrics, medications: meds, notifications }
}
