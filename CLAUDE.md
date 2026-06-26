# Workr Lite CMS — Astri

Multi-tenant CMS for Investor Relations (RI) websites, branded as **Astri / Workr Lite**.

## Project structure

```
workr-lite-v1/
├── apps/
│   └── web-admin/          # React + TypeScript SPA (admin panel)
│       ├── src/
│       │   ├── contexts/   # AuthContext
│       │   ├── components/ # ProtectedRoute, shared UI
│       │   ├── pages/      # LoginPage, DashboardPage
│       │   └── styles/     # globals.css
│       ├── index.html
│       ├── vite.config.ts
│       └── package.json
└── vercel.json             # Vercel deployment config
```

## Stack

- **Frontend**: Vite + React 18 + TypeScript + React Router v6
- **Backend**: Go (planned — not yet implemented)
- **CSS**: Custom CSS (no Tailwind, no component library)
- **Fonts**: Plus Jakarta Sans (headings) + Inter (body) via Google Fonts
- **Deploy**: Vercel (configured via root `vercel.json`)

## Brand

| Token | Value | Usage |
|---|---|---|
| Green | `#00D865` | Accent/highlight (not as text on white) |
| Teal | `#0B5B68` | Links / primary actions |
| Dark | `#141414` | Text |
| Gray 1 | `#6F6F6F` | Secondary text |
| Gray 2 | `#949494` | Tertiary text |
| Gray 3 | `#B8B8B8` | Placeholders/muted |
| BG Light | `#F4F4F4` | Page background |
| BG Lighter | `#FAFAFA` | Input background |

## Auth (hardcoded for now)

- Email: `admin@astri.solutions`
- Password: `workr2025`
- Session persisted in `localStorage` (key: `workr_auth`)

## Routes

| Path | Component | Guard |
|---|---|---|
| `/` | → redirect | — |
| `/login` | `LoginPage` | Public |
| `/dashboard` | `DashboardPage` | `ProtectedRoute` |

## Running locally

```bash
cd apps/web-admin
npm install
npm run dev
```

## Deployment

Vercel is configured at the repo root via `vercel.json`. It builds `apps/web-admin` and serves `apps/web-admin/dist`.
