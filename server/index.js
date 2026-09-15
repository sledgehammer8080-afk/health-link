import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'
import * as db from './db.js'
import * as fhir from './fhir.js'
import * as sync from './sync.js'
import session from 'express-session'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'

const app = express()
const PORT = Number(process.env.PORT || 4174)
const JWT_SECRET = process.env.JWT_SECRET || 'health-link-secret-2026'

const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }))
app.use(express.json())

// Handle invalid JSON bodies gracefully
app.use((err, req, res, next) => {
  if (err && (err instanceof SyntaxError || err.type === 'entity.parse.failed')) {
    return res.status(400).json({ message: 'Invalid JSON payload' })
  }
  next(err)
})

// Simple JSON persistence
const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'server')
const DATA_FILE = path.join(DATA_DIR, 'data.json')
function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8')
    return JSON.parse(raw)
  } catch (e) {
    return { vitals: [], metrics: { heartRate: [], weight: [] }, medications: [], notifications: [] }
  }
}
function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
  } catch (e) {
    console.error('Failed to write data file', e)
  }
}

// Initialize DB (or JSON fallback)
db.init()

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Setup sessions and passport for OAuth
app.use(session({ secret: process.env.SESSION_SECRET || 'dev-secret', resave: false, saveUninitialized: false }))
app.use(passport.initialize())
app.use(passport.session())

passport.serializeUser((user, done) => done(null, user))
passport.deserializeUser((obj, done) => done(null, obj))

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK || 'http://localhost:4174/api/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // find or create user
      const email = profile.emails && profile.emails[0] && profile.emails[0].value
      const user = { id: profile.id, name: profile.displayName || email, email }
      // persist OAuth tokens for this user (Google account)
      try {
        await db.storeOAuthTokens(profile.id, 'google', { access_token: accessToken, refresh_token: refreshToken, expires_in: null })
      } catch (e) {
        console.warn('Failed to store Google OAuth tokens', e)
      }
      return done(null, user)
    } catch (err) {
      return done(err)
    }
  }))

  app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }))

  app.get('/api/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login', session: false }), (req, res) => {
      const user = req.user
    // create JWT
    const token = jwt.sign({ sub: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '2h' })
    const redirectTo = (process.env.FRONTEND_URL || 'http://localhost:4173') + `/auth/callback?token=${token}`
    res.redirect(redirectTo)
  })
} else {
  console.warn('Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable.')
  app.get('/api/auth/google', (req, res) => {
    res.status(503).json({ message: 'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the backend.' })
  })
}

// ensure a default admin user exists in persistent store
try {
  const existing = db.getUserByEmail('family@health.link')
  if (!existing) {
    db.createUser({ id: '1', name: 'Family User', email: 'family@health.link', passwordHash: bcrypt.hashSync('family123', 8) })
  }
} catch (e) {
  console.warn('Failed to ensure default user', e)
}

const createToken = (user) =>
  jwt.sign(
    { sub: user.id, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: '2h' },
  )

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing auth token' })
  }

  const token = authHeader.replace('Bearer ', '')
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' })
  }
  try {
    const existingUser = db.getUserByEmail(email.toLowerCase())
    if (existingUser) return res.status(409).json({ message: 'Email already registered.' })
    const created = db.createUser({ name, email: email.toLowerCase(), passwordHash: bcrypt.hashSync(password, 8) })
    const token = createToken(created)
    res.status(201).json({ token, user: { id: created.id, name: created.name, email: created.email } })
  } catch (err) {
    console.error('Signup failed', err)
    res.status(500).json({ message: 'Signup failed' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  try {
    const user = db.getUserByEmail(email?.toLowerCase())
    if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }
    const token = createToken(user)
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } })
  } catch (err) {
    console.error('Login failed', err)
    res.status(500).json({ message: 'Login failed' })
  }
})

app.get('/api/health/tasks', authMiddleware, (req, res) => {
  res.json([
    { id: 'task-1', title: 'Schedule annual checkup', status: 'Open' },
    { id: 'task-2', title: 'Submit insurance claim', status: 'In progress' },
    { id: 'task-3', title: 'Refill prescriptions', status: 'Completed' },
  ])
})

