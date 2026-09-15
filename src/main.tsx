import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth/AuthProvider'
import { buildApiUrl } from './lib/api'
import './styles.css'

const originalFetch = window.fetch.bind(window)

window.fetch = (input, init) => {
  if (typeof input === 'string' && input.startsWith('/api')) {
    input = buildApiUrl(input)
  }
  return originalFetch(input, init)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
