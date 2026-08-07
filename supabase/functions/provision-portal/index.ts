import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Supabase project migrated to JWT Signing Keys (asymmetric ES256) — the
// legacy SUPABASE_SERVICE_ROLE_KEY (still auto-injected) fails signature
// verification against auth.admin.* calls with "unrecognized JWT kid <nil>
// for algorithm ES256". SUPABASE_SECRET_KEYS (also auto-injected, JSON map)
// holds the new opaque sb_secret_... key that sidesteps this entirely.
// Falls back to the legacy key if the new one is not configured yet.
function resolveServiceKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    if (keys?.default) return keys.default;
  } catch { /* not JSON or unset */ }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
}

const ALLOWED_ORIGINS = [
  'https://workr.dev.br',
  'http://localhost:5173',
  'http://localhost:4173',
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

interface Colors { primary: string; secondary: string; tertiary: string; }
interface Fonts  { display: string; body: string; }
interface AssetFile { b64: string; ext: string; } // base64 content + file extension
interface SocialCfg { platform: string; url: string; }
interface LegalLinkCfg { id: string; label: string; enabled: boolean; pageId?: string; }
interface FooterCfg {
  address?: string; email?: string; phone?: string; hours?: string;
  copyright?: string; disclaimer?: string;
  socials?: SocialCfg[];
  legalLinks?: LegalLinkCfg[];
}
interface Marcador { id: string; label: string; labels?: Record<string, string>; }
interface SubCanalCfg { id?: string; label: string; href: string; enabled: boolean; pageType?: string; listaAgrupadaStyle?: string; listaAgrupadaCategories?: (string | Marcador)[]; children?: SubCanalCfg[]; isExternalLink?: boolean; externalUrl?: string; }
interface CanalCfg { id?: string; label: string; href?: string; enabled: boolean; children: SubCanalCfg[]; pageType?: string; listaAgrupadaStyle?: string; listaAgrupadaCategories?: (string | Marcador)[]; isExternalLink?: boolean; externalUrl?: string; }

function normalizeMarcadores(raw: (string | Marcador)[] | undefined): Marcador[] {
  if (!raw) return [];
  return raw.map(m => (typeof m === 'string' ? { id: m, label: m } : m));
}

/** Resolves a legal link's custom pageId to the matching canal's real href. */
function findCanalHref(canais: CanalCfg[] | undefined, id: string): string | undefined {
  for (const c of canais ?? []) {
    if (c.id === id) return c.href ?? '/';
    for (const s of c.children ?? []) {
      if (s.id === id) return s.href;
      for (const ss of s.children ?? []) {
        if (ss.id === id) return ss.href;
      }
    }
  }
  return undefined;
}

// ── site.config.js builder ─────────────────────────────────────────────────────────────
function headerVariant(layout: string): string {
  if (layout === 'sidebar') return 'sidebar';
  if (layout === 'tabmenu') return 'tabmenu';
  return 'banner';
}

function buildNavSection(canais: CanalCfg[]): string {
  const enabled = canais.filter(c => c.enabled);
  if (enabled.length === 0) {
    // fallback to default nav
    return `  nav: [
    { label: 'A Companhia', href: '/a-companhia.html', children: [] },
    { label: 'Governança', children: [
        { label: 'Composição Acionária', href: '/composicao-acionaria.html' },
        { label: 'Atas e Assembleias',   href: '/atas-assembleias.html'     },
        { label: 'Documentos CVM',       href: '/documentos-cvm.html'       },
    ]},
    { label: 'Investidores', children: [
        { label: 'Central de Resultados', href: '/central-resultados.html' },
        { label: 'Calendário de Eventos', href: '/calendario-eventos.html' },
        { label: 'Ratings',               href: '/ratings.html'            },
    ]},
    { label: 'Contato', children: [
        { label: 'Fale com RI', href: '/fale-com-ri.html' },
        { label: 'Mailing',     href: '/mailing.html'     },
    ]},
  ],`;
  }

  const items = enabled.map(c => {
    const enabledChildren = c.children.filter(sc => sc.enabled);
    if (enabledChildren.length === 0) {
      const fields = [
        `id: ${JSON.stringify(c.id ?? '')}`,
        `label: ${JSON.stringify(c.label)}`,
        `href: ${JSON.stringify(c.href ?? '/')}`,
        ...(c.pageType ? [`pageType: ${JSON.stringify(c.pageType)}`] : []),
        ...(c.listaAgrupadaStyle ? [`listaAgrupadaStyle: ${JSON.stringify(c.listaAgrupadaStyle)}`] : []),
        ...(c.listaAgrupadaCategories ? [`listaAgrupadaCategories: ${JSON.stringify(normalizeMarcadores(c.listaAgrupadaCategories))}`] : []),
        ...(c.isExternalLink ? [`isExternalLink: true`, `externalUrl: ${JSON.stringify(c.externalUrl ?? '')}`] : []),
        `children: []`,
      ];
      return `    { ${fields.join(', ')} }`;
    }
    const childLines = enabledChildren.map(sc => {
      const f = [
        `id: ${JSON.stringify(sc.id ?? '')}`,
        `label: ${JSON.stringify(sc.label)}`,
        `href: ${JSON.stringify(sc.href)}`,
        ...(sc.pageType ? [`pageType: ${JSON.stringify(sc.pageType)}`] : []),
        ...(sc.listaAgrupadaStyle ? [`listaAgrupadaStyle: ${JSON.stringify(sc.listaAgrupadaStyle)}`] : []),
        ...(sc.listaAgrupadaCategories ? [`listaAgrupadaCategories: ${JSON.stringify(normalizeMarcadores(sc.listaAgrupadaCategories))}`] : []),
        ...(sc.isExternalLink ? [`isExternalLink: true`, `externalUrl: ${JSON.stringify(sc.externalUrl ?? '')}`] : []),
      ];
      return `      { ${f.join(', ')} }`;
    }).join(',\n');
    const parentFields = [
      `id: ${JSON.stringify(c.id ?? '')}`,
      `label: ${JSON.stringify(c.label)}`,
      ...(c.href ? [`href: ${JSON.stringify(c.href)}`] : []),
      ...(c.pageType ? [`pageType: ${JSON.stringify(c.pageType)}`] : []),
      ...(c.listaAgrupadaCategories ? [`listaAgrupadaCategories: ${JSON.stringify(normalizeMarcadores(c.listaAgrupadaCategories))}`] : []),
      ...(c.isExternalLink ? [`isExternalLink: true`, `externalUrl: ${JSON.stringify(c.externalUrl ?? '')}`] : []),
    ];
    return `    { ${parentFields.join(', ')}, children: [\n${childLines},\n    ] }`;
  }).join(',\n');

  return `  nav: [\n${items},\n  ],`;
}

function buildSiteConfig(opts: {
  nome: string;
  nomeFantasia?: string;
  layout: string;
  colors: Colors;
  fonts: Fonts;
  footer?: FooterCfg | null;
  canais?: CanalCfg[];
  logoExt?: string;
  faviconExt?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  portalUuid?: string;
  ticker?: { type: string; iframeUrl?: string };
  idiomas?: string[];
  seo?: { metaTitulo?: string; metaDescricao?: string; analyticsId?: string; clarityId?: string };
  emailContato?: string;
}) {
  const year = new Date().getFullYear();
  const f = opts.footer;

  const address   = JSON.stringify(f?.address ?? '');
  const email     = JSON.stringify(f?.email ?? '');
  const phone     = JSON.stringify(f?.phone ?? '');
  const hours     = JSON.stringify(f?.hours ?? '');
  const copyright = JSON.stringify(f?.copyright ?? `©Copyright ${opts.nome} ${year}`);
  const legalText = JSON.stringify(
    f?.disclaimer ??
    'As informações contidas neste site são de caráter meramente informativo e não constituem oferta de valores mobiliários.'
  );

  const legalLinksArr = (f?.legalLinks ?? [
    { id: 'termos',      label: 'Termos e Condições',      enabled: true },
    { id: 'privacidade', label: 'Política de Privacidade', enabled: true },
    { id: 'cookies',     label: 'Definições de Cookies',   enabled: true },
  ]).filter((l: LegalLinkCfg) => l.enabled);

  const legalLinks = legalLinksArr.map((l: LegalLinkCfg) => {
    const customHref = l.pageId ? findCanalHref(opts.canais, l.pageId) : undefined;
    const href = customHref ?? (
      l.id === 'termos'      ? '/termos-e-condicoes.html'
      : l.id === 'privacidade' ? '/politica-de-privacidade.html'
      : l.id === 'cookies'     ? '/definicao-de-cookies.html'
      :                          `/${l.id}.html`
    );
    return `      { label: ${JSON.stringify(l.label)}, href: ${JSON.stringify(href)} }`;
  }).join(',\n');

  const socials   = f?.socials ?? [];
  const linkedin  = JSON.stringify(socials.find((s: SocialCfg) => s.platform === 'LinkedIn')?.url  || '#');
  const instagram = JSON.stringify(socials.find((s: SocialCfg) => s.platform === 'Instagram')?.url || '#');
  const facebook  = JSON.stringify(socials.find((s: SocialCfg) => s.platform === 'Facebook')?.url  || '#');

  return `// scripts/site.config.js
// Gerado pelo Workr Lite CMS — não editar manualmente.
export const siteConfig = {

  maintenance: false,

  company: {
    name:        ${JSON.stringify(opts.nome)},
    nameShort:   ${JSON.stringify(opts.nome)},
    description: 'Relações com Investidores — ${opts.nome}.',
    logoOriginal: '/assets/logotipo/logotipo-original.${opts.logoExt ?? 'svg'}',
    logoNegative: '/assets/logotipo/logotipo-negative.${opts.logoExt ?? 'svg'}',
    logoContrast: '/assets/logotipo/logotipo-negative.${opts.logoExt ?? 'svg'}',
    favicon:      '/favicon.${opts.faviconExt ?? 'svg'}',
  },

  colors: {
    primary:   ${JSON.stringify(opts.colors.primary)},
    secondary: ${JSON.stringify(opts.colors.secondary)},
    tertiary:  ${JSON.stringify(opts.colors.tertiary)},
  },

  fonts: {
    display: ${JSON.stringify(opts.fonts.display)},
    body:    ${JSON.stringify(opts.fonts.body)},
  },

  ticker: {
    type:      ${JSON.stringify(opts.ticker?.type === 'iframe' ? 'iframe' : opts.ticker?.type === 'none' ? 'none' : 'static')},
    iframeUrl: ${JSON.stringify(opts.ticker?.iframeUrl ?? '')},
    items: ${(opts.ticker?.type === 'none' || opts.ticker?.type === 'iframe') ? '[]' : "[\n      { symbol: 'WRLT3', price: 'R$ 00,00', change: '0,00%', direction: 'up' },\n    ]"},
  },

${buildNavSection(opts.canais ?? [])}

  empresas: [
    { id: 'principal', label: ${JSON.stringify(opts.nome)}, short: '${opts.nome.split(' ').filter((w: string) => w.length > 2).map((w: string) => w[0]).join('').toUpperCase() || opts.nome.slice(0, 3).toUpperCase()}' },
  ],

  supabase: {
    url:      ${JSON.stringify(opts.supabaseUrl ?? null)},
    anonKey:  ${JSON.stringify(opts.supabaseAnonKey ?? null)},
    portalId: ${JSON.stringify(opts.portalUuid ?? null)},
  },

  header: { variant: '${headerVariant(opts.layout)}' },

  seo: {
    title:             ${JSON.stringify(opts.seo?.metaTitulo   ?? `${opts.nomeFantasia ?? opts.nome} — Relações com Investidores`)},
    description:       ${JSON.stringify(opts.seo?.metaDescricao ?? '')},
    googleAnalyticsId: ${JSON.stringify(opts.seo?.analyticsId  ?? '')},
    clarityId:         ${JSON.stringify(opts.seo?.clarityId     ?? '')},
  },

  contact: {
    email: ${JSON.stringify(opts.emailContato ?? '')},
  },

  languages: ${JSON.stringify(opts.idiomas && opts.idiomas.length > 0 ? opts.idiomas : ['pt-BR'])},

  topbar: {
    ri: { label: 'Relações com Investidores', url: '/' },
    institucional: { label: 'Institucional', url: '#' },
    showTicker: true,
  },

  restrictedNav: [],

  footer: {
    variant:   'simple',
    address:   ${address},
    email:     ${email},
    phone:     ${phone},
    hours:     ${hours},
    copyright: ${copyright},
    social: { linkedin: ${linkedin}, instagram: ${instagram}, facebook: ${facebook} },
    legalLinks: [
${legalLinks}
    ],
    legalText: ${legalText},
  },

};
`;
}

// ── Blank page builder ───────────────────────────────────────────────────────
function buildBlankPage(title: string, parentLabel: string | null): string {
  const breadcrumbParent = parentLabel
    ? `<li>${parentLabel}</li>\n            `
    : '';
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${title}" />
    <title>${title}</title>
    <link rel="stylesheet" href="/styles/main.scss" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  </head>
  <body>
    <div id="site-topbar"></div>
    <header id="site-header"></header>

    <main>
      <section class="page-header" aria-labelledby="page-title">
        <img class="page-header__bg"
             src="/assets/img/header-interno/header-interno.jpg"
             alt="" aria-hidden="true" />
        <div class="page-header__overlay" aria-hidden="true"></div>
        <div class="page-header__inner">
          <ol class="page-header__breadcrumb" aria-label="Você está em">
            <li><a href="/">Home</a></li>
            ${breadcrumbParent}<li aria-current="page">${title}</li>
          </ol>
          <h1 id="page-title" class="page-header__title">${title}</h1>
        </div>
      </section>

      <section class="page-section" aria-label="${title}" data-reveal>
        <div class="page-section__container">
          <div data-materias></div>
          <div class="page-empty"></div>
        </div>
      </section>
    </main>

    <footer id="site-footer"></footer>

    <div class="search-overlay" id="search-overlay" aria-hidden="true" aria-label="Busca" role="dialog">
      <div class="search-overlay__inner">
        <div class="search-overlay__box">
          <svg class="search-overlay__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input class="search-overlay__input" type="search" placeholder="O que você está procurando?" aria-label="Campo de busca" data-search-input />
          <button class="search-overlay__close" type="button" aria-label="Fechar busca" data-search-close>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <p class="search-overlay__hint">Pressione <kbd>ESC</kbd> para fechar</p>
      </div>
    </div>

    <script type="module" src="/scripts/page.js"></script>
  </body>
</html>
`;
}

// Pages that ship with specialized JS/structure — never overwrite with blank
const PROTECTED_HTML = new Set([
  'index.html', 'home-side-bar.html', 'home-v2.html',
  'documentos-cvm.html', '404.html', 'area-restrita.html',
  'politica-de-privacidade.html', 'termos-e-condicoes.html', 'definicao-de-cookies.html',
  'cms-show.html', 'cms-lista.html', 'cms-lista-agrupada.html',
  'cms-tabela.html', 'cms-blog.html', 'cms-galeria.html', 'cms-formulario.html',
]);

// ── GitHub helper ─────────────────────────────────────────────────────────────
function ghHeaders(token: string) {
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

async function ghJson<T>(res: Response): Promise<T> {
  const body = await res.json();
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${(body as { message?: string }).message ?? res.statusText}`);
  return body as T;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const ch = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: ch });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const role = user.app_metadata?.role as string | undefined;
    if (role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: super_admin required' }), {
        status: 403, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const { portalId: _portalId, nome, nomeFantasia, cnpj, cvmCode, autoCvm, subdomain, layout, colors, fonts, footer, canais, logo, favicon: faviconAsset, ticker, idiomas, seo, emailContato, tipoSite } = await req.json() as {
      portalId: string;
      nome: string;
      nomeFantasia?: string;
      cnpj?: string;
      cvmCode?: string;
      autoCvm?: boolean;
      subdomain: string;
      layout?: string;
      colors?: Colors;
      fonts?: Fonts;
      footer?: FooterCfg | null;
      canais?: CanalCfg[];
      logo?: AssetFile;
      favicon?: AssetFile;
      ticker?: { type: string; iframeUrl?: string };
      idiomas?: string[];
      seo?: { metaTitulo?: string; metaDescricao?: string; analyticsId?: string; clarityId?: string };
      emailContato?: string;
      tipoSite?: string;
    };

    const githubToken     = Deno.env.get('GITHUB_TOKEN');
    const cloudflareToken = Deno.env.get('CLOUDFLARE_API_TOKEN');
    const cloudflareAccountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const githubOrg    = Deno.env.get('GITHUB_ORG') ?? 'astri-solutions';
    const templateRepo = 'cliente-workr-lite';
    // subdomain comes from the wizard's slugify() (or a manually-typed "url"
    // override) — neither trims whitespace or strips a leading/trailing "-",
    // so a client name with a stray trailing space (e.g. "Astride ") slips
    // through as "astride-". A trailing hyphen is invalid in a DNS label, so
    // the custom <slug>.workr.dev.br CNAME below would silently fail to
    // resolve for the exact hostname the CMS links to. Sanitizing once here,
    // before it's used to name the GitHub repo AND the Cloudflare Pages
    // project/custom domain, keeps every reference in sync.
    const cleanSubdomain = subdomain.trim().toLowerCase().replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    const repoName     = `workr-portal-${cleanSubdomain}`;
    const gh           = (url: string, init?: RequestInit) =>
      fetch(`https://api.github.com${url}`, { ...init, headers: { ...ghHeaders(githubToken!), ...(init?.headers ?? {}) } });

    if (!githubToken) {
      return new Response(JSON.stringify({ error: 'GITHUB_TOKEN secret not configured' }), {
        status: 500, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    // colors is a required wizard step (Cores) — silently defaulting a
    // missing payload to Astri's OWN brand palette would launch someone
    // else's portal wearing Astri's colors instead of surfacing the real
    // problem (a skipped/broken step upstream). Checked before any GitHub
    // API call so a bad request never leaves behind an orphaned repo.
    if (!colors?.primary || !colors?.secondary || !colors?.tertiary) {
      return new Response(JSON.stringify({ error: 'Cores do portal não informadas — volte ao passo Cores do assistente.' }), {
        status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    // ── Step 1: generate repo from template ───────────────────────────────
    // Requires cliente-workr-lite to be marked as "Template repository" in GitHub Settings.
    await ghJson<unknown>(await gh(`/repos/${githubOrg}/${templateRepo}/generate`, {
      method: 'POST',
      body: JSON.stringify({
        owner: githubOrg,
        name: repoName,
        description: `Portal RI — ${nome}`,
        private: false,
        include_all_branches: false,
      }),
    }));

    // ── Step 2: wait for template files to be copied (poll up to 90s) ───────
    // Poll for the specific file we need — this confirms both repo existence
    // and template copy completion (GitHub copies files asynchronously).
    let ready = false;
    for (let i = 0; i < 30; i++) {
      await sleep(3000);
      const checkRes = await gh(`/repos/${githubOrg}/${repoName}/contents/scripts/site.config.js`);
      if (checkRes.ok) { ready = true; break; }
    }
    if (!ready) throw new Error('Novo repositório não ficou pronto em 90s. Tente publicar a configuração manualmente.');

    // ── Step 4a: upsert portal row early so we get the UUID for site.config.js ─
    let portalUuid: string | undefined;
    let portalUpsertError: string | undefined;
    try {
      const adminClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        resolveServiceKey(),
      );
      const { data: earlyRow, error: earlyErr } = await adminClient.from('portals').upsert({
        portal_key: _portalId,
        cliente: nome,
        subdomain: cleanSubdomain,
        github_repo: repoName,
        empresa_status: 'Ativa',
        ...(cnpj ? { cnpj } : {}),
      }, { onConflict: 'portal_key' }).select('id').maybeSingle();
      if (earlyErr) portalUpsertError = `portals upsert: ${earlyErr.message}`;
      portalUuid = earlyRow?.id ?? undefined;
    } catch (e) { portalUpsertError = String(e); }

    // ── Step 4: build and push customised site.config.js ─────────────────
    const siteConfigContent = buildSiteConfig({
      nome,
      nomeFantasia,
      layout: layout ?? 'banner',
      colors,
      fonts:  fonts  ?? { display: 'Plus Jakarta Sans', body: 'Inter' },
      footer: footer ?? null,
      canais: canais ?? [],
      logoExt:    logo?.ext,
      faviconExt: faviconAsset?.ext,
      ticker,
      idiomas,
      seo,
      emailContato,
      supabaseUrl:     Deno.env.get('SUPABASE_URL'),
      supabaseAnonKey: Deno.env.get('SUPABASE_ANON_KEY'),
      portalUuid,
    });
    const encoded = btoa(unescape(encodeURIComponent(siteConfigContent)));

    // ── Steps 4b–5c: todos os arquivos em UM único commit ────────────────────
    // Antes cada arquivo ia num PUT/DELETE separado da Contents API:
    // site.config.js, logo, logo negativo, favicon, index.html, os dois
    // home-*.html removidos e uma página em branco por canal — 10+ commits
    // num provisionamento. Cada commit é um deploy na Cloudflare, e os primeiros
    // subiam com o site.config.js DEFAULT do template (cores da marca Astri,
    // não as do cliente). O visitante que pegasse o site entre um deploy e o
    // seguinte via as cores antigas — é a origem do flash de cor no refresh.
    // Blobs → tree → commit → ref faz tudo virar um commit e um deploy só,
    // já com a configuração final.
    const assetErrors: string[] = [];
    const writes: { path: string; b64: string }[] = [];
    const deletes: string[] = [];
    const queueWrite = (path: string, b64: string) => writes.push({ path, b64: b64.replace(/\n/g, '') });

    queueWrite('scripts/site.config.js', encoded);

    // scripts/theme-data.js — see publish-config's copy of this comment:
    // read synchronously by scripts/theme-critical.js (blocking <script> in
    // every page's <head>) so a freshly-provisioned portal already renders
    // its real brand colors/fonts on the very first paint, no default flash.
    const themeDataJs = `window.__WL_THEME__ = ${JSON.stringify({ colors, fonts: fonts ?? { display: 'Plus Jakarta Sans', body: 'Inter' } })};\n`;
    queueWrite('public/scripts/theme-data.js', btoa(unescape(encodeURIComponent(themeDataJs))));

    // Static assets live under public/ — Vite only copies public/ into the
    // built site, so pushing to the repo root would 404 on the live site.
    if (logo?.b64) {
      const ext = logo.ext ?? 'svg';
      queueWrite(`public/assets/logotipo/logotipo-original.${ext}`, logo.b64);
      queueWrite(`public/assets/logotipo/logotipo-negative.${ext}`, logo.b64);
    }
    if (faviconAsset?.b64) {
      queueWrite(`public/favicon.${faviconAsset.ext ?? 'svg'}`, faviconAsset.b64);
    }

    // ── index.html conforme o layout ────────────────────────────────────────
    // banner → index.html (já correto, sem troca)
    // sidebar → home-side-bar.html vira index.html
    // tabmenu → home-v2.html vira index.html
    const layoutTemplateMap: Record<string, string> = {
      sidebar: 'home-side-bar.html',
      tabmenu: 'home-v2.html',
    };
    const templateFile = layoutTemplateMap[layout ?? 'banner'];
    if (templateFile) {
      const tplRes = await gh(`/repos/${githubOrg}/${repoName}/contents/${templateFile}`);
      if (tplRes.ok) {
        const tplData = await tplRes.json() as { content: string };
        queueWrite('index.html', tplData.content);
      } else {
        assetErrors.push(`index.html: ${templateFile} não encontrado no repositório novo`);
      }
    }

    // Os três home-*.html vêm no template (publish-config precisa deles lá
    // para self-healing), mas um portal provisionado usa só UM — deixar os
    // outros torna /home-side-bar.html acessível num portal 'banner', o que
    // já causou confusão em produção.
    for (const f of ['home-side-bar.html', 'home-v2.html']) {
      if (f !== templateFile) deletes.push(f);
    }

    // ── Páginas em branco a partir da árvore de canais ──────────────────────
    const queueNewPage = (filePath: string, html: string) => {
      if (PROTECTED_HTML.has(filePath)) return;
      if (writes.some(w => w.path === filePath)) return;
      queueWrite(filePath, btoa(unescape(encodeURIComponent(html))));
    };
    for (const canal of canais ?? []) {
      if (!canal.enabled) continue;
      const enabledChildren = canal.children.filter((sc: SubCanalCfg) => sc.enabled);
      if (enabledChildren.length > 0) {
        for (const sub of enabledChildren) {
          if (!sub.href?.endsWith('.html')) continue;
          queueNewPage(sub.href.replace(/^\//, ''), buildBlankPage(sub.label, canal.label));
        }
      } else if (canal.href?.endsWith('.html')) {
        queueNewPage(canal.href.replace(/^\//, ''), buildBlankPage(canal.label, null));
      }
    }

    // ── Blobs → tree → commit → ref (um push só) ─────────────────────────────
    {
      const refData = await ghJson<{ object: { sha: string } }>(
        await gh(`/repos/${githubOrg}/${repoName}/git/ref/heads/main`));
      const baseCommitSha = refData.object.sha;
      const commitData = await ghJson<{ tree: { sha: string } }>(
        await gh(`/repos/${githubOrg}/${repoName}/git/commits/${baseCommitSha}`));
      const baseTreeSha = commitData.tree.sha;

      // Um delete de arquivo inexistente faz a criação da tree falhar inteira —
      // e com ela o provisionamento. Filtra pelo que realmente está no repo.
      const treeData = await ghJson<{ tree: { path: string; type: string }[] }>(
        await gh(`/repos/${githubOrg}/${repoName}/git/trees/${baseTreeSha}?recursive=1`));
      const existingPaths = new Set(treeData.tree.filter(t => t.type === 'blob').map(t => t.path));

      const blobEntries = await Promise.all(writes.map(async w => {
        const blob = await ghJson<{ sha: string }>(
          await gh(`/repos/${githubOrg}/${repoName}/git/blobs`, {
            method: 'POST',
            body: JSON.stringify({ content: w.b64, encoding: 'base64' }),
          }));
        return { path: w.path, mode: '100644', type: 'blob', sha: blob.sha };
      }));
      const deleteEntries = deletes
        .filter(p => existingPaths.has(p))
        .map(path => ({ path, mode: '100644', type: 'blob', sha: null }));

      const newTree = await ghJson<{ sha: string }>(
        await gh(`/repos/${githubOrg}/${repoName}/git/trees`, {
          method: 'POST',
          body: JSON.stringify({ base_tree: baseTreeSha, tree: [...blobEntries, ...deleteEntries] }),
        }));
      const newCommit = await ghJson<{ sha: string }>(
        await gh(`/repos/${githubOrg}/${repoName}/git/commits`, {
          method: 'POST',
          body: JSON.stringify({
            message: `chore: configure portal [${nome}]\n\n${[...writes.map(w => w.path), ...deletes].join(', ')}`,
            tree: newTree.sha,
            parents: [baseCommitSha],
          }),
        }));
      await ghJson<unknown>(
        await gh(`/repos/${githubOrg}/${repoName}/git/refs/heads/main`, {
          method: 'PATCH',
          body: JSON.stringify({ sha: newCommit.sha }),
        }));
    }

    const repoUrl  = `https://github.com/${githubOrg}/${repoName}`;
    let   cloudflareUrl: string | undefined;
    let   cloudflareCreated = false;
    let   cloudflareError: string | undefined;

    // ── Step 5: create the Cloudflare Pages project ─────────────────────────
    // Wrapped in its own try/catch: a hosting API hiccup (network error,
    // unexpected response shape, timeout) must degrade to `cloudflareError`,
    // never 500 the whole provision call — the GitHub repo + portal DB row
    // above already succeeded and must not be thrown away because of a
    // problem in this optional last step.
    //
    // Requires the Cloudflare Pages GitHub App already installed on the org
    // with access to all repos (one-time manual dashboard step) — without
    // it, the API call below fails with a Cloudflare "git installation"
    // error and this degrades to cloudflareError exactly like a missing
    // token would.
    if (cloudflareToken && cloudflareAccountId) {
      try {
        const cfRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/pages/projects`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${cloudflareToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: repoName,
            production_branch: 'main',
            source: { type: 'github', config: { owner: githubOrg, repo_name: repoName, production_branch: 'main', deployments_enabled: true } },
            build_config: { build_command: 'npm run build', destination_dir: 'dist' },
          }),
        });
        if (cfRes.ok) {
          const cfBody = await cfRes.json() as { result: { name: string; subdomain: string } };
          const pagesSubdomain = cfBody.result.subdomain;
          cloudflareUrl = `https://${pagesSubdomain}`;
          cloudflareCreated = true;

          // Commits were pushed before the Pages project existed, so Cloudflare
          // never saw them — trigger an explicit deployment from main now.
          const cfDeployRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/pages/projects/${repoName}/deployments`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${cloudflareToken}` },
          });
          if (!cfDeployRes.ok) {
            const dBody = await cfDeployRes.json().catch(() => ({})) as { errors?: { message?: string }[] };
            // Project exists (cloudflareCreated stays true) — only the initial
            // deploy trigger failed; Cloudflare's own GitHub integration will
            // still deploy on the next push.
            cloudflareError = `Projeto criado, mas deploy inicial falhou: ${dBody?.errors?.[0]?.message ?? `HTTP ${cfDeployRes.status}`}`;
          }

          // Custom subdomain under workr.dev.br. Two SEPARATE Cloudflare API
          // calls are both required: adding a "custom domain" to a Pages
          // project (the /domains call below) only registers the hostname
          // with Pages for TLS/routing purposes — it does NOT create any DNS
          // record, even though the whole zone lives on Cloudflare. Without
          // the explicit DNS record created here too, the custom domain sits
          // in Pages' "Active" list forever while the hostname itself is a
          // bare NXDOMAIN — exactly what happened to a live portal once
          // (fix-portal-domain exists to repair that after the fact). Each
          // step below retries once on failure and verifies the DNS record
          // actually exists via a follow-up read instead of trusting the
          // write response alone, since that single unverified write is what
          // silently failed that one time. Best-effort throughout: any
          // remaining failure still leaves the portal reachable at the
          // *.pages.dev fallback (cloudflareUrl keeps that value).
          const customDomain = `${cleanSubdomain}.workr.dev.br`;
          const cfHeaders = { 'Authorization': `Bearer ${cloudflareToken}`, 'Content-Type': 'application/json' };
          try {
            let domainAttached = false;
            for (let attempt = 0; attempt < 2 && !domainAttached; attempt++) {
              const domainRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/pages/projects/${repoName}/domains`, {
                method: 'POST',
                headers: cfHeaders,
                body: JSON.stringify({ name: customDomain }),
              });
              if (domainRes.ok) {
                domainAttached = true;
              } else {
                const domainBody = await domainRes.json().catch(() => ({})) as { errors?: { message?: string }[] };
                const msg = domainBody?.errors?.[0]?.message ?? '';
                // Already attached (e.g. a retried request) counts as success.
                if (/already added this custom domain/i.test(msg)) {
                  domainAttached = true;
                } else if (attempt === 0) {
                  await sleep(1500);
                } else {
                  cloudflareError = `Projeto criado, mas domínio customizado falhou: ${msg || `HTTP ${domainRes.status}`}`;
                }
              }
            }

            if (domainAttached) {
              const zoneRes = await fetch('https://api.cloudflare.com/client/v4/zones?name=workr.dev.br', { headers: cfHeaders });
              const zoneBody = await zoneRes.json().catch(() => ({})) as { result?: { id: string }[] };
              const zoneId = zoneBody.result?.[0]?.id;
              if (zoneId) {
                let dnsVerified = false;
                for (let attempt = 0; attempt < 2 && !dnsVerified; attempt++) {
                  const dnsRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
                    method: 'POST',
                    headers: cfHeaders,
                    body: JSON.stringify({ type: 'CNAME', name: cleanSubdomain, content: pagesSubdomain, proxied: true }),
                  });
                  // A retry after a transient failure on attempt 0 can hit
                  // "record already exists" on attempt 1 if the first write
                  // actually landed despite a bad/timed-out response —
                  // that's success too, not a real failure.
                  const dnsOkOrDuplicate = dnsRes.ok || (await dnsRes.clone().json().catch(() => ({})) as { errors?: { message?: string }[] })?.errors?.[0]?.message?.match(/already exists/i);
                  if (dnsOkOrDuplicate) {
                    // Read-after-write: confirm the record is actually there
                    // with the right content before trusting it — this is
                    // the exact gap that let a portal go live with a DNS
                    // record the write call claimed to have created but
                    // never actually did.
                    const checkRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=CNAME&name=${customDomain}`, { headers: cfHeaders });
                    const checkBody = await checkRes.json().catch(() => ({})) as { result?: { content: string }[] };
                    if (checkBody.result?.some(r => r.content === pagesSubdomain)) {
                      dnsVerified = true;
                      cloudflareUrl = `https://${customDomain}`;
                    } else if (attempt === 0) {
                      await sleep(1500);
                    } else {
                      cloudflareError = 'Domínio customizado criado no Pages, mas o registro DNS não pôde ser confirmado após duas tentativas.';
                    }
                  } else if (attempt === 0) {
                    await sleep(1500);
                  } else {
                    const dnsBody = await dnsRes.json().catch(() => ({})) as { errors?: { message?: string }[] };
                    cloudflareError = `Domínio customizado criado no Pages, mas registro DNS falhou: ${dnsBody?.errors?.[0]?.message ?? `HTTP ${dnsRes.status}`}`;
                  }
                }
              } else {
                cloudflareError = 'Domínio customizado criado no Pages, mas não foi possível resolver a zona workr.dev.br para criar o registro DNS.';
              }
            }
          } catch (e) {
            cloudflareError = `Projeto criado, mas domínio customizado falhou: ${String((e as Error)?.message ?? e)}`;
          }
        } else {
          const cfBody = await cfRes.json().catch(() => ({})) as { errors?: { message?: string }[] };
          cloudflareError = cfBody?.errors?.[0]?.message ?? `HTTP ${cfRes.status}`;
        }
      } catch (e) {
        cloudflareError = `Falha ao criar projeto Cloudflare Pages: ${String((e as Error)?.message ?? e)}`;
      }
    } else {
      cloudflareError = 'CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID não configurados';
    }

    // ── Step 6: update portal record with final Cloudflare URL + create portal_config
    let siteUpsertError: string | undefined;
    let configUpsertError: string | undefined;
    try {
      const adminClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        resolveServiceKey(),
      );

      const { data: portalRow, error: portalUpdateError } = await adminClient.from('portals')
        .update({ hosting_provider: 'cloudflare', cloudflare_url: cloudflareUrl ?? null, cloudflare_created: cloudflareCreated })
        .eq('portal_key', _portalId)
        .select('id')
        .maybeSingle();
      if (portalUpdateError) configUpsertError = `portals update: ${portalUpdateError.message}`;

      const pid = portalRow?.id ?? portalUuid;
      if (!pid) configUpsertError = configUpsertError ?? 'portal UUID não resolvido — portal_config não foi criado';

      // Create/upsert portal_sites row (the live site entry shown in admin panel)
      if (pid) {
        const { error: siteErr } = await adminClient.from('portal_sites').upsert({
          portal_id: pid,
          link: cloudflareUrl ? cloudflareUrl.replace(/^https?:\/\//, '') : `${repoName}.pages.dev`,
          status: 'Ativo',
          ip: null,
          tipo: tipoSite ?? 'RI',
        }, { onConflict: 'portal_id' });
        if (siteErr) siteUpsertError = siteErr.message;
      }

      // Create initial portal_config row — the FULL initial state, so the CMS
      // (any user, any browser) opens with exactly what the wizard defined.
      if (pid) {
        const { error: cfgErr } = await adminClient.from('portal_config').upsert({
          portal_id: pid,
          canais: canais ?? [],
          cores: colors ?? {},
          fontes: fonts ?? {},
          layout: layout ?? 'banner',
          footer: footer ?? {},
          ticker: ticker ?? { type: 'none' },
          empresas: [{
            id: `principal-${_portalId}`,
            nome: nomeFantasia ?? nome,
            tipo: 'EMPRESA',
            cnpj: cnpj ?? '',
            cvmCodigo: cvmCode ?? '',
            autoCvm: autoCvm ?? false,
            importarDesde: '',
            ativo: true,
          }],
          interacoes: [],
          ...(logo?.ext ? { logo_ext: logo.ext } : {}),
          ...(faviconAsset?.ext ? { favicon_ext: faviconAsset.ext } : {}),
          informacoes: {
            nomeFantasia: nomeFantasia ?? null,
            emailContato: emailContato ?? null,
            idiomas: idiomas ?? ['pt-BR'],
            seo: seo ?? {},
          },
        }, { onConflict: 'portal_id' });
        if (cfgErr) configUpsertError = `portal_config upsert: ${cfgErr.message}`;
      }
    } catch (e) { configUpsertError = configUpsertError ?? String(e); }

    return new Response(JSON.stringify({ repoName, repoUrl, hostingProvider: 'cloudflare', cloudflareUrl, cloudflareCreated, cloudflareError, portalUuid, siteUpsertError, configUpsertError, portalUpsertError, assetErrors: assetErrors.length ? assetErrors : undefined }), {
      status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...ch, 'Content-Type': 'application/json' },
    });
  }
});