app.get('/api/health/appointments', authMiddleware, (req, res) => {
  res.json([
    {
      id: 'apt-1',
      date: '2026-08-20',
      time: '10:00 AM',
      provider: 'Dr. A. Mensah',
      type: 'Primary care review',
    },
    {
      id: 'apt-2',
      date: '2026-09-05',
      time: '2:30 PM',
      provider: 'Nutritionist Team',
      type: 'Wellness planning',
    },
  ])
})

app.get('/api/user', authMiddleware, (req, res) => {
  res.json({ user: req.user })
})

// simple admin check
function adminOnly(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' })
  try {
    const roleRec = db.getUserRole(req.user.sub)
    if (roleRec && roleRec.role === 'admin') return next()
  } catch (e) {
    console.warn('Role lookup failed', e)
  }
  // fallback to family user
  if (req.user.email === 'family@health.link' || String(req.user.sub) === '1') return next()
  return res.status(403).json({ message: 'Admin access required' })
}

// Admin endpoints
app.get('/api/admin/sync/history', authMiddleware, adminOnly, (req, res) => {
  try {
    const all = db.getSyncLogs()
    res.json({ history: all })
  } catch (err) {
    console.error('Admin get history failed', err)
    res.status(500).json({ message: 'Failed to fetch sync history' })
  }
})

app.get('/api/admin/oauth-tokens', authMiddleware, adminOnly, (req, res) => {
  try {
    const all = db.getAllOAuthTokens()
    res.json({ tokens: all })
  } catch (err) {
    console.error('Admin get tokens failed', err)
    res.status(500).json({ message: 'Failed to fetch oauth tokens' })
  }
})

// list users (from in-memory users array) with role info
app.get('/api/admin/users', authMiddleware, adminOnly, (req, res) => {
  try {
    const rows = db.listUsers()
    const list = rows.map((u) => {
      const r = db.getUserRole(u.id)
      return { id: u.id, name: u.name, email: u.email, role: r?.role || null }
    })
    res.json({ users: list })
  } catch (err) {
    console.error('Admin list users failed', err)
    res.status(500).json({ message: 'Failed to list users' })
  }
})

app.post('/api/admin/users/:id/role', authMiddleware, adminOnly, (req, res) => {
  try {
    const { id } = req.params
    const { role } = req.body || {}
    if (!role) return res.status(400).json({ message: 'Role required' })
    const rec = db.setUserRole(id, role)
    res.json({ role: rec })
  } catch (err) {
    console.error('Admin set role failed', err)
    res.status(500).json({ message: 'Failed to set role' })
  }
})

app.post('/api/admin/sync/:userId/google-fit', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params
    let tokenRecord = db.getGoogleFitTokens(userId) || db.getOAuthTokens(userId, 'google_fit')
    if (!tokenRecord) return res.status(404).json({ message: 'No tokens for user' })
    const tokens = await sync.ensureGoogleFitTokens(tokenRecord)
    if (tokens) db.storeOAuthTokens(userId, 'google_fit', tokens)
    const imported = await sync.fetchAndImportGoogleFitData(tokens, { db, userToken: null })
    db.insertSyncLog({ userId, provider: 'google_fit', status: 'success', importedCount: imported, message: 'Admin triggered import' })
    res.json({ imported })
  } catch (err) {
    console.error('Admin sync failed', err)
    res.status(500).json({ message: err.message || 'Admin sync failed' })
  }
})

app.delete('/api/admin/oauth/:userId/:provider', authMiddleware, adminOnly, (req, res) => {
  try {
    const { userId, provider } = req.params
    if (provider === 'google_fit') db.deleteGoogleFitTokens(userId)
    db.deleteOAuthTokens(userId, provider)
    db.insertSyncLog({ userId, provider, status: 'success', importedCount: 0, message: 'Admin revoked tokens' })
    res.json({ ok: true })
  } catch (err) {
    console.error('Admin revoke failed', err)
    res.status(500).json({ message: 'Failed to revoke tokens' })
  }
})

// Vitals: blood pressure, heart rate, weight, sleep
app.get('/api/health/vitals', authMiddleware, (req, res) => {
  const { from, to } = req.query || {}
  const list = db.getVitals({ from, to })
  res.json({ vitals: list })
})

// Activity: simple ring values and recent workouts
app.get('/api/health/activity', authMiddleware, (req, res) => {
  res.json({
    rings: { move: 0.72, exercise: 0.6, stand: 0.9 },
    workouts: [
      { id: 'w1', type: 'Walk', durationMins: 32, calories: 160, date: '2026-08-07' },
      { id: 'w2', type: 'Yoga', durationMins: 45, calories: 120, date: '2026-08-06' },
    ],
  })
})

