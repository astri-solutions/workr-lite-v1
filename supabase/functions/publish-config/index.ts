import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

function buildSiteConfig(opts: {
  nome: string;
  layout: string;
  colors: Colors;
  fonts: Fonts;
  ticker: TickerCfg | null;
  footer: FooterCfg | null;
  canais?: CanalCfg[];
}) {
  const year = new Date().getFullYear();

  // Tickers
  const tickers = opts.ticker?.items?.length
    ? opts.ticker.items.map(t => `    { symbol: ${JSON.stringify(t.symbol)}, price: ${JSON.stringify(t.price)}, change: ${JSON.stringify(t.change)}, direction: ${JSON.stringify(t.direction)} }`).join(',\n')
    : `    { symbol: 'WRLT3', price: 'R$ 00,00', change: '0,00%', direction: 'up' }`;

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
    logoOriginal: '/assets/logotipo/logotipo-original.svg',
    logoNegative: '/assets/logotipo/logotipo-negative.svg',
    logoContrast: '/assets/logotipo/logotipo-negative.svg',
    favicon:      '/favicon.svg',
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

  tickers: [
${tickers}
  ],

${buildNavSection(opts.canais ?? [])}

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

};
`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const role = user.app_metadata?.role as string | undefined;
    if (role !== 'super_admin' && role !== 'client_user') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { repoName, portalNome, layout, colors, fonts, footer, ticker, canais } = await req.json() as {
      repoName?: string;
      portalNome: string;
      layout?: string;
      colors: Colors;
      fonts: Fonts;
      footer?: FooterCfg | null;
      ticker?: TickerCfg | null;
      canais?: CanalCfg[];
    };

    const githubToken = Deno.env.get('GITHUB_TOKEN');
    const githubOrg = Deno.env.get('GITHUB_ORG') ?? 'astri-solutions';

    if (!githubToken) {
      return new Response(JSON.stringify({ error: 'GITHUB_TOKEN secret not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!repoName) {
      return new Response(JSON.stringify({ error: 'repoName is required — portal has no linked GitHub repository' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
    });
    const encoded = btoa(unescape(encodeURIComponent(newContent)));

    const getRes = await fetch(
      `https://api.github.com/repos/${githubOrg}/${repoName}/contents/${filePath}`,
      {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
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
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `chore: update site.config.js via CMS [${portalNome}]`,
          content: encoded,
          ...(sha ? { sha } : {}),
        }),
      }
    );

    if (!putRes.ok) {
      const putBody = await putRes.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: `GitHub: ${putBody.message ?? putRes.statusText}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
