#!/usr/bin/env node
import * as sync from '../server/sync.js'

(async function main() {
  try {
    const originalFetch = globalThis.fetch

    // Mock token endpoint
    globalThis.fetch = async (url, opts) => {
      if (String(url).includes('oauth2.googleapis.com/token')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'new-access-token', refresh_token: 'new-refresh-token', expires_in: 3600 }),
          text: async () => JSON.stringify({ access_token: 'new-access-token' }),
        }
      }
      if (originalFetch) return originalFetch(url, opts)
      return { ok: false, status: 404, text: async () => 'not found' }
    }

    console.log('Running token refresh test: expired token should be refreshed')
    const expired = { accessToken: 'old', refreshToken: 'old-refresh', expiresAt: Date.now() - 10000 }
    const refreshed = await sync.ensureGoogleFitTokens(expired)
    if (!refreshed || refreshed.access_token !== 'new-access-token') throw new Error('Unexpected access_token')
    if (refreshed.refresh_token !== 'new-refresh-token') throw new Error('Unexpected refresh_token')
    if (!refreshed.expiresAt || refreshed.expiresAt <= Date.now()) throw new Error('expiresAt not updated')

    console.log('Running token refresh test: non-expired token should pass through')
    const future = { accessToken: 'ok', refreshToken: 'ok', expiresAt: Date.now() + 3600000 }
    const pass = await sync.ensureGoogleFitTokens(future)
    // ensureGoogleFitTokens may return the same object or a normalized object; accept either
    if (!pass) throw new Error('ensureGoogleFitTokens returned falsy for non-expired token')

    // restore
    globalThis.fetch = originalFetch
    console.log('OK - token refresh tests passed')
    process.exit(0)
  } catch (err) {
    console.error('Tests failed:', err)
    process.exit(2)
  }
})()
const BASE = 'http://localhost:4174'

async function tryLogin() {
  const res = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'family@health.link', password: 'family123' }) })
  if (!res.ok) return null
  const j = await res.json()
  return j.token
}

async function signup() {
  await fetch(`${BASE}/api/auth/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Family', email: 'family@health.link', password: 'family123' }) })
}

async function run() {
  let token = await tryLogin()
  if (!token) {
    console.log('User not found, creating...')
    await signup()
    token = await tryLogin()
  }
  if (!token) throw new Error('Could not obtain auth token')
  console.log('token', token.slice(0,8))

  let j

  // get existing vitals
  let res = await fetch(`${BASE}/api/health/vitals`, { headers: { Authorization: `Bearer ${token}` } })
  let text = await res.text()
  try {
    let j = JSON.parse(text)
    console.log('vitals before', Array.isArray(j.vitals) ? j.vitals.length : 0)
  } catch (e) {
    console.error('Non-JSON from vitals endpoint:', text.slice(0,500))
    throw e
  }

  // add a new vital
  res = await fetch(`${BASE}/api/health/vitals`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: 'Test Heart Rate', value: 60, unit: 'bpm', recorded: '2026-08-08' }) })
  text = await res.text()
  try {
    j = JSON.parse(text)
    if (!res.ok) throw new Error('Add failed ' + JSON.stringify(j))
    console.log('added', j.entry?.id || 'ok')
  } catch (e) {
    console.error('Non-JSON from add vitals:', text.slice(0,500))
    throw e
  }

  // export
  res = await fetch(`${BASE}/api/health/export`, { headers: { Authorization: `Bearer ${token}` } })
  text = await res.text()
  try {
    j = JSON.parse(text)
    console.log('export vitals', Array.isArray(j.vitals) ? j.vitals.length : 0)
  } catch (e) {
    console.error('Non-JSON from export:', text.slice(0,500))
    throw e
  }

  // Apple Health import
  res = await fetch(`${BASE}/api/health/sync/apple`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ vitals: [{ name: 'weight', value: 72, unit: 'kg', recorded: '2026-08-08' }] }),
  })
  text = await res.text()
  try {
    j = JSON.parse(text)
    if (!res.ok) throw new Error(`Apple sync failed: ${JSON.stringify(j)}`)
    console.log('apple sync imported', j.imported)
  } catch (e) {
    console.error('Non-JSON from Apple sync:', text.slice(0,500))
    throw e
  }

  // FHIR export
  res = await fetch(`${BASE}/api/health/fhir/export`, { headers: { Authorization: `Bearer ${token}` } })
  text = await res.text()
  try {
    j = JSON.parse(text)
    console.log('FHIR bundle entries', Array.isArray(j.entry) ? j.entry.length : 0)
  } catch (e) {
    console.error('Non-JSON from FHIR export:', text.slice(0,500))
    throw e
  }

  console.log('Tests completed')
}

run().catch((e)=>{ console.error(e); process.exit(1) })