// Metrics: sample trends for charts
app.get('/api/health/metrics', authMiddleware, (req, res) => {
  res.json({
    metrics: {
      heartRate: [
        { date: '2026-08-01', value: 65 },
        { date: '2026-08-03', value: 64 },
        { date: '2026-08-05', value: 66 },
        { date: '2026-08-07', value: 62 },
      ],
      weight: [
        { date: '2026-07-01', value: 74.2 },
        { date: '2026-07-15', value: 73.1 },
        { date: '2026-08-01', value: 72.8 },
        { date: '2026-08-07', value: 72.5 },
      ],
    },
  })
})

// FHIR export - returns a FHIR Bundle of Observations for vitals
app.get('/api/health/fhir/export', authMiddleware, (req, res) => {
  try {
    const { from, to } = req.query || {}
    const bundle = fhir.exportVitalsAsFHIRBundle({ from, to, user: req.user })
    res.json(bundle)
  } catch (err) {
    console.error('FHIR export failed', err)
    res.status(500).json({ message: 'FHIR export failed' })
  }
})

// Google Fit OAuth + import
app.post('/api/auth/google-fit', authMiddleware, (req, res) => {
  if (!process.env.GOOGLE_FIT_CLIENT_ID) return res.status(400).json({ message: 'Google Fit client not configured' })
  const frontendToken = (req.headers.authorization || '').replace('Bearer ', '')
  const state = Buffer.from(JSON.stringify({ token: frontendToken })).toString('base64')
  const url = sync.getGoogleFitAuthUrl(state)
  res.json({ url })
})

app.get('/api/auth/google-fit/callback', async (req, res) => {
  try {
    const { code, state } = req.query || {}
    const parsedState = state ? JSON.parse(Buffer.from(String(state), 'base64').toString('utf8')) : {}
    const appToken = parsedState && parsedState.token
    if (!code) return res.status(400).json({ message: 'Missing code' })
    if (!process.env.GOOGLE_FIT_CLIENT_ID || !process.env.GOOGLE_FIT_CLIENT_SECRET) {
      return res.status(500).send('Google Fit client not configured on server')
    }
    const tokens = await sync.exchangeGoogleCodeForTokens(String(code))
    if (appToken) {
      const payload = jwt.verify(appToken, JWT_SECRET)
      if (payload && payload.sub) {
        db.storeOAuthTokens(payload.sub, 'google_fit', { access_token: tokens.access_token, refresh_token: tokens.refresh_token, expires_in: tokens.expires_in })
      }
    }
    const imported = await sync.fetchAndImportGoogleFitData(tokens, { db, userToken: appToken })
    db.insertSyncLog({ userId: appToken ? jwt.verify(appToken, JWT_SECRET).sub : 'anonymous', provider: 'google_fit', status: 'success', importedCount: imported, message: 'Imported Google Fit metrics' })
    const redirectTo = (process.env.FRONTEND_URL || 'http://localhost:4173') + `/sync/result?status=ok&imported=${imported}`
    res.redirect(redirectTo)
  } catch (err) {
    console.error('Google Fit callback error', err)
    if (req.query.state) {
      try {
        const state = JSON.parse(Buffer.from(String(req.query.state), 'base64').toString('utf8'))
        const appToken = state.token
        if (appToken) {
          const payload = jwt.verify(appToken, JWT_SECRET)
          if (payload && payload.sub) {
            db.insertSyncLog({ userId: payload.sub, provider: 'google_fit', status: 'error', importedCount: 0, message: err.message || 'Google Fit callback error' })
          }
        }
      } catch (ignore) {}
    }
    res.status(500).json({ message: 'Google Fit sync failed' })
  }
})

