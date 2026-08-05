# Workr Lite CMS — Astri

Multi-tenant CMS for Investor Relations (RI) websites, branded as **Astri / Workr Lite**.

## Git workflow

**Commit always directly to `main`.** Do not create feature branches. Push every change straight to `main` so Cloudflare Pages deploys immediately without PRs.

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
└── vercel.json             # Legacy Vercel config — deploy migrated to Cloudflare Pages (see Deployment below); no longer used, kept only as historical reference
```

## Stack

- **Frontend**: Vite + React 18 + TypeScript + React Router v6
- **Backend**: Go (planned — not yet implemented)
- **CSS**: Custom CSS (no Tailwind, no component library)
- **Fonts**: Plus Jakarta Sans (headings) + Inter (body) via Google Fonts
- **Deploy**: Cloudflare Pages — deploys automatically on push to `main` (build command/output dir configured in the Cloudflare dashboard, not in-repo)

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
| `/admin/portais/novo` | NovoPortalPage (wizard, 11 steps — Canais included for all three layouts) |
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
- **Toolbar pattern**: Pages with filters + bulk actions must use `<div className="toolbar">` with two children: `<div className="toolbar__filters">` (search + filter-wraps) and `<div className="toolbar__actions">` (action buttons + `<span className="toolbar__count">`). Never create page-specific toolbar classes. Defined in `AdminPages.css`.
- **Button variants**: `btn-primary` (filled teal), `btn-outline` (white + gray border, same size as primary), `btn-action btn-action--enter` (neutral), `btn-action btn-action--publish` (teal outline), `btn-action btn-action--danger` (red), `btn-action btn-action--secondary` (gray).
- **Modal footer pattern**: Always use `<div className="modal-footer">` for modal action rows. Never create page-specific footer classes. Renders `space-between` on desktop; stacks full-width on mobile (≤480px). Defined in `AdminPages.css`.

## Regra de ouro: correções e melhorias de sistema alcançam todo portal já criado

Cada portal é um site independente (repo próprio, projeto Cloudflare Pages próprio, conteúdo próprio) — mas o **sistema** (o código que faz o site funcionar: `scripts/`, `styles/`, `vite.config.js` em `cliente-workr-lite`, e todas as Supabase Edge Functions) é um só, compartilhado por todos. Uma correção de bug, uma melhoria de performance, uma função de edge corrigida — **nunca** deve valer só para o próximo portal criado ou só para quem clicar "Publicar" de novo. Todo portal já existente precisa acabar rodando a versão corrigida do sistema, sem que isso jamais reescreva `site.config.js` ou qualquer conteúdo (canais, matérias, cores, banners, documentos) daquele portal específico.

Isso já vale hoje para duas camadas:
- **Edge Functions** (`supabase/functions/*`): compartilhadas por definição — corrigir e reployar uma função já corrige o comportamento para todos os portais, imediatamente, sem tocar em nada por portal.
- **Admin panel** (`apps/web-admin`): um só app, um só deploy Cloudflare Pages — toda correção alcança todo usuário (admin ou cliente) no próximo carregamento da página.

A camada que **não** se autopropaga sozinha é o template do site do cliente (`cliente-workr-lite`: `scripts/`, `styles/`, `vite.config.js`, os `home-*.html`). Hoje esses arquivos só chegam a um portal já provisionado quando alguém clica "Publicar" naquele portal específico (o self-heal do `publish-config` resincroniza esses arquivos a cada publish) — um portal cujo cliente nunca mais publica fica preso na versão antiga do template para sempre, mesmo depois de bugs corrigidos.

**Isso roda sozinho — não depende de ninguém lembrar de clicar em nada.** Um `pg_cron` job (migration `auto_sync_template_all_portals`) chama a Edge Function `sync-template-all` a cada 15 minutos: ela itera todos os portais com repo vinculado e empurra só os arquivos compartilhados (mesma lista que o self-heal do `publish-config` usa: tudo em `scripts/` e `styles/` mais `vite.config.js`, exceto `scripts/site.config.js`), um commit por portal, nunca tocando em `site.config.js` nem em conteúdo. Portais já em dia (mesmo SHA de blob) não geram commit nem redeploy.

- O cron autentica com a própria `service_role` key, lida do Supabase Vault (nunca hardcoded em SQL) — `sync-template-all` se auto-registra no Vault (`seed_service_role_vault_secret`) toda vez que roda com sucesso, então não existe um passo de setup separado.
- O botão "Sincronizar sistema em todos os portais" em `PortaisPage` continua existindo, mas agora é só um atalho para forçar uma rodada imediata (por exemplo, logo depois de aplicar um fix, sem esperar o próximo tick de 15 min) — o sistema já se sincroniza sozinho de qualquer forma.
- Ao adicionar uma nova Edge Function que precise rodar de forma agendada/interna (não só sob demanda de um usuário logado), siga o mesmo padrão: aceitar um JWT com `role: "service_role"` (decodificado do próprio token, sem round-trip no GoTrue) como chamada de sistema confiável, além do fluxo normal de usuário autenticado.

## Architecture notes

- **Empresas** = document repositories within a portal (e.g. Itaú BB, Itaú Negócios). Not separate sites — sub-entities sharing one portal. Users can be restricted to specific empresas.
- **Portal models**: `sidebar` (side nav), `tabmenu` (horizontal tabs), `banner` (header nav + hero banner + channel tree). All three go through the Canais step in the wizard — the real restriction is on content *type*: sidebar/tabmenu channels are limited to `lista`/`lista-agrupada`/`tabela`/`tabela-resultados`/`formulario`/`show` (`FLAT_PAGE_TYPES` in `CanaisPage.tsx`), not `blog`/`galeria`/`timeline`. `show` on a flat layout is deliberately simpler than on `banner`: `NovaMateriaPage.tsx` detects the portal's layout and restricts the block picker to a single "Bloco de texto" (subtítulo + parágrafos) instead of the full palette (KPIs, tabs, pessoas, galeria, etc.) — same `pageType`, same site template, just a narrower authoring surface.
- **ChannelEditor**: shared component for toggle/rename/reorder/add/remove of the portal nav tree.

## Running locally

```bash
cd apps/web-admin
npm install
npm run dev
```

## Deployment

Cloudflare Pages auto-deploys on every push to `main`. No manual steps needed.

**Migrated from Vercel to Cloudflare Pages** (Aug 2026) — every project (admin panel + every client portal) now deploys via Cloudflare Pages, not Vercel. `vercel.json` is dead/unused, kept only as a historical artifact. If you find code, comments, or docs still mentioning Vercel outside of this note, that's drift — fix it the same way this migration did.

## Infrastructure decisions (test phase vs. production)

### Current setup (test/staging)
- **Admin panel** (`workr-lite-v1`): deployed on Cloudflare Pages, custom domain `workr.dev.br` (CNAME → `workr-lite-v1.pages.dev`, the project's own Pages domain)
- **Each client portal**: gets its own GitHub repo (`astri-solutions/workr-portal-{subdomain}`) generated from `cliente-workr-lite` template, and its own Cloudflare Pages **project** (`workr-portal-{subdomain}`, reachable at `workr-portal-{subdomain}.pages.dev`) — publicly addressed via the friendly subdomain `{subdomain}.workr.dev.br` (CNAME in the `workr.dev.br` zone → the project's `.pages.dev` domain). The Cloudflare Pages project name is always identical to the GitHub repo name (`portals.github_repo`) — never parse it out of a URL.
- **Why separate Pages projects**: `cliente-workr-lite` is a static HTML site — it cannot share a domain/project with the admin SPA (React) without complex routing workarounds. Separate projects give each portal an independent deploy pipeline.
- Cloudflare Pages project creation is automatic during portal provisioning (`provision-portal`, via the Cloudflare API v4), but **requires `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` secrets** to be set in Supabase Edge Function secrets. Without them, the repo is created but the Pages project must be set up manually.
- **Known gap — DNS CNAME creation is NOT automated yet.** `provision-portal` creates the GitHub repo and the Cloudflare Pages project (+ attempts to attach the `{subdomain}.workr.dev.br` custom domain to that project), but it does **not** create the DNS CNAME record itself in the `workr.dev.br` zone — that still needs the zone ID and a token scoped for `DNS:Edit`, neither of which the function has today. Until that's wired up, add the CNAME record (`{subdomain}` → `workr-portal-{subdomain}.pages.dev`, proxied) by hand in Cloudflare DNS after provisioning a new portal — same as every existing portal's record was created.

### Secrets required for full automation
| Secret | Where | Purpose |
|---|---|---|
| `GITHUB_TOKEN` | Supabase Edge Function secrets | Create/write repos in `astri-solutions` org |
| `CLOUDFLARE_API_TOKEN` | Supabase Edge Function secrets | Create/delete Cloudflare Pages project + attach custom domain per portal |
| `CLOUDFLARE_ACCOUNT_ID` | Supabase Edge Function secrets | The Cloudflare account the Pages projects live under |
| `GITHUB_ORG` | Supabase Edge Function secrets | Org name (default: `astri-solutions`) |
| `PREVIEW_TOKEN_SECRET` | Supabase Edge Function secrets | Signs/verifies preview links (`mint-preview-token`/`preview-content`) — missing hard-fails preview with a 500 |
| `OPS_ALERT_EMAIL` | Supabase Edge Function secrets | Recipient for ops alerts (`_shared/postmark.ts`) — missing just silently disables alerts, non-fatal |

`VERCEL_TOKEN` may still exist as a leftover secret — no code reads it anymore; safe to remove once confirmed unused elsewhere.

### Future production setup (dedicated server + real domains)
When migrating from Cloudflare Pages/Supabase to a dedicated server:
- Each client portal gets its own subdomain on the client's domain (e.g., `ri.gravitstudios.com.br`)
- The static HTML site is served directly by nginx/caddy, no Cloudflare Pages
- `provision-portal` Edge Function will need to be replaced by a Go backend service
- `publish-config` will push to the client's own repo (or a server-side file system) instead of GitHub Contents API
- The `scripts/site.config.js` pattern stays the same — only the delivery mechanism changes
- DNS setup and SSL certificates will be managed per-client
- `workr-lite-v1` admin panel will move to `admin.astri.solutions` or similar

### Layout types and mutability
| Layout | `header.variant` | Client can change? |
|---|---|---|
| `sidebar` | `sidebar` | Yes — via Personalização → Layout |
| `tabmenu` | `tabmenu` | Yes — via Personalização → Layout |
| `banner` | `banner` | No — fixed at creation |

Sidebar and tabmenu share the same HTML template (same repo). The `header.variant` in `site.config.js` switches the rendering. When a client changes their layout via the CMS and clicks "Publicar", the updated variant is pushed to GitHub and Cloudflare Pages redeploys automatically.
