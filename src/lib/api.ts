const API_PORT = 4174

export function getApiBaseUrl(): string {
  const configured = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  if (configured) return configured

  const isAndroidApp = /Android/i.test(window.navigator.userAgent)
  const candidates = isAndroidApp
    ? ['http://localhost:4174', 'http://10.0.2.2:4174', 'http://127.0.0.1:4174']
    : ['http://localhost:4174', 'http://127.0.0.1:4174', 'http://10.0.2.2:4174']

  const active = candidates[0] || `http://localhost:${API_PORT}`
  return active
}

export function buildApiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${getApiBaseUrl()}${normalized}`
}