app.post('/api/health/sync/google-fit', authMiddleware, async (req, res) => {
  try {
    let tokenRecord = db.getGoogleFitTokens(req.user.sub)
    if (!tokenRecord) tokenRecord = db.getOAuthTokens(req.user.sub, 'google_fit')
    if (!tokenRecord) {
      return res.status(404).json({ message: 'No Google Fit connection found. Please connect Google Fit first.' })
    }
    const tokens = await sync.ensureGoogleFitTokens(tokenRecord)
    // persist any refreshed tokens
    if (tokens) db.storeOAuthTokens(req.user.sub, 'google_fit', tokens)
    const imported = await sync.fetchAndImportGoogleFitData(tokens, { db, userToken: null })
    db.insertSyncLog({ userId: req.user.sub, provider: 'google_fit', status: 'success', importedCount: imported, message: 'Imported Google Fit metrics from saved connection' })
    res.json({ imported, status: 'ok' })
  } catch (err) {
    console.error('Google Fit stored sync failed', err)
    db.insertSyncLog({ userId: req.user.sub, provider: 'google_fit', status: 'error', importedCount: 0, message: err.message || 'Google Fit stored sync failed' })
    res.status(500).json({ message: err.message || 'Google Fit stored sync failed' })
  }
})

app.get('/api/health/sync/google-fit/status', authMiddleware, (req, res) => {
  try {
    let tokenRecord = db.getGoogleFitTokens(req.user.sub)
    if (!tokenRecord) tokenRecord = db.getOAuthTokens(req.user.sub, 'google_fit')
    const logs = db.getSyncLogs(req.user.sub, 'google_fit')
    res.json({
      connected: Boolean(tokenRecord),
      lastSync: logs?.[0]?.createdAt || null,
      tokenUpdatedAt: tokenRecord?.updatedAt || null,
    })
  } catch (err) {
    console.error('Google Fit status failed', err)
    res.status(500).json({ message: 'Unable to retrieve Google Fit status' })
  }
})

app.delete('/api/health/sync/google-fit', authMiddleware, (req, res) => {
  try {
    // remove tokens from legacy and new tables
    try { db.deleteGoogleFitTokens(req.user.sub) } catch(e) {}
    try { db.deleteOAuthTokens(req.user.sub, 'google_fit') } catch(e) {}
    db.insertSyncLog({ userId: req.user.sub, provider: 'google_fit', status: 'success', importedCount: 0, message: 'Disconnected Google Fit connection' })
    res.json({ disconnected: true })
  } catch (err) {
    console.error('Google Fit disconnect failed', err)
    res.status(500).json({ message: 'Google Fit disconnect failed' })
  }
})

