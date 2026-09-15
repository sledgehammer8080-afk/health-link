# Health Link Project Report

## Overview

Health Link is a family health coordination web app built with React, TypeScript, Vite, Express, and SQLite with a JSON fallback. It brings daily care tasks, appointments, vitals, medications, pharmacy activity, lab results, insurance, telehealth, reminders, and connected devices into one protected dashboard.

## Current Features

- Protected dashboard with family health score, upcoming appointments, task progress, reminders, pharmacy orders, connected devices, lab results, insurance overview, and telehealth visits.
- Card-based quick actions for common care workflows.
- Emergency tab with an always-visible 112 call action, device location sharing, ambulance request guidance, and Google Maps hospital directions.
- Status-aware icons for task progress, device type, pharmacy orders, reminders, and telehealth visits.
- Insurance policy summary with a toggleable digital insurance card showing provider, plan, member ID, status, effective date, and renewal date.
- Vitals entry and charting, medication management, pharmacy ordering, device connections, lab records, insurance claims, telehealth booking, and browser reminders.

## Admin Dashboard

The protected Admin Dashboard is available at `/admin` to authorized administrators. It provides:

- User and role management.
- OAuth token review, refresh, and revocation.
- Google Fit sync controls and sync activity history.
- Medication and pharmacy overview.
- Summary counts for users, administrators, provider connections, sync events, and medication records.

Admin access is enforced by the backend through authenticated requests and an admin-only middleware. The sidebar displays the Admin tab only for an authorized administrator.

## Emergency and Safety Notes

The emergency workflow supports fast access to local emergency services and hospital navigation, but it does not replace a real dispatch service. For a life-threatening emergency, users should call the local emergency number immediately. The current interface uses `112` for the primary call action and ambulance request, requests geolocation only when the user chooses to share it, and opens the device share sheet or copies a Google Maps location link when native sharing is unavailable.

## Run Locally

Install dependencies and start the frontend and backend together:

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:4173`
- Backend API: `http://localhost:4174`

The frontend and backend can also be started separately with `npm run dev:app` and `npm run dev:server`.

To update the Android app after frontend changes:

```bash
npm run build
npx cap sync android
```

The current Android project is synchronized from the latest `dist` bundle. The native development build uses the computer LAN address `http://192.168.100.92:4174`; set `VITE_API_URL` to the computer's current LAN address when the network changes. The phone and computer must be on the same network, and the backend port must be allowed through the Windows firewall.

Google sign-in requires real `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` values from Google Cloud Console. Set `GOOGLE_CALLBACK` to `http://localhost:4174/api/auth/google/callback` and `FRONTEND_URL` to `http://localhost:4173` for local browser development, register the callback URL in Google Cloud Console, and restart the backend. Keep `.env` private and never commit it.

## Host the Backend on Render

The repository includes `render.yaml` for deploying the Express API as a Render web service. The service uses the Render `PORT` value automatically and stores the SQLite database and fallback data on a persistent disk.

1. Push this repository to GitHub.
2. In Render, choose **New > Blueprint**, connect the repository, and apply `render.yaml`.
3. Set `FRONTEND_URL` to the public URL where the frontend is hosted. For multiple frontend URLs, separate them with commas.
4. Set `GOOGLE_CALLBACK` to `<backend-url>/api/auth/google/callback` and add that exact URL to Google Cloud Console.
5. After deployment, confirm `<backend-url>/health` returns `{"status":"ok"}`.

For a separately hosted frontend, set `VITE_API_URL` to the backend URL before building it, for example `https://health-link-api.onrender.com`, then run `npm run build`. The value is compiled into the frontend, so redeploy the frontend after changing it. For local development, leave `VITE_API_URL` empty and the Vite proxy will continue to use the local backend.

## Validation

The production build is validated with:

```bash
npm run build
```

The current build completes successfully with TypeScript checking followed by the Vite production bundle.
