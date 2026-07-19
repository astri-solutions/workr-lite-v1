import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://workr-lite-v1.vercel.app',
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
interface SubCanalCfg { id?: string; label: string; href: string; enabled: boolean; pageType?: string; children?: SubCanalCfg[]; }
interface CanalCfg { id?: string; label: string; href?: string; enabled: boolean; children: SubCanalCfg[]; pageType?: string; }

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

// ── site.config.js builder ───────────────────────────────────────────────────
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
      ];
      return `      { ${f.join(', ')} }`;
    }).join(',\n');
    const parentFields = [
      `id: ${JSON.stringify(c.id ?? '')}`,
      `label: ${JSON.stringify(c.label)}`,
      ...(c.href ? [`href: ${JSON.stringify(c.href)}`] : []),
      ...(c.pageType ? [`pageType: ${JSON.stringify(c.pageType)}`] : []),
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

    const { portalId: _portalId, nome, nomeFantasia, cnpj, subdomain, layout, colors, fonts, footer, canais, logo, favicon: faviconAsset, ticker, idiomas, seo, emailContato, tipoSite } = await req.json() as {
      portalId: string;
      nome: string;
      nomeFantasia?: string;
      cnpj?: string;
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

    const githubToken  = Deno.env.get('GITHUB_TOKEN');
    const vercelToken  = Deno.env.get('VERCEL_TOKEN');
    const githubOrg    = Deno.env.get('GITHUB_ORG') ?? 'astri-solutions';
    const templateRepo = 'cliente-workr-lite';
    const repoName     = `workr-portal-${subdomain}`;
    const gh           = (url: string, init?: RequestInit) =>
      fetch(`https://api.github.com${url}`, { ...init, headers: { ...ghHeaders(githubToken!), ...(init?.headers ?? {}) } });

    if (!githubToken) {
      return new Response(JSON.stringify({ error: 'GITHUB_TOKEN secret not configured' }), {
        status: 500, headers: { ...ch, 'Content-Type': 'application/json' },
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
    let fileSha: string | undefined;
    let ready = false;
    for (let i = 0; i < 30; i++) {
      await sleep(3000);
      const checkRes = await gh(`/repos/${githubOrg}/${repoName}/contents/scripts/site.config.js`);
      if (checkRes.ok) {
        const fileData = await checkRes.json() as { sha: string };
        fileSha = fileData.sha;
        ready = true;
        break;
      }
    }
    if (!ready) throw new Error('Novo repositório não ficou pronto em 90s. Tente publicar a configuração manualmente.');

    // ── Step 4a: upsert portal row early so we get the UUID for site.config.js ─
    let portalUuid: string | undefined;
    let portalUpsertError: string | undefined;
    try {
      const adminClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data: earlyRow, error: earlyErr } = await adminClient.from('portals').upsert({
        portal_key: _portalId,
        cliente: nome,
        subdomain,
        github_repo: repoName,
        vercel_url: `https://${repoName}.vercel.app`,
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
      colors: colors ?? { primary: '#0B5B68', secondary: '#00D865', tertiary: '#141414' },
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

    await ghJson<unknown>(await gh(`/repos/${githubOrg}/${repoName}/contents/scripts/site.config.js`, {
      method: 'PUT',
      body: JSON.stringify({
        message: `chore: configure portal [${nome}]`,
        content: encoded,
        ...(fileSha ? { sha: fileSha } : {}),
      }),
    }));

    // ── Step 5: push logo and favicon if provided ─────────────────────────
    const assetErrors: string[] = [];
    async function pushAsset(path: string, b64: string) {
      const existing = await gh(`/repos/${githubOrg}/${repoName}/contents/${path}`);
      let sha: string | undefined;
      if (existing.ok) {
        const d = await existing.json() as { sha: string };
        sha = d.sha;
      }
      const putRes = await gh(`/repos/${githubOrg}/${repoName}/contents/${path}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `chore: add asset ${path}`,
          content: b64,
          ...(sha ? { sha } : {}),
        }),
      });
      if (!putRes.ok) {
        const body = await putRes.json().catch(() => ({})) as { message?: string };
        assetErrors.push(`${path}: GitHub ${putRes.status} ${body.message ?? ''}`.trim());
      }
    }

    // Static assets live under public/ — Vite only copies public/ into the
    // built site, so pushing to the repo root would 404 on the live site.
    if (logo?.b64) {
      const ext = logo.ext ?? 'svg';
      await pushAsset(`public/assets/logotipo/logotipo-original.${ext}`, logo.b64);
      await pushAsset(`public/assets/logotipo/logotipo-negative.${ext}`, logo.b64);
    }
    if (faviconAsset?.b64) {
      await pushAsset(`public/favicon.${faviconAsset.ext ?? 'svg'}`, faviconAsset.b64);
    }

    // ── Step 5b: swap index.html with the correct layout template ───────────
    // banner → index.html (already correct, no swap needed)
    // sidebar → home-side-bar.html replaces index.html
    // tabmenu → home-v2.html replaces index.html
    const layoutTemplateMap: Record<string, string> = {
      sidebar: 'home-side-bar.html',
      tabmenu: 'home-v2.html',
    };
    const templateFile = layoutTemplateMap[layout ?? 'banner'];
    if (templateFile) {
      const tplRes = await gh(`/repos/${githubOrg}/${repoName}/contents/${templateFile}`);
      if (tplRes.ok) {
        const tplData = await tplRes.json() as { content: string; sha: string };
        // GitHub returns base64 with embedded newlines — strip them before re-pushing
        const tplBase64 = tplData.content.replace(/\n/g, '');
        const indexRes = await gh(`/repos/${githubOrg}/${repoName}/contents/index.html`);
        let indexSha: string | undefined;
        if (indexRes.ok) {
          const indexData = await indexRes.json() as { sha: string };
          indexSha = indexData.sha;
        }
        await gh(`/repos/${githubOrg}/${repoName}/contents/index.html`, {
          method: 'PUT',
          body: JSON.stringify({
            message: `chore: set ${layout} layout as homepage`,
            content: tplBase64,
            ...(indexSha ? { sha: indexSha } : {}),
          }),
        });
      }
    }

    // ── Step 5c: generate blank pages from canais tree ────────────────────────
    if (canais && canais.length > 0) {
      for (const canal of canais) {
        if (!canal.enabled) continue;
        const enabledChildren = canal.children.filter((sc: SubCanalCfg) => sc.enabled);
        if (enabledChildren.length > 0) {
          for (const sub of enabledChildren) {
            if (!sub.href || !sub.href.endsWith('.html')) continue;
            const filePath = sub.href.replace(/^\//, '');
            if (PROTECTED_HTML.has(filePath)) continue;
            const html = buildBlankPage(sub.label, canal.label);
            const b64 = btoa(unescape(encodeURIComponent(html)));
            await pushAsset(filePath, b64);
          }
        } else if (canal.href && canal.href.endsWith('.html')) {
          const filePath = canal.href.replace(/^\//, '');
          if (PROTECTED_HTML.has(filePath)) continue;
          const html = buildBlankPage(canal.label, null);
          const b64 = btoa(unescape(encodeURIComponent(html)));
          await pushAsset(filePath, b64);
        }
      }
    }

    const repoUrl  = `https://github.com/${githubOrg}/${repoName}`;
    let   vercelUrl = `https://${repoName}.vercel.app`;
    let   vercelCreated = false;
    let   vercelError: string | undefined;

    // ── Step 5: create Vercel project (optional) ──────────────────────────
    if (vercelToken) {
      const vercelRes = await fetch('https://api.vercel.com/v10/projects', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: repoName,
          framework: null,
          gitRepository: { type: 'github', repo: `${githubOrg}/${repoName}` },
        }),
      });

      if (vercelRes.ok) {
        const vd = await vercelRes.json() as { name: string; id: string };
        vercelUrl = `https://${vd.name}.vercel.app`;
        vercelCreated = true;

        // Commits were pushed before the Vercel project existed, so Vercel never saw them.
        // Trigger an explicit deployment from the main branch now.
        await fetch('https://api.vercel.com/v13/deployments', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: vd.name,
            project: vd.id,
            target: 'production',
            gitSource: { type: 'github', org: githubOrg, repo: repoName, ref: 'main' },
          }),
        });
      } else {
        const vBody = await vercelRes.json().catch(() => ({})) as { error?: { message?: string } };
        vercelError = vBody?.error?.message ?? `HTTP ${vercelRes.status}`;
      }
    } else {
      vercelError = 'VERCEL_TOKEN não configurado';
    }

    // ── Step 6: update portal record with final Vercel URL + create portal_config
    let siteUpsertError: string | undefined;
    let configUpsertError: string | undefined;
    try {
      const adminClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );

      // Update vercel_url now that we know the final Vercel project URL
      const { data: portalRow, error: portalUpdateError } = await adminClient.from('portals')
        .update({ vercel_url: vercelUrl, vercel_created: vercelCreated })
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
          link: vercelUrl ? vercelUrl.replace(/^https?:\/\//, '') : `${repoName}.vercel.app`,
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
            cvmCodigo: '',
            autoCvm: false,
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

    return new Response(JSON.stringify({ repoName, repoUrl, vercelUrl, vercelCreated, vercelError, portalUuid, siteUpsertError, configUpsertError, portalUpsertError, assetErrors: assetErrors.length ? assetErrors : undefined }), {
      status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...ch, 'Content-Type': 'application/json' },
    });
  }
});
