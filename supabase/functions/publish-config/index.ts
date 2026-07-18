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
interface Fonts { display: string; body: string; }
interface TickerItem { symbol: string; price: string; change: string; direction: string; }
interface TickerCfg { type: string; iframeUrl?: string; items?: TickerItem[]; }
interface SocialCfg { platform: string; url: string; }
interface LegalLinkCfg { id: string; label: string; enabled: boolean; }
interface FooterCfg {
  address?: string; email?: string; phone?: string; hours?: string;
  copyright?: string; disclaimer?: string;
  socials?: SocialCfg[];
  legalLinks?: LegalLinkCfg[];
}
interface SubCanalCfg { id?: string; label: string; href: string; enabled: boolean; pageType?: string; }
interface CanalCfg { id?: string; label: string; href?: string; enabled: boolean; children: SubCanalCfg[]; pageType?: string; }
interface EmpresaCfg { id: string; label: string; short: string; }

interface SplashBtn { label: string; url: string; variant: string; }
interface SplashCfg {
  enabled: boolean; size: string;
  titulo: string; texto: string; conteudo: string; legenda: string;
  buttons: SplashBtn[];
}
interface CookieBtn { label: string; action: string; variant: string; }
interface CookieCfg {
  enabled: boolean; layout: string; theme: string;
  title: string; description: string;
  linkText: string; linkUrl: string;
  acceptLabel: string; rejectLabel: string;
  showReject: boolean; showCustomize: boolean; customizeLabel: string;
  buttons: CookieBtn[];
}
interface ErrorPageTexts { title: string; description: string; cta: string; }
interface ErrorPageCfg { code: number; texts: ErrorPageTexts | null; }
interface BannerSlideContent { titulo: string; subtitulo: string; cta: string; }
interface BannerSlideCfg { id: string; content: Record<string, BannerSlideContent>; }
interface AssetCfg { base64: string; ext: string; }

// Pages that ship with specialized JS/structure — never overwrite or delete
const PROTECTED_HTML = new Set([
  'index.html', 'home-side-bar.html', 'home-v2.html',
  'documentos-cvm.html', '404.html', 'area-restrita.html',
  'politica-de-privacidade.html', 'termos-e-condicoes.html', 'definicao-de-cookies.html',
  'cms-show.html', 'cms-lista.html', 'cms-lista-agrupada.html',
  'cms-tabela.html', 'cms-blog.html', 'cms-galeria.html', 'cms-formulario.html',
]);

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

function headerVariant(layout: string): string {
  if (layout === 'sidebar') return 'sidebar';
  if (layout === 'tabmenu') return 'tabmenu';
  return 'banner';
}

