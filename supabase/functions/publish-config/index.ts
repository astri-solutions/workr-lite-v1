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
interface SubCanalCfg { label: string; href: string; enabled: boolean; }
interface CanalCfg { label: string; href?: string; enabled: boolean; children: SubCanalCfg[]; }
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
      return `    { label: ${JSON.stringify(c.label)}, href: ${JSON.stringify(c.href ?? '/')}, children: [] }`;
    }
    const childLines = enabledChildren
      .map(sc => `      { label: ${JSON.stringify(sc.label)}, href: ${JSON.stringify(sc.href)} }`)
      .join(',\n');
    return `    { label: ${JSON.stringify(c.label)}, children: [\n${childLines},\n    ] }`;
  }).join(',\n');

  return `  nav: [\n${items},\n  ],`;
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
${(opts.empresas ?? []).map(e =>
    `    { id: ${JSON.stringify(e.id)}, label: ${JSON.stringify(e.label)}, short: ${JSON.stringify(e.short)} }`
  ).join(',\n') || `    { id: 'principal', label: ${JSON.stringify(opts.nome)}, short: ${JSON.stringify(opts.nome.split(' ').filter((w: string) => w.length > 2).map((w: string) => w[0]).join('').toUpperCase() || opts.nome.slice(0, 3).toUpperCase())} }`}
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

  splash: ${opts.splash ? JSON.stringify(opts.splash, null, 2).split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n') : `{
    enabled: false,
    size: 'md',
    titulo: '',
    texto: '',
    conteudo: '',
    legenda: '',
    buttons: [],
  }`},

  cookies: ${opts.cookies ? JSON.stringify(opts.cookies, null, 2).split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n') : `{
    enabled: true,
    layout: 'full',
    theme: 'light',
    title: 'Utilizamos cookies',
    description: 'Usamos cookies para melhorar sua experiência.',
    acceptLabel: 'Aceitar todos',
    rejectLabel: 'Rejeitar',
    showReject: true,
    showCustomize: false,
  }`},

  errorPages: ${opts.errorPages ? JSON.stringify(opts.errorPages, null, 2).split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n') : '[]'},

  banner: ${opts.banner ? JSON.stringify(opts.banner, null, 2).split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n') : '[]'},

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
    if (!repoName && portalId) {
      const adminClient = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data: portalRow } = await adminClient
        .from('portals')
        .select('github_repo')
        .eq('id', portalId)
        .single();
      repoName = portalRow?.github_repo ?? undefined;
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
      logoExt: logo?.ext,
      faviconExt: favicon?.ext,
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

    // ── Push latest theme.js (full color scale) ───────────────────────────────
    // Ensures existing portals get the updated runtime color system without re-provisioning.
    const themeJs = `// scripts/components/theme.js
// Injeta as cores e fontes do siteConfig como CSS custom properties em runtime.
// Sobrescreve os valores estáticos definidos em _colors.scss e _typography.scss
// sem exigir rebuild de SCSS — basta o CMS atualizar site.config.js.

