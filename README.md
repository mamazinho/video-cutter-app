# Video Cutter App (Frontend MVP)

React + Vite frontend for a pay-per-cut video clipping product.

## Features

- Landing page with clear value proposition
- Google popup login with Firebase Authentication (no redirect)
- Authenticated dashboard with:
  - user profile
  - current credits balance
  - Mercado Pago checkout trigger
  - video upload form (upload-only MVP)
  - requested cuts selector
  - jobs list
- Job detail page with status polling and clip download links
- Simple API client prepared for FastAPI backend integration

## Tech stack

- React + Vite
- Firebase Authentication
- React Router
- Plain CSS

## Environment variables

Create a `.env` file (or copy from `.env.example`) and set:

```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
```

## Backend endpoints expected

- `POST /auth/firebase` (Firebase token exchange/bootstrap)
- `GET /wallet/balance`
- `POST /billing/checkout`
- `POST /uploads/request`
- `PUT <upload_url returned by backend>`
- `POST /uploads/complete`
- `POST /jobs`
- `GET /jobs`
- `GET /jobs/{job_id}`

## Local development

```bash
npm install
npm run dev
```

Then open `http://localhost:5173`.

## Build

```bash
npm run build
npm run preview
```

## Notes

- This MVP intentionally supports **video upload only** (no URL ingestion).
- If backend payloads differ, adjust mappings in `src/api/client.js` and pages.
