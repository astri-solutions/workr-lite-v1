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
interface LegalLinkCfg { id: string; label: string; enabled: boolean; }
interface FooterCfg {
  address?: string; email?: string; phone?: string; hours?: string;
  copyright?: string; disclaimer?: string;
  socials?: SocialCfg[];
  legalLinks?: LegalLinkCfg[];
}
interface SubCanalCfg { label: string; href: string; enabled: boolean; }
interface CanalCfg { label: string; href?: string; enabled: boolean; children: SubCanalCfg[]; }

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
      return `    { label: ${JSON.stringify(c.label)}, href: ${JSON.stringify(c.href ?? '/')}, children: [] }`;
    }
    const childLines = enabledChildren
      .map(sc => `      { label: ${JSON.stringify(sc.label)}, href: ${JSON.stringify(sc.href)} }`)
      .join(',\n');
    return `    { label: ${JSON.stringify(c.label)}, children: [\n${childLines},\n    ] }`;
  }).join(',\n');

  return `  nav: [\n${items},\n  ],`;
}

function buildSiteConfig(opts: {
  nome: string;
  layout: string;
  colors: Colors;
  fonts: Fonts;
  footer?: FooterCfg | null;
  canais?: CanalCfg[];
  logoExt?: string;
  faviconExt?: string;
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
    const href = l.id === 'termos'      ? '/termos-e-condicoes.html'
               : l.id === 'privacidade' ? '/politica-de-privacidade.html'
               : l.id === 'cookies'     ? '/definicao-de-cookies.html'
               :                         `/${l.id}.html`;
    return `      { label: ${JSON.stringify(l.label)}, href: '${href}' }`;
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
    type:      'static',
    iframeUrl: '',
    items: [
      { symbol: 'WRLT3', price: 'R$ 00,00', change: '0,00%', direction: 'up' },
    ],
  },

${buildNavSection(opts.canais ?? [])}

  empresas: [
    { id: 'principal', label: ${JSON.stringify(opts.nome)}, short: '${opts.nome.split(' ').filter((w: string) => w.length > 2).map((w: string) => w[0]).join('').toUpperCase() || opts.nome.slice(0, 3).toUpperCase()}' },
  ],

  header: { variant: '${headerVariant(opts.layout)}' },

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
const PROTECTED_HTML = new Set(['index.html', 'documentos-cvm.html']);

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

    const { portalId: _portalId, nome, subdomain, layout, colors, fonts, footer, canais, logo, favicon: faviconAsset } = await req.json() as {
      portalId: string;
      nome: string;
      subdomain: string;
      layout?: string;
      colors?: Colors;
      fonts?: Fonts;
      footer?: FooterCfg | null;
      canais?: CanalCfg[];
      logo?: AssetFile;
      favicon?: AssetFile;
    };

    const githubToken  = Deno.env.get('GITHUB_TOKEN');
    const vercelToken  = Deno.env.get('VERCEL_TOKEN');
    const githubOrg    = Deno.env.get('GITHUB_ORG') ?? 'astri-solutions';
    const templateRepo = 'cliente-workr-lite';
    const repoName     = `portal-${subdomain}`;
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

    // ── Step 2: wait for repo to be ready (poll up to 60s) ────────────────
    let ready = false;
    for (let i = 0; i < 20; i++) {
      await sleep(3000);
      const checkRes = await gh(`/repos/${githubOrg}/${repoName}`);
      if (checkRes.ok) { ready = true; break; }
    }
    if (!ready) throw new Error('Novo repositório não ficou pronto em 60s. Tente publicar a configuração manualmente.');

    // ── Step 3: get current site.config.js SHA in new repo ───────────────
    const fileRes = await gh(`/repos/${githubOrg}/${repoName}/contents/scripts/site.config.js`);
    let fileSha: string | undefined;
    if (fileRes.ok) {
      const fileData = await fileRes.json() as { sha: string };
      fileSha = fileData.sha;
    }

    // ── Step 4: build and push customised site.config.js ─────────────────
    const siteConfigContent = buildSiteConfig({
      nome,
      layout: layout ?? 'banner',
      colors: colors ?? { primary: '#0B5B68', secondary: '#00D865', tertiary: '#141414' },
      fonts:  fonts  ?? { display: 'Plus Jakarta Sans', body: 'Inter' },
      footer: footer ?? null,
      canais: canais ?? [],
      logoExt:    logo?.ext,
      faviconExt: faviconAsset?.ext,
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
    async function pushAsset(path: string, b64: string) {
      const existing = await gh(`/repos/${githubOrg}/${repoName}/contents/${path}`);
      let sha: string | undefined;
      if (existing.ok) {
        const d = await existing.json() as { sha: string };
        sha = d.sha;
      }
      await gh(`/repos/${githubOrg}/${repoName}/contents/${path}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `chore: add asset ${path}`,
          content: b64,
          ...(sha ? { sha } : {}),
        }),
      });
    }

    if (logo?.b64) {
      const ext = logo.ext ?? 'svg';
      await pushAsset(`assets/logotipo/logotipo-original.${ext}`, logo.b64);
      await pushAsset(`assets/logotipo/logotipo-negative.${ext}`, logo.b64);
    }
    if (faviconAsset?.b64) {
      await pushAsset(`favicon.${faviconAsset.ext ?? 'svg'}`, faviconAsset.b64);
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
            content: tplData.content,
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
          name: subdomain,
          framework: 'vite',
          gitRepository: { type: 'github', repo: `${githubOrg}/${repoName}` },
        }),
      });

      if (vercelRes.ok) {
        const vd = await vercelRes.json() as { name: string; id: string };
        vercelUrl = `https://${vd.name}.vercel.app`;
        vercelCreated = true;

        // Trigger first deployment by pushing a deploy via Vercel API
        await fetch('https://api.vercel.com/v13/deployments', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: vd.name,
            gitSource: {
              type: 'github',
              org: githubOrg,
              repo: repoName,
              ref: 'main',
            },
            projectSettings: { framework: null },
          }),
        });
      } else {
        const vBody = await vercelRes.json().catch(() => ({})) as { error?: { message?: string } };
        vercelError = vBody?.error?.message ?? `HTTP ${vercelRes.status}`;
      }
    } else {
      vercelError = 'VERCEL_TOKEN não configurado';
    }

    // ── Step 6: persist portal record + initial config in Supabase ──────────
    try {
      const adminClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );

      // Upsert portals row
      const { data: portalRow } = await adminClient.from('portals').upsert({
        portal_key: _portalId,
        cliente: nome,
        subdomain,
        github_repo: repoName,
        vercel_url: vercelUrl,
        empresa_status: 'Ativo',
      }, { onConflict: 'portal_key' }).select('id').single();

      // Create initial portal_config row
      if (portalRow?.id) {
        await adminClient.from('portal_config').upsert({
          portal_id: portalRow.id,
          canais: canais ?? [],
          cores: colors ?? {},
          fontes: fonts ?? {},
          layout: layout ?? 'banner',
          footer: footer ?? {},
        }, { onConflict: 'portal_id' });
      }
    } catch { /* non-fatal — portal still works */ }

    return new Response(JSON.stringify({ repoName, repoUrl, vercelUrl, vercelCreated, vercelError }), {
      status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...ch, 'Content-Type': 'application/json' },
    });
  }
});