// ── Color utilities ──────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  if (max === min) { h = s = 0; } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) { r = g = b = l; } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1/3);
  }
  const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
  return \`#\${toHex(r)}\${toHex(g)}\${toHex(b)}\`;
}

function luminance({ r, g, b }) {
  const c = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function buildScale(hex) {
  const { h, s, l } = rgbToHsl(hexToRgb(hex));
  const tL = { 100: Math.min(97, l + (97-l)*0.90), 200: Math.min(97, l + (97-l)*0.75), 300: Math.min(97, l + (97-l)*0.55), 400: Math.min(97, l + (97-l)*0.30), 500: l, 600: Math.max(0, l - l*0.15), 700: Math.max(0, l - l*0.30), 800: Math.max(0, l - l*0.50), 900: Math.max(0, l - l*0.70) };
  const tS = { 100: s*0.15, 200: s*0.25, 300: s*0.40, 400: s*0.65, 500: s, 600: s*0.90, 700: s*0.80, 800: s*0.70, 900: s*0.60 };
  const scale = {};
  for (const n of [100,200,300,400,500,600,700,800,900]) scale[n] = hslToHex(h, tS[n], tL[n]);
  return scale;
}

function onColor(hex) { return luminance(hexToRgb(hex)) > 0.179 ? '#000000' : '#ffffff'; }

// ── Main ─────────────────────────────────────────────────────────────────────

export function initTheme(config) {
  const colors = config.colors ?? {};
  const fonts  = config.fonts  ?? {};
  const rules  = [];

  if (colors.primary) {
    const scale = buildScale(colors.primary);
    const on    = onColor(colors.primary);
    rules.push(
      \`  --color-primary:        \${scale[500]};\`,
      \`  --color-primary-light:  \${scale[100]};\`,
      \`  --color-primary-hover:  \${scale[700]};\`,
      \`  --color-primary-active: \${scale[900]};\`,
      \`  --color-on-primary:     \${on};\`,
      ...[100,200,300,400,500,600,700,800,900].map(n => \`  --color-primary-\${n}:    \${scale[n]};\`),
    );
  }

  if (colors.secondary) {
    const scale = buildScale(colors.secondary);
    const on    = onColor(colors.secondary);
    rules.push(
      \`  --color-secondary:        \${scale[500]};\`,
      \`  --color-secondary-light:  \${scale[100]};\`,
      \`  --color-secondary-hover:  \${scale[700]};\`,
      \`  --color-on-secondary:     \${on};\`,
      ...[100,200,300,400,500,600,700,800,900].map(n => \`  --color-secondary-\${n}:   \${scale[n]};\`),
    );
  }

  if (colors.tertiary) rules.push(\`  --color-tertiary: \${colors.tertiary};\`);

  if (rules.length > 0) {
    const style = document.createElement('style');
    style.id = 'wl-theme-colors';
    style.textContent = \`:root {\\n\${rules.join('\\n')}\\n}\`;
    document.head.appendChild(style);
  }

  const weights = '400;500;600;700';
  const families = [];
  if (fonts.display) families.push(\`family=\${encodeURIComponent(fonts.display)}:wght@\${weights}\`);
  if (fonts.body && fonts.body !== fonts.display) families.push(\`family=\${encodeURIComponent(fonts.body)}:wght@\${weights}\`);

  if (families.length > 0) {
    const preconn1 = document.createElement('link'); preconn1.rel = 'preconnect'; preconn1.href = 'https://fonts.googleapis.com'; document.head.appendChild(preconn1);
    const preconn2 = document.createElement('link'); preconn2.rel = 'preconnect'; preconn2.href = 'https://fonts.gstatic.com'; preconn2.crossOrigin = 'anonymous'; document.head.appendChild(preconn2);
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = \`https://fonts.googleapis.com/css2?\${families.join('&')}&display=swap\`; document.head.appendChild(link);
  }

  if (fonts.display || fonts.body) {
    const fontRules = [
      fonts.display ? \`  --font-display: '\${fonts.display}', sans-serif;\` : '',
      fonts.body    ? \`  --font-body:    '\${fonts.body}', sans-serif;\`    : '',
    ].filter(Boolean).join('\\n');
    const style = document.createElement('style');
    style.id = 'wl-theme-fonts';
    style.textContent = \`:root {\\n\${fontRules}\\n}\`;
    document.head.appendChild(style);
  }
}
`;

    // ── Shared asset pusher ───────────────────────────────────────────────────
    async function pushAsset(assetBase64: string, ghPath: string, commitMsg: string) {
      const getR = await fetch(`https://api.github.com/repos/${githubOrg}/${repoName}/contents/${ghPath}`, { headers: ghHeaders });
      const existingSha = getR.ok ? ((await getR.json()) as { sha?: string }).sha : undefined;
      await fetch(`https://api.github.com/repos/${githubOrg}/${repoName}/contents/${ghPath}`, {
        method: 'PUT',
        headers: ghHeaders,
        body: JSON.stringify({ message: commitMsg, content: assetBase64, ...(existingSha ? { sha: existingSha } : {}) }),
      });
    }

    const assetWarnings: string[] = [];

    // Push latest theme.js so existing portals get the full color scale update
    try {
      await pushAsset(
        btoa(unescape(encodeURIComponent(themeJs))),
        'scripts/components/theme.js',
        `chore: update theme.js color scale via CMS [${portalNome}]`,
      );
    } catch { assetWarnings.push('theme.js update failed'); }
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
