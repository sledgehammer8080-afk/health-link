// Use global fetch when available (Node 18+). Do not require an extra dependency here.
const fetchImpl = globalThis.fetch
if (!fetchImpl) {
  console.warn('Global fetch is not available; ensure node-fetch is installed as a fallback.')
}

const GOOGLE_AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const FITNESS_AGGREGATE_URL = 'https://fitness.googleapis.com/fitness/v1/users/me/dataset:aggregate'

export function getGoogleFitAuthUrl(state) {
  const clientId = process.env.GOOGLE_FIT_CLIENT_ID
  const redirect = process.env.GOOGLE_FIT_CALLBACK || 'http://localhost:4174/api/auth/google-fit/callback'
  const scope = [
    'https://www.googleapis.com/auth/fitness.body.read',
    'https://www.googleapis.com/auth/fitness.activity.read',
    'https://www.googleapis.com/auth/fitness.heart_rate.read',
  ].join(' ')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: 'code',
    scope,
    access_type: 'offline',
    prompt: 'consent',
    state: state || '',
  })

  return `${GOOGLE_AUTH_BASE}?${params.toString()}`
}

export async function exchangeGoogleCodeForTokens(code) {
  const params = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_FIT_CLIENT_ID,
    client_secret: process.env.GOOGLE_FIT_CLIENT_SECRET,
    redirect_uri: process.env.GOOGLE_FIT_CALLBACK || 'http://localhost:4174/api/auth/google-fit/callback',
    grant_type: 'authorization_code',
  })

  const resp = await fetch(GOOGLE_TOKEN_URL, { method: 'POST', body: params })
  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`Token exchange failed: ${resp.status} ${body}`)
  }
  const data = await resp.json()
  return data // contains access_token, refresh_token, expires_in
}

export async function refreshGoogleFitAccessToken(refreshToken) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_FIT_CLIENT_ID,
    client_secret: process.env.GOOGLE_FIT_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })
  const resp = await fetch(GOOGLE_TOKEN_URL, { method: 'POST', body: params })
  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`Refresh token failed: ${resp.status} ${body}`)
  }
  const data = await resp.json()
  return data
}

export async function ensureGoogleFitTokens(tokens) {
  if (!tokens) throw new Error('No Google Fit token available')
  const now = Date.now()
  if (tokens.expiresAt && Number(tokens.expiresAt) > now) {
    return tokens
  }
  if (!tokens.refreshToken) {
    throw new Error('Google Fit refresh token missing')
  }
  const refreshed = await refreshGoogleFitAccessToken(tokens.refreshToken)
  return {
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token || tokens.refreshToken,
    expires_in: refreshed.expires_in,
    expiresAt: Date.now() + (refreshed.expires_in || 0) * 1000,
  }
}

function msSince(days) {
  return Date.now() - (days || 7) * 24 * 60 * 60 * 1000
}

// Fetch a simple aggregate (heart rate and steps) and insert into db
export async function fetchAndImportGoogleFitData(tokens, { db, userToken } = {}) {
  // request last 7 days
  const end = Date.now()
  const start = msSince(7)

  const body = {
    aggregateBy: [
      { dataTypeName: 'com.google.heart_rate.bpm' },
      { dataTypeName: 'com.google.step_count.delta' },
    ],
    bucketByTime: { durationMillis: 24 * 60 * 60 * 1000 },
    startTimeMillis: String(start),
    endTimeMillis: String(end),
  }

  const resp = await (fetchImpl || fetch)(FITNESS_AGGREGATE_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error(`Fitness aggregate failed: ${resp.status} ${txt}`)
  }

  const data = await resp.json()
  const vitalsToInsert = []

  // parse buckets -> datasets -> point
  if (Array.isArray(data.bucket)) {
    for (const bucket of data.bucket) {
      const tsMillis = bucket.startTimeMillis || Date.now()
      const date = new Date(Number(tsMillis)).toISOString()
      if (Array.isArray(bucket.dataset)) {
        for (const ds of bucket.dataset) {
          if (!Array.isArray(ds.point)) continue
          for (const pt of ds.point) {
            const value = pt.value && pt.value[0]
            if (!value) continue
            // try numeric
            const val = value.fpVal ?? value.intVal ?? value.mapVal ?? null
            if (val === null) continue
            // determine type from dataSourceId or dataTypeName
            const dataType = pt.dataTypeName || ds.dataSourceId || ''
            if (String(dataType).includes('heart_rate') || String(dataType).includes('heart_rate.bpm') || String(dataType).includes('heart_rate.bpm')) {
              vitalsToInsert.push({ name: 'heart_rate', value: val, unit: 'bpm', recorded: date })
            } else if (String(dataType).includes('step') || String(dataType).includes('step_count')) {
              vitalsToInsert.push({ name: 'steps', value: val, unit: 'count', recorded: date })
            } else {
              // generic
              vitalsToInsert.push({ name: String(dataType || 'fitness_metric'), value: val, recorded: date })
            }
          }
        }
      }
    }
  }

  if (vitalsToInsert.length) {
    const added = db.insertVitals(vitalsToInsert)
    return added.length
  }
  return 0
}

function normalizeDate(value) {
  if (!value) return new Date().toISOString()
  const date = new Date(value)
  return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

function mapHealthKitType(typeIdentifier) {
  const key = String(typeIdentifier || '').toLowerCase()
  if (key.includes('heart')) return 'heart_rate'
  if (key.includes('bloodpressure') || key.includes('blood_pressure')) {
    return key.includes('systolic') ? 'blood_pressure_systolic' : key.includes('diastolic') ? 'blood_pressure_diastolic' : 'blood_pressure'
  }
  if (key.includes('bodymass') || key.includes('weight')) return 'weight'
  if (key.includes('stepcount') || key.includes('steps')) return 'steps'
  if (key.includes('sleep')) return 'sleep'
  return key.replace(/[^a-z0-9_]/g, '_') || 'health_metric'
}

export function mapAppleHealthPayloadToVitals(payload) {
  if (!payload || typeof payload !== 'object') return []

  const records = Array.isArray(payload.vitals)
    ? payload.vitals
    : Array.isArray(payload.records)
    ? payload.records
    : Array.isArray(payload.healthRecords)
    ? payload.healthRecords
    : []

  const vitals = []
  for (const item of records) {
    if (!item || typeof item !== 'object') continue
    const name = item.name || item.type || mapHealthKitType(item.typeIdentifier || item.type)
    const rawValue = item.value ?? item.quantity ?? item.valueString
    const value = typeof rawValue === 'string' && !isNaN(Number(rawValue)) ? Number(rawValue) : rawValue
    const unit = item.unit || item.unitString || item.valueUnit || ''
    const recorded = normalizeDate(item.startDate || item.date || item.createdAt || item.recordedAt)
    vitals.push({ name, value, unit, recorded })
  }

  return vitals
}

export default { getGoogleFitAuthUrl, exchangeGoogleCodeForTokens, fetchAndImportGoogleFitData, mapAppleHealthPayloadToVitals }
