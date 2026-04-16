# Video Cutter App (Frontend MVP)

React + Vite frontend for a pay-per-cut video clipping MVP.

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
- TypeScript
- Firebase Authentication
- React Router
- Plain CSS

## Environment variables

Create a `.env` file (or copy from `.env.example`) and set:

```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_API_PREFIX=/api
VITE_APP_BASE_PATH=/
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
```

### Variable notes

- `VITE_API_BASE_URL`: backend host (local example: `http://localhost:8000`)
- `VITE_API_PREFIX`: API prefix used by backend routes (default MVP contract: `/api`)
- `VITE_APP_BASE_PATH`: router/build base path (`/` locally; `/video-cutter-app/` on GitHub Pages)

## API contract used by the frontend

All requests use `VITE_API_BASE_URL + VITE_API_PREFIX`.

- `POST /auth/firebase` (Firebase token bootstrap)
- `GET /wallet/balance` (credits/saldo)
- `POST /billing/checkout` (Mercado Pago checkout)
- `POST /uploads/request`
- `PUT <upload_url returned by backend>`
- `POST /uploads/complete`
- `POST /jobs` (create processing job)
- `GET /jobs` (list jobs)
- `GET /jobs/{job_id}` (status/details + clips)

The API client is tolerant to common response aliases (for example `checkout_url`/`init_point`, `balance`/`credits`, etc.) to keep the frontend aligned with backend payload variations.

## Local development

```bash
npm install
npm run dev
```

Then open `http://localhost:5173`.

To point to a local API, keep `VITE_API_BASE_URL=http://localhost:8000` and set the correct `VITE_API_PREFIX` for your backend (`/api` or empty).

## Type checking

```bash
npm run typecheck
```

## Build

```bash
npm run build
npm run preview
```

## GitHub Pages deploy

This repo includes `.github/workflows/deploy-pages.yml` to build and deploy to GitHub Pages.

Required repository **Actions variables**:

- `VITE_API_BASE_URL`
- `VITE_API_PREFIX`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

The workflow sets `VITE_APP_BASE_PATH=/video-cutter-app/` and copies `dist/index.html` to `dist/404.html` so React Router works when reloading internal SPA routes on GitHub Pages.

## Local vs GitHub Pages

- Local dev: `VITE_APP_BASE_PATH=/`
- GitHub Pages: `VITE_APP_BASE_PATH=/video-cutter-app/`
- Same API client and routes; only base path and deploy environment variables differ.

## Notes

- This MVP intentionally supports **video upload only** (no URL ingestion).
- Critical business rules (credits/payment/processing decisions) stay in the backend.
