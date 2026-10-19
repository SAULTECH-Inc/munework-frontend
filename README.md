# Mune Work – Web App

Frontend for **Mune Work**, a job platform connecting applicants and employers.

- **Applicants:** search and save jobs, quick-apply, build and upload CVs and
  cover letters, set up auto-apply, track applications and interviews, and
  take assessments.
- **Employers:** post jobs (including importing a recruitment flier), screen
  and scout candidates, schedule interviews, run assessments, and view
  analytics.
- **Shared:** real-time chat and notifications, a professional network,
  subscriptions, and a developer portal for API keys, webhooks, and usage.

Built with React 18, TypeScript, Vite, Tailwind CSS, Radix UI, TanStack Query,
Zustand, and Socket.IO.

## Getting started

Requirements: Node.js 20+ and the Mune Work API (`munework-backend`) running
locally on port 3000.

```bash
npm install
cp .env.example .env
npm run dev
```

The dev server runs at http://localhost:5175 and proxies `/api` and
`/socket.io` to `http://localhost:3000`.

## Environment variables

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | API base URL including `/api/v1`. Defaults to `/api/v1` (the dev proxy). |
| `VITE_WS_BASE_URL` | Optional realtime host for Socket.IO. Defaults to the API host. Sockets are skipped for `*.vercel.app` hosts, and chat and notifications fall back to polling. |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | Firebase web app config for push notifications |
| `VITE_FIREBASE_VAPID_KEY` | Web push certificate key for Firebase Cloud Messaging |

`VITE_*` values are compiled into the bundle and visible to every visitor, so
never put secrets in them. For production, set them as build environment
variables on the hosting platform, not in a committed file.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check, build to `dist/`, and generate the sitemap |
| `npm run preview` | Serve the production build locally |
| `npm run sitemap` | Regenerate `dist/sitemap.xml` only |

## Deployment

- **Netlify:** `netlify.toml` builds with `npm run build`, publishes `dist/`,
  and rewrites all routes to `index.html` for client-side routing.
- **Docker:** the multi-stage `Dockerfile` builds the app and serves it with
  nginx using `nginx.conf`.

`dist/` is build output and is not committed.

## Project structure

```
src/
├── components/   Shared UI (common/), feature widgets (features/), primitives (ui/)
├── layouts/      App, auth, and public page shells
├── lib/          API client, sockets, Firebase, SEO, and helpers
├── pages/        Routes: applicant/, employer/, jobs/, auth/, settings/, and public pages
├── store/        Zustand stores (auth, UI)
└── types/        Shared TypeScript types
```

Brand assets and where to use them are documented in
[`public/brand/README.md`](public/brand/README.md).
