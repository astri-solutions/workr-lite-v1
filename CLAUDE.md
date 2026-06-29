# Workr Lite CMS — Astri

Multi-tenant CMS for Investor Relations (RI) websites, branded as **Astri / Workr Lite**.

## Git workflow

**Commit always directly to `main`.** Do not create feature branches. Push every change straight to `main` so Vercel deploys immediately without PRs.

```bash
git add -A
git commit -m "..."
git push origin main
```

## Project structure

```
workr-lite-v1/
├── apps/
│   └── web-admin/          # React + TypeScript SPA (admin panel)
│       ├── src/
│       │   ├── contexts/   # AuthContext
│       │   ├── components/ # ProtectedRoute, AppSidebar, AppTopbar, Modal, PageHeader, ChannelEditor
│       │   ├── pages/
│       │   │   ├── admin/  # PortaisPage, NovoPortalPage, UsuariosPage, AutoCvmPage, PainelControlePage, AnalyticsPage, InformacoesPage
│       │   │   └── portal/ # CentralDeResultadosPage, DocumentosPage, CanaisPage, EmpresasPage,
│       │   │               # UsuariosPortalPage, MidiaPage, MateriasPage, InteracoesPage,
│       │   │               # LayoutPage, CoresPage, FontesPage, LogotipoPage, FaviconPage, BannerPage,
│       │   │               # InformacoesPortalPage
│       │   ├── styles/     # globals.css (CSS custom properties / design tokens)
│       │   └── utils/      # colorUtils.ts
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
- **Deploy**: Vercel (configured via root `vercel.json`) — deploys automatically on push to `main`

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

| Email | Password | Role |
|---|---|---|
| `admin@astri.solutions` | `workr2025` | `super_admin` → `/admin/portais` |
| `cliente@demo.com` | `demo2025` | `client_user` → `/portal` |

Session persisted in `localStorage` (key: `workr_auth`).

## Routes

### Admin (`/admin`) — super_admin only
| Path | Page |
|---|---|
| `/admin/portais` | PortaisPage |
| `/admin/portais/novo` | NovoPortalPage (wizard 7 or 8 steps) |
| `/admin/portais/:siteId/painel` | PainelControlePage |
| `/admin/portais/:siteId/analytics` | AnalyticsPage |
| `/admin/usuarios` | UsuariosPage |
| `/admin/auto-cvm` | AutoCvmPage |
| `/admin/informacoes` | InformacoesPage |

### Portal (`/portal`) — client_user only
| Path | Page |
|---|---|
| `/portal/empresas` | EmpresasPage |
| `/portal/usuarios-portal` | UsuariosPortalPage |
| `/portal/central-de-resultados` | CentralDeResultadosPage |
| `/portal/documentos` | DocumentosPage |
| `/portal/midia` | MidiaPage |
| `/portal/canais` | CanaisPage |
| `/portal/materias` | MateriasPage |
| `/portal/interacoes` | InteracoesPage |
| `/portal/layout` | LayoutPage |
| `/portal/cores` | CoresPage |
| `/portal/fontes` | FontesPage |
| `/portal/logotipo` | LogotipoPage |
| `/portal/favicon` | FaviconPage |
| `/portal/banner` | BannerPage |
| `/portal/informacoes` | InformacoesPortalPage |

## UI conventions

- **Filter selects**: Always use `className="filter-select"` on `<select>` elements in toolbars/filterbars. Never create page-specific filter classes (no `mat-filter`, `int-filter`, etc.). The shared rule lives in `AdminPages.css`.

## Architecture notes

- **Empresas** = document repositories within a portal (e.g. Itaú BB, Itaú Negócios). Not separate sites — sub-entities sharing one portal. Users can be restricted to specific empresas.
- **Portal models**: `sidebar` (side nav), `tabmenu` (horizontal tabs), `banner` (header nav + hero banner + channel tree). Only `banner` model has the Canais step in the wizard.
- **ChannelEditor**: shared component for toggle/rename/reorder/add/remove of the portal nav tree.

## Running locally

```bash
cd apps/web-admin
npm install
npm run dev
```

## Deployment

Vercel auto-deploys on every push to `main`. No manual steps needed.