// Apple Health import endpoint - accepts HealthKit export JSON/objects from a client (iOS) and maps to vitals
app.post('/api/health/sync/apple', authMiddleware, (req, res) => {
  try {
    const payload = req.body || {}
    const vitals = sync.mapAppleHealthPayloadToVitals(payload)
    if (!Array.isArray(vitals) || !vitals.length) {
      return res.status(400).json({ message: 'Invalid Apple Health payload or no vitals found' })
    }
    const added = db.insertVitals(vitals)
    db.insertSyncLog({ userId: req.user.sub, provider: 'apple_health', status: 'success', importedCount: added.length, message: 'Imported Apple Health vitals' })
    res.json({ imported: added.length })
  } catch (err) {
    console.error('Apple Health import failed', err)
    db.insertSyncLog({ userId: req.user.sub, provider: 'apple_health', status: 'error', importedCount: 0, message: err.message || 'Apple Health import failed' })
    res.status(500).json({ message: 'Apple Health import failed' })
  }
})

  app.post('/api/health/vitals', authMiddleware, (req, res) => {
    const { name, value, unit, recorded } = req.body
    if (!name || value === undefined) {
      return res.status(400).json({ message: 'Name and value are required' })
    }
    const entry = db.insertVital({ name, value, unit, recorded })
    res.status(201).json({ entry })
  })

  app.post('/api/health/import', authMiddleware, (req, res) => {
    const { vitals } = req.body || {}
    if (!Array.isArray(vitals)) return res.status(400).json({ message: 'Invalid payload' })
    const added = db.insertVitals(vitals)
    res.json({ imported: added.length })
  })

  app.get('/api/health/export', authMiddleware, (req, res) => {
    res.json(db.exportAll())
  })

  // Medications
  app.get('/api/health/medications', authMiddleware, (req, res) => {
    res.json({ medications: db.getMedications() })
  })

  app.post('/api/health/medications', authMiddleware, (req, res) => {
    const { name, dose, schedule } = req.body
    if (!name) return res.status(400).json({ message: 'Name required' })
    const med = db.insertMedication({ name, dose, schedule })
    res.status(201).json({ med })
  })

  app.patch('/api/health/medications/:id', authMiddleware, (req, res) => {
    const { id } = req.params
    const { name, dose, schedule } = req.body || {}
    const med = db.updateMedication(id, { name, dose, schedule })
    if (!med) return res.status(404).json({ message: 'Medication not found' })
    res.json({ med })
  })

  app.delete('/api/health/medications/:id', authMiddleware, (req, res) => {
    const { id } = req.params
    const ok = db.deleteMedication(id)
    if (!ok) return res.status(404).json({ message: 'Medication not found' })
    res.json({ ok: true })
  })

  app.get('/api/pharmacy/orders', authMiddleware, (req, res) => {
    try {
      const orders = db.getPharmacyOrders()
      res.json({ orders })
    } catch (err) {
      console.error('Failed to fetch pharmacy orders', err)
      res.status(500).json({ message: 'Failed to fetch pharmacy orders' })
    }
  })

  app.post('/api/pharmacy/order', authMiddleware, (req, res) => {
    const { name, dose, quantity, price } = req.body || {}
    if (!name || !dose) return res.status(400).json({ message: 'Name and dose are required' })
    const order = db.insertPharmacyOrder({ name, dose, quantity, price })
    try {
      db.insertMedication({ name, dose })
    } catch (e) {
      console.warn('Failed to add medication from pharmacy order', e)
    }
    res.status(201).json({ order })
  })

  app.delete('/api/pharmacy/order/:id', authMiddleware, (req, res) => {
    const { id } = req.params || {}
    const ok = db.deletePharmacyOrder(id)
    if (!ok) return res.status(404).json({ message: 'Order not found' })
    res.json({ ok: true })
  })

  app.get('/api/health/devices', authMiddleware, (req, res) => {
    try {
      const devices = db.getDeviceConnections()
      res.json({ devices })
    } catch (err) {
      console.error('Failed to fetch device connections', err)
      res.status(500).json({ message: 'Failed to fetch device connections' })
    }
  })

  app.post('/api/health/devices/connect', authMiddleware, (req, res) => {
    const { provider } = req.body || {}
    if (!provider) return res.status(400).json({ message: 'Provider is required' })
    const device = db.upsertDeviceConnection({ id: provider, name: provider.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase()), status: 'Connected', lastSynced: new Date().toISOString() })
    res.status(201).json({ device })
  })

  app.delete('/api/health/devices/:id', authMiddleware, (req, res) => {
    const { id } = req.params || {}
    const ok = db.deleteDeviceConnection(id)
    if (!ok) return res.status(404).json({ message: 'Device not found' })
    res.json({ ok: true })
  })

  app.get('/api/health/labs', authMiddleware, (req, res) => {
    try {
      const labs = db.getLabResults()
      res.json({ labs })
    } catch (err) {
      console.error('Failed to fetch labs', err)
      res.status(500).json({ message: 'Failed to fetch lab results' })
    }
  })

  app.post('/api/health/labs', authMiddleware, (req, res) => {
    const { name, value, unit, date, provider, notes } = req.body || {}
    if (!name || value === undefined) {
      return res.status(400).json({ message: 'Test name and value are required' })
    }
    try {
      const lab = db.insertLabResult({ name, value, unit, date, provider, notes })
      res.status(201).json({ lab })
    } catch (err) {
      console.error('Failed to create lab result', err)
      res.status(500).json({ message: 'Failed to create lab result' })
    }
  })

  app.get('/api/health/insurance', authMiddleware, (req, res) => {
    try {
      const summary = db.getInsuranceSummary()
      const claims = db.getInsuranceClaims()
      res.json({ summary, claims })
    } catch (err) {
      console.error('Failed to fetch insurance data', err)
      res.status(500).json({ message: 'Failed to fetch insurance data' })
    }
  })

  app.post('/api/health/insurance/claim', authMiddleware, (req, res) => {
    const { claimType, amount } = req.body || {}
    if (!claimType || !amount) return res.status(400).json({ message: 'Claim type and amount are required' })
    const claim = db.insertInsuranceClaim({ claimType, amount })
    res.status(201).json({ claim })
  })

  app.patch('/api/health/insurance/claim/:id', authMiddleware, (req, res) => {
    const { id } = req.params
    const { status } = req.body || {}
    if (!status) return res.status(400).json({ message: 'Status is required' })
    const claim = db.updateInsuranceClaimStatus(id, status)
    if (!claim) return res.status(404).json({ message: 'Claim not found' })
    res.json({ claim })
  })

  app.get('/api/health/telehealth', authMiddleware, (req, res) => {
    try {
      const visits = db.getTelehealthVisits()
      res.json({ visits })
    } catch (err) {
      console.error('Failed to fetch telehealth visits', err)
      res.status(500).json({ message: 'Failed to fetch telehealth visits' })
    }
  })

  app.post('/api/health/telehealth/book', authMiddleware, (req, res) => {
    const { provider, date, time } = req.body || {}
    if (!provider || !date || !time) return res.status(400).json({ message: 'Provider, date, and time are required' })
    const visit = db.insertTelehealthVisit({ provider, date, time, status: 'Scheduled' })
    res.status(201).json({ visit })
  })

  app.delete('/api/health/telehealth/:id', authMiddleware, (req, res) => {
    const { id } = req.params
    const ok = db.cancelTelehealthVisit(id)
    if (!ok) return res.status(404).json({ message: 'Visit not found' })
    res.json({ ok: true })
  })

  // Notifications / reminders
  app.get('/api/health/notifications', authMiddleware, (req, res) => {
    res.json({ notifications: db.getNotifications() })
  })

  app.get('/api/health/sync/history', authMiddleware, (req, res) => {
    const logs = db.getSyncLogs(req.user.sub)
    res.json({ history: logs })
  })

  app.post('/api/health/notifications', authMiddleware, (req, res) => {
    const { title, when, repeatDaily } = req.body || {}
    if (!title || !when) return res.status(400).json({ message: 'Title and time are required' })
    const note = db.insertNotification({ title, when, repeatDaily: !!repeatDaily })
    res.status(201).json({ notification: note })
  })

  app.delete('/api/health/notifications/:id', authMiddleware, (req, res) => {
    const { id } = req.params || {}
    db.deleteNotification(id)
    res.json({ ok: true })
  })