function buildNavSection(canais: CanalCfg[]): string {
  const enabled = canais.filter(c => c.enabled);
  if (enabled.length === 0) {
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

function buildEmpresasSection(empresas: EmpresaCfg[] | undefined, nome: string): string {
  if (empresas && empresas.length > 0) {
    return empresas.map(e =>
      '    { id: ' + JSON.stringify(e.id) + ', label: ' + JSON.stringify(e.label) + ', short: ' + JSON.stringify(e.short) + ' }'
    ).join(',\n');
  }
  const short = nome.split(' ').filter((w: string) => w.length > 2).map((w: string) => w[0]).join('').toUpperCase() || nome.slice(0, 3).toUpperCase();
  return '    { id: \'principal\', label: ' + JSON.stringify(nome) + ', short: ' + JSON.stringify(short) + ' }';
}

function buildSplashSection(splash: SplashCfg | null | undefined): string {
  if (splash) {
    return JSON.stringify(splash, null, 2).split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n');
  }
  return '{\n    enabled: false,\n    size: \'md\',\n    titulo: \'\',\n    texto: \'\',\n    conteudo: \'\',\n    legenda: \'\',\n    buttons: [],\n  }';
}

function buildCookiesSection(cookies: CookieCfg | null | undefined): string {
  if (cookies) {
    return JSON.stringify(cookies, null, 2).split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n');
  }
  return '{\n    enabled: true,\n    layout: \'full\',\n    theme: \'light\',\n    title: \'Utilizamos cookies\',\n    description: \'Usamos cookies para melhorar sua experiência.\',\n    acceptLabel: \'Aceitar todos\',\n    rejectLabel: \'Rejeitar\',\n    showReject: true,\n    showCustomize: false,\n  }';
}

// ── Unified site.config.js builder (shared schema with provision-portal) ──────
// ticker uses singular object with `type` + `items[]` — matches provision-portal schema.
function buildSiteConfig(opts: {
  nome: string;
  layout: string;
  colors: Colors;
  fonts: Fonts;
  ticker: TickerCfg | null;
  footer: FooterCfg | null;
  canais?: CanalCfg[];
  empresas?: EmpresaCfg[];
  splash?: SplashCfg | null;
  cookies?: CookieCfg | null;
  errorPages?: ErrorPageCfg[] | null;
  banner?: BannerSlideCfg[] | null;
  logoExt?: string;
  faviconExt?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  portalUuid?: string;
}) {
  const year = new Date().getFullYear();

  const tickerType = opts.ticker?.type ?? 'static';
  const tickerIframe = JSON.stringify(opts.ticker?.iframeUrl ?? '');
  const tickerItems = opts.ticker?.items?.length
    ? opts.ticker.items.map(t =>
        `      { symbol: ${JSON.stringify(t.symbol)}, price: ${JSON.stringify(t.price)}, change: ${JSON.stringify(t.change)}, direction: ${JSON.stringify(t.direction)} }`
      ).join(',\n')
    : `      { symbol: 'WRLT3', price: 'R$ 00,00', change: '0,00%', direction: 'up' }`;

  const f = opts.footer;
  const address   = JSON.stringify(f?.address ?? '');
  const email     = JSON.stringify(f?.email ?? '');
  const phone     = JSON.stringify(f?.phone ?? '');
  const hours     = JSON.stringify(f?.hours ?? '');
  const copyright = JSON.stringify(f?.copyright ?? `©Copyright ${opts.nome} ${year}`);
  const legalText = JSON.stringify(f?.disclaimer ?? 'As informações contidas neste site são de caráter meramente informativo e não constituem oferta de valores mobiliários.');

  const legalLinksArr = (f?.legalLinks ?? [
    { id: 'termos', label: 'Termos e Condições', enabled: true },
    { id: 'privacidade', label: 'Política de Privacidade', enabled: true },
    { id: 'cookies', label: 'Definições de Cookies', enabled: true },
  ]).filter((l: LegalLinkCfg) => l.enabled);
  const legalLinks = legalLinksArr.map((l: LegalLinkCfg) => {
    const href = l.id === 'termos' ? '/termos-e-condicoes.html'
      : l.id === 'privacidade' ? '/politica-de-privacidade.html'
      : l.id === 'cookies' ? '/definicao-de-cookies.html'
      : `/${l.id}.html`;
    return `      { label: ${JSON.stringify(l.label)}, href: '${href}' }`;
  }).join(',\n');

  const socials = f?.socials ?? [];
  const linkedin  = JSON.stringify(socials.find((s: SocialCfg) => s.platform === 'LinkedIn')?.url || '#');
  const instagram = JSON.stringify(socials.find((s: SocialCfg) => s.platform === 'Instagram')?.url || '#');
  const facebook  = JSON.stringify(socials.find((s: SocialCfg) => s.platform === 'Facebook')?.url || '#');

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
    type:      ${JSON.stringify(tickerType)},
    iframeUrl: ${tickerIframe},
    items: [
${tickerItems}
    ],
  },

${buildNavSection(opts.canais ?? [])}

  empresas: [
${buildEmpresasSection(opts.empresas, opts.nome)}
  ],

  header: { variant: '${headerVariant(opts.layout)}' },

  restrictedNav: [],

  footer: {
    variant: 'simple',
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

  splash: ${buildSplashSection(opts.splash)},

  cookies: ${buildCookiesSection(opts.cookies)},

  errorPages: ${opts.errorPages ? JSON.stringify(opts.errorPages, null, 2).split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n') : '[]'},

  banner: ${opts.banner ? JSON.stringify(opts.banner, null, 2).split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n') : '[]'},

  supabase: {
    url:      ${JSON.stringify(opts.supabaseUrl ?? null)},
    anonKey:  ${JSON.stringify(opts.supabaseAnonKey ?? null)},
    portalId: ${JSON.stringify(opts.portalUuid ?? null)},
  },

};
`;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const ch = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: ch });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonClient = createClient(
      supabaseUrl,
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
    if (role !== 'super_admin' && role !== 'client_user') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const {
      repoName: repoNameRaw, portalId, portalNome, layout, colors, fonts, footer, ticker,
      canais, empresas, splash, cookies, errorPages, banner, logo, favicon,
    } = await req.json() as {
      repoName?: string;
      portalId?: string;
      portalNome: string;
      layout?: string;
      colors: Colors;
      fonts: Fonts;
      footer?: FooterCfg | null;
      ticker?: TickerCfg | null;
      canais?: CanalCfg[];
      empresas?: EmpresaCfg[];
      splash?: SplashCfg | null;
      cookies?: CookieCfg | null;
      errorPages?: ErrorPageCfg[] | null;
      banner?: BannerSlideCfg[] | null;
      logo?: AssetCfg | null;
      favicon?: AssetCfg | null;
    };

    const githubToken = Deno.env.get('GITHUB_TOKEN');
    const githubOrg   = Deno.env.get('GITHUB_ORG') ?? 'astri-solutions';

    if (!githubToken) {
      return new Response(JSON.stringify({ error: 'GITHUB_TOKEN secret not configured' }), {
        status: 500, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    // Resolve repoName: either passed directly, or looked up from portals table by portalId
    let repoName = repoNameRaw;
    let resolvedPortalUuid: string | undefined;
    let savedLogoExt: string | undefined;
    let savedFaviconExt: string | undefined;
    if (!repoName && portalId) {
      const adminClient = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data: portalRow } = await adminClient
        .from('portals')
        .select('github_repo, id')
        .eq('portal_key', portalId)
        .single();
      repoName = portalRow?.github_repo ?? undefined;
      resolvedPortalUuid = portalRow?.id ?? undefined;
    }

    // Fetch previously saved logo/favicon extensions so we don't reset them on publish
    if (resolvedPortalUuid || portalId) {
      try {
        const adminClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
        const query = resolvedPortalUuid
          ? adminClient.from('portal_config').select('logo_ext, favicon_ext').eq('portal_id', resolvedPortalUuid).maybeSingle()
          : adminClient.from('portal_config').select('logo_ext, favicon_ext, portal_id').eq('portal_id',
              (await adminClient.from('portals').select('id').eq('portal_key', portalId!).maybeSingle()).data?.id ?? ''
            ).maybeSingle();
        const { data: cfgRow } = await query;
        savedLogoExt = cfgRow?.logo_ext ?? undefined;
        savedFaviconExt = cfgRow?.favicon_ext ?? undefined;
      } catch { /* non-fatal */ }
    }

    if (!repoName) {
      return new Response(JSON.stringify({ error: 'repoName is required — portal has no linked GitHub repository' }), {
        status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    // ── Tenant verification: ensure this repo belongs to the requesting user ──
    // super_admin can publish to any portal; client_user must own the portal.
    if (role === 'client_user') {
      const adminClient = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data: portalRow } = await adminClient
        .from('portals')
        .select('id')
        .eq('github_repo', repoName)
        .single();

      if (!portalRow) {
        return new Response(JSON.stringify({ error: 'Forbidden: repository does not belong to your portal' }), {
          status: 403, headers: { ...ch, 'Content-Type': 'application/json' },
        });
      }

      // Verify the user is actually linked to this portal via app_metadata
      const userPortalIds: string[] = user.app_metadata?.portalIds ?? [];
      if (!userPortalIds.includes(portalRow.id)) {
        return new Response(JSON.stringify({ error: 'Forbidden: not your portal' }), {
          status: 403, headers: { ...ch, 'Content-Type': 'application/json' },
        });
      }

      resolvedPortalUuid ??= portalRow.id;
    } else if (!resolvedPortalUuid && repoName) {
      // super_admin path: look up UUID by repo name if not already resolved
      try {
        const adminClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
        const { data: portalRow } = await adminClient
          .from('portals').select('id').eq('github_repo', repoName).single();
        resolvedPortalUuid = portalRow?.id ?? undefined;
      } catch { /* non-fatal */ }
    }

    const filePath = 'scripts/site.config.js';
    const newContent = buildSiteConfig({
      nome: portalNome,
      layout: layout ?? 'banner',
      colors,
      fonts,
      footer: footer ?? null,
      ticker: ticker ?? null,
      canais: canais ?? [],
      empresas: empresas ?? [],
      splash: splash ?? null,
      cookies: cookies ?? null,
      errorPages: errorPages ?? null,
      banner: banner ?? null,
      logoExt: logo?.ext ?? savedLogoExt,
      faviconExt: favicon?.ext ?? savedFaviconExt,
      supabaseUrl: Deno.env.get('SUPABASE_URL'),
      supabaseAnonKey: Deno.env.get('SUPABASE_ANON_KEY'),
      portalUuid: resolvedPortalUuid,
    });
    const encoded = btoa(unescape(encodeURIComponent(newContent)));

    const ghHeaders = {
      'Authorization': `Bearer ${githubToken}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    };

    const getRes = await fetch(
      `https://api.github.com/repos/${githubOrg}/${repoName}/contents/${filePath}`,
      { headers: ghHeaders }
    );

    let sha: string | undefined;
    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
    }

    const putRes = await fetch(
      `https://api.github.com/repos/${githubOrg}/${repoName}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: ghHeaders,
        body: JSON.stringify({
          message: `chore: update site.config.js via CMS [${portalNome}]`,
          content: encoded,
          ...(sha ? { sha } : {}),
        }),
      }
    );

    if (!putRes.ok) {
      const putBody = await putRes.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: `GitHub: ${(putBody as { message?: string }).message ?? putRes.statusText}` }), {
        status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    // ── Shared asset pusher ───────────────────────────────────────────────────
    async function pushAsset(assetBase64: string, ghPath: string, commitMsg: string) {
      // Strip newlines from base64 — GitHub API rejects content with embedded newlines
      const cleanBase64 = assetBase64.replace(/\n/g, '');
      const getR = await fetch(`https://api.github.com/repos/${githubOrg}/${repoName}/contents/${ghPath}`, { headers: ghHeaders });
      const existingSha = getR.ok ? ((await getR.json()) as { sha?: string }).sha : undefined;
      const putR = await fetch(`https://api.github.com/repos/${githubOrg}/${repoName}/contents/${ghPath}`, {
        method: 'PUT',
        headers: ghHeaders,
        body: JSON.stringify({ message: commitMsg, content: cleanBase64, ...(existingSha ? { sha: existingSha } : {}) }),
      });
      if (!putR.ok) {
        const body = await putR.json().catch(() => ({})) as { message?: string };
        throw new Error(`GitHub PUT ${ghPath} failed (${putR.status}): ${body.message ?? putR.statusText}`);
      }
    }

    const assetWarnings: string[] = [];

    // Push latest theme.js — fetched from the template repo so it's always up-to-date
    try {
      const templateOrg = githubOrg;
      const themeRes = await fetch(
        `https://api.github.com/repos/${templateOrg}/cliente-workr-lite/contents/scripts/components/theme.js`,
        { headers: ghHeaders }
      );
      if (themeRes.ok) {
        const themeData = await themeRes.json() as { content: string; sha: string };
        // GitHub returns base64 with embedded newlines — strip them
        const themeBase64 = themeData.content.replace(/\n/g, '');
        await pushAsset(themeBase64, 'scripts/components/theme.js', `chore: update theme.js via CMS [${portalNome}]`);
      }
    } catch { assetWarnings.push('theme.js update failed'); }

    // Push latest footer.js from template
    try {
      const footerRes = await fetch(
        `https://api.github.com/repos/${githubOrg}/cliente-workr-lite/contents/scripts/components/footer.js`,
        { headers: ghHeaders }
      );
      if (footerRes.ok) {
        const footerData = await footerRes.json() as { content: string; sha: string };
        const footerBase64 = footerData.content.replace(/\n/g, '');
        await pushAsset(footerBase64, 'scripts/components/footer.js', `chore: update footer.js via CMS [${portalNome}]`);
      }
    } catch { assetWarnings.push('footer.js update failed'); }

    // Push latest materias.js from template — ensures canal id resolution works across all portals
    try {
      const materiasRes = await fetch(
        `https://api.github.com/repos/${githubOrg}/cliente-workr-lite/contents/scripts/components/materias.js`,
        { headers: ghHeaders }
      );
      if (materiasRes.ok) {
        const materiasData = await materiasRes.json() as { content: string };
        const materiasBase64 = materiasData.content.replace(/\n/g, '');
        await pushAsset(materiasBase64, 'scripts/components/materias.js', `chore: update materias.js via CMS [${portalNome}]`);
      }
    } catch { assetWarnings.push('materias.js update failed'); }

    // Push latest _topbar.scss from template (always black bg)
    try {
      const topbarRes = await fetch(
        `https://api.github.com/repos/${githubOrg}/cliente-workr-lite/contents/styles/components/_topbar.scss`,
        { headers: ghHeaders }
      );
      if (topbarRes.ok) {
        const topbarData = await topbarRes.json() as { content: string; sha: string };
        const topbarBase64 = topbarData.content.replace(/\n/g, '');
        await pushAsset(topbarBase64, 'styles/components/_topbar.scss', `chore: update _topbar.scss via CMS [${portalNome}]`);
      }
    } catch { assetWarnings.push('_topbar.scss update failed'); }

    // Ensure index.html matches the portal layout template (self-healing for mis-provisioned portals)
    const layoutTemplateFile: Record<string, string> = { sidebar: 'home-side-bar.html', tabmenu: 'home-v2.html' };
    const tplFile = layoutTemplateFile[layout ?? ''];
    if (tplFile) {
      try {
        const tplRes = await fetch(
          `https://api.github.com/repos/${githubOrg}/cliente-workr-lite/contents/${tplFile}`,
          { headers: ghHeaders }
        );
        if (tplRes.ok) {
          const tplData = await tplRes.json() as { content: string };
          const tplBase64 = tplData.content.replace(/\n/g, '');
          await pushAsset(tplBase64, 'index.html', `chore: set ${layout} layout template [${portalNome}]`);
        }
      } catch { assetWarnings.push('index.html layout swap failed'); }
    }
    if (logo?.base64) {
      try {
        await pushAsset(logo.base64, `assets/logotipo/logotipo-original.${logo.ext}`, `chore: update logotipo via CMS [${portalNome}]`);
        await pushAsset(logo.base64, `assets/logotipo/logotipo-negative.${logo.ext}`, `chore: update logotipo via CMS [${portalNome}]`);
      } catch { assetWarnings.push('logo upload failed'); }
    }
    if (favicon?.base64) {
      try {
        await pushAsset(favicon.base64, `favicon.${favicon.ext}`, `chore: update favicon via CMS [${portalNome}]`);
      } catch { assetWarnings.push('favicon upload failed'); }
    }

    // Create missing HTML pages for newly added canais (idempotent — skips existing files)
    async function createMissingPage(ghPath: string, html: string, commitMsg: string) {
      const checkRes = await fetch(
        `https://api.github.com/repos/${githubOrg}/${repoName}/contents/${ghPath}`,
        { headers: ghHeaders }
      );
      if (checkRes.ok) return; // file already exists, skip
      const content = btoa(unescape(encodeURIComponent(html)));
      await fetch(
        `https://api.github.com/repos/${githubOrg}/${repoName}/contents/${ghPath}`,
        {
          method: 'PUT',
          headers: ghHeaders,
          body: JSON.stringify({ message: commitMsg, content }),
        }
      );
    }

    if (canais && canais.length > 0) {
      for (const canal of canais) {
        if (!canal.enabled) continue;
        if (canal.children && canal.children.length > 0) {
          for (const sub of canal.children) {
            if (!sub.enabled) continue;
            const href = sub.href ?? '';
            if (!href.endsWith('.html')) continue;
            const ghPath = href.replace(/^\//, '');
            if (PROTECTED_HTML.has(ghPath)) continue;
            try {
              await createMissingPage(
                ghPath,
                buildBlankPage(sub.label, canal.label),
                `feat: add page ${ghPath} via CMS [${portalNome}]`
              );
            } catch { assetWarnings.push(`page creation failed: ${ghPath}`); }
          }
        } else {
          const href = canal.href ?? '';
          if (!href.endsWith('.html')) continue;
          const ghPath = href.replace(/^\//, '');
          if (PROTECTED_HTML.has(ghPath)) continue;
          try {
            await createMissingPage(
              ghPath,
              buildBlankPage(canal.label, null),
              `feat: add page ${ghPath} via CMS [${portalNome}]`
            );
          } catch { assetWarnings.push(`page creation failed: ${ghPath}`); }
        }
      }
    }

    // Delete HTML files for canals that were removed from the tree
    if (canais) {
      try {
        const activeHrefs = new Set<string>();
        for (const canal of canais) {
          if (canal.href?.endsWith('.html')) activeHrefs.add(canal.href.replace(/^\//, ''));
          for (const sub of canal.children ?? []) {
            if (sub.href?.endsWith('.html')) activeHrefs.add(sub.href.replace(/^\//, ''));
          }
        }
        const contentsRes = await fetch(
          `https://api.github.com/repos/${githubOrg}/${repoName}/contents/`,
          { headers: ghHeaders }
        );
        if (contentsRes.ok) {
          const files = await contentsRes.json() as { name: string; sha: string; type: string }[];
          for (const file of files) {
            if (file.type !== 'file' || !file.name.endsWith('.html')) continue;
            if (PROTECTED_HTML.has(file.name) || activeHrefs.has(file.name)) continue;
            await fetch(
              `https://api.github.com/repos/${githubOrg}/${repoName}/contents/${file.name}`,
              {
                method: 'DELETE',
                headers: ghHeaders,
                body: JSON.stringify({
                  message: `chore: remove orphaned page ${file.name} via CMS [${portalNome}]`,
                  sha: file.sha,
                }),
              }
            );
          }
        }
      } catch { assetWarnings.push('orphan page cleanup failed'); }
    }

    // Persist portal→repo mapping and sync portal_config to Supabase
    if (portalId) {
      try {
        const adminClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

        // Self-healing: ensure portals row exists with repo link
        const { data: portalRow } = await adminClient
          .from('portals')
          .upsert(
            { portal_key: portalId, cliente: portalNome, github_repo: repoName },
            { onConflict: 'portal_key' },
          )
          .select('id')
          .single();

        // Sync all CMS config fields to portal_config so Supabase stays in sync with GitHub
        if (portalRow?.id) {
          const configPatch: Record<string, unknown> = {
            portal_id: portalRow.id,
            layout: layout ?? 'banner',
            cores: colors,
            fontes: fonts,
            ticker: ticker ?? null,
            footer: footer ?? null,
            canais: canais ?? [],
            empresas: empresas ?? [],
            splash: splash ?? null,
            cookies: cookies ?? null,
            banner_slides: banner ?? null,
            updated_at: new Date().toISOString(),
          };
          if (logo?.ext) configPatch.logo_ext = logo.ext;
          if (favicon?.ext) configPatch.favicon_ext = favicon.ext;
          await adminClient.from('portal_config').upsert(configPatch, { onConflict: 'portal_id' });
        }
      } catch { /* non-fatal */ }
    }

    return new Response(JSON.stringify({ ok: true, warnings: assetWarnings.length ? assetWarnings : undefined }), {
      status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const ch2 = corsHeaders(req.headers.get('Origin'));
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...ch2, 'Content-Type': 'application/json' },
    });
  }
});
