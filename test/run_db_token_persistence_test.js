#!/usr/bin/env node
import * as db from '../server/db.js'
import * as sync from '../server/sync.js'

(async function main() {
  const userId = 'test-db-user-1'
  try {
    // cleanup
    try { db.deleteOAuthTokens(userId, 'google_fit') } catch (e) {}

    // store expired token
    db.storeOAuthTokens(userId, 'google_fit', { accessToken: 'old-access', refreshToken: 'old-refresh', expiresAt: Date.now() - 10000 })

    // mock Google's token endpoint
    const origFetch = globalThis.fetch
    globalThis.fetch = async (url, opts) => {
      if (String(url).includes('oauth2.googleapis.com/token')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'db-new-access', refresh_token: 'db-new-refresh', expires_in: 3600 }),
          text: async () => JSON.stringify({ access_token: 'db-new-access' }),
        }
      }
      if (origFetch) return origFetch(url, opts)
      return { ok: false, status: 404, text: async () => 'not found' }
    }

    console.log('Stored expired token, calling ensureGoogleFitTokens...')
    const tokenRecord = db.getOAuthTokens(userId, 'google_fit')
    const refreshed = await sync.ensureGoogleFitTokens(tokenRecord)
    // persist refreshed tokens
    db.storeOAuthTokens(userId, 'google_fit', refreshed)

    const stored = db.getOAuthTokens(userId, 'google_fit')
    if (!stored) throw new Error('No stored token after refresh')
    if (stored.accessToken !== 'db-new-access') throw new Error('accessToken not updated in DB')
    if (stored.refreshToken !== 'db-new-refresh') throw new Error('refreshToken not updated in DB')

    // cleanup
    db.deleteOAuthTokens(userId, 'google_fit')
    globalThis.fetch = origFetch

    console.log('OK - DB persistence test passed')
    process.exit(0)
  } catch (err) {
    console.error('DB persistence test failed:', err)
    try { db.deleteOAuthTokens(userId, 'google_fit') } catch (e) {}
    process.exit(2)
  }
})()