app.listen(PORT, () => {
  console.log(`Health Link API listening on port ${PORT}`)
})

// Simple background scheduler: refresh tokens and import Google Fit data hourly
async function runScheduledSyncs() {
  const maxRetries = Number(process.env.SYNC_MAX_RETRIES || 3)
  const baseDelay = Number(process.env.SYNC_RETRY_BASE_MS || 2000)
  try {
    const tokens = db.getAllOAuthTokens('google_fit') || []
    for (const t of tokens) {
      // attempt sync with retries and exponential backoff
      const attemptSync = async () => {
        let attempt = 0
        let delay = baseDelay
        while (attempt <= maxRetries) {
          try {
            const normalized = await sync.ensureGoogleFitTokens({ accessToken: t.accessToken || t.access_token, refreshToken: t.refreshToken || t.refresh_token, expiresAt: t.expiresAt })
            if (normalized) db.storeOAuthTokens(t.userId, 'google_fit', normalized)
            const imported = await sync.fetchAndImportGoogleFitData({ access_token: normalized.access_token || normalized.accessToken, refresh_token: normalized.refresh_token || normalized.refreshToken, expires_in: normalized.expires_in }, { db, userToken: null })
            db.insertSyncLog({ userId: t.userId, provider: 'google_fit', status: 'success', importedCount: imported, message: `Scheduled Google Fit import (attempt ${attempt + 1})` })
            return
          } catch (err) {
            attempt += 1
            if (attempt > maxRetries) {
              console.error('Scheduled sync failed after retries for user', t.userId, err)
              db.insertSyncLog({ userId: t.userId, provider: 'google_fit', status: 'error', importedCount: 0, message: err.message || 'Scheduled sync failed' })
              return
            }
            // sleep for delay
            await new Promise((res) => setTimeout(res, delay))
            delay = Math.min(delay * 2, 1000 * 60 * 5) // cap backoff at 5 minutes
          }
        }
      }

      // fire and forget per-user sync to avoid blocking others
      attemptSync().catch((e) => console.error('Unexpected scheduler error for user', t.userId, e))
    }
  } catch (err) {
    console.error('Scheduled sync runner failed', err)
  }
}

// scheduler interval configuration
const intervalMinutes = Number(process.env.SYNC_INTERVAL_MINUTES || 60)
const intervalMs = Math.max(1000 * 60, Math.floor(intervalMinutes) * 60 * 1000)

// run at startup and then on configured interval
runScheduledSyncs().catch(() => {})
setInterval(() => runScheduledSyncs().catch(() => {}), intervalMs)
