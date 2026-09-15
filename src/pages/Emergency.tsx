import { useState } from 'react'

type LocationState = {
  latitude: number
  longitude: number
}

export default function Emergency() {
  const [location, setLocation] = useState<LocationState | null>(null)
  const [locationStatus, setLocationStatus] = useState('Location has not been shared')
  const [requestStatus, setRequestStatus] = useState('')

  const shareLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Location services are not available on this device')
      return
    }

    setLocationStatus('Finding your location...')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nextLocation = { latitude: coords.latitude, longitude: coords.longitude }
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`
        setLocation(nextLocation)

        if (navigator.share) {
          navigator.share({
            title: 'Health Link emergency location',
            text: 'My current location for emergency assistance:',
            url: mapsUrl,
          }).then(
            () => setLocationStatus('Location shared successfully'),
            () => setLocationStatus('Location ready for emergency services'),
          )
          return
        }

        if (navigator.clipboard) {
          navigator.clipboard.writeText(mapsUrl).then(
            () => setLocationStatus('Location link copied. Share it with emergency services.'),
            () => setLocationStatus('Location ready for emergency services'),
          )
        } else {
          setLocationStatus('Location ready for emergency services')
        }
      },
      () => setLocationStatus('Location access was not granted. You can still call emergency services.'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const requestAmbulance = () => {
    if (!location) {
      shareLocation()
      setRequestStatus('Share your location first so responders know where to go.')
      return
    }

    setRequestStatus('Opening the phone dialer to confirm your ambulance request.')
    window.location.href = 'tel:112'
  }

  const directionsUrl = location
    ? `https://www.google.com/maps/dir/?api=1&origin=${location.latitude},${location.longitude}&destination=hospitals&travelmode=driving`
    : 'https://www.google.com/maps/search/?api=1&query=nearest+hospital'

  return (
    <div className="page emergency-page">
      <div className="emergency-hero">
        <div>
          <span className="eyebrow emergency-eyebrow">Emergency support</span>
          <h1>Get help quickly</h1>
          <p>Request an ambulance or find directions to the nearest hospital from your current location.</p>
        </div>
        <a className="button emergency-call-button" href="tel:112" aria-label="Call emergency services at 112">Call 112</a>
      </div>

      <div className="emergency-alert" role="alert">
        <strong>For life-threatening emergencies, call 112 immediately.</strong>
        <span>Do not wait for this page to load or for location sharing to finish.</span>
      </div>

      <div className="dashboard-grid emergency-grid">
        <section className="dashboard-card emergency-card emergency-request-card">
          <div className="emergency-card-icon" aria-hidden="true">🚑</div>
          <h2>Request an ambulance</h2>
          <p>Share your location, then contact emergency services to confirm the request and describe the situation.</p>
          <div className="emergency-location-status" aria-live="polite">
            <span className={`location-dot${location ? ' location-dot-ready' : ''}`} aria-hidden="true" />
            <span>{locationStatus}</span>
          </div>
          <div className="button-row button-row-start emergency-actions">
            <button className="button button-danger" type="button" onClick={requestAmbulance}>Request ambulance</button>
            <button className="button button-secondary" type="button" onClick={shareLocation}>Share my location</button>
          </div>
          {requestStatus && <p className="emergency-status" aria-live="polite">{requestStatus}</p>}
        </section>

        <section className="dashboard-card emergency-card">
          <div className="emergency-card-icon" aria-hidden="true">🏥</div>
          <h2>Find the nearest hospital</h2>
          <p>Open turn-by-turn driving directions to nearby hospitals using your current location.</p>
          <div className="hospital-route-preview">
            <span className="route-pin route-pin-start" aria-hidden="true" />
            <div>
              <strong>{location ? 'Your current location' : 'Your location'}</strong>
              <span>{location ? 'Ready for directions' : 'Location will be requested by Maps'}</span>
            </div>
            <span className="route-line" aria-hidden="true" />
            <div>
              <strong>Nearest hospital</strong>
              <span>Open in Google Maps</span>
            </div>
            <span className="route-pin route-pin-end" aria-hidden="true" />
          </div>
          <a className="button hospital-button" href={directionsUrl} target="_blank" rel="noreferrer">Get hospital directions</a>
        </section>
      </div>
    </div>
  )
}
