import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Colors { primary: string; secondary: string; tertiary: string; }
interface Fonts  { display: string; body: string; }
interface SocialCfg { platform: string; url: string; }
interface LegalLinkCfg { id: string; label: string; enabled: boolean; }
interface FooterCfg {
  address?: string; email?: string; phone?: string; hours?: string;
  copyright?: string; disclaimer?: string;
  socials?: SocialCfg[];
  legalLinks?: LegalLinkCfg[];
}

// ── site.config.js builder ───────────────────────────────────────────────────
function buildSiteConfig(opts: {
  nome: string;
  colors: Colors;
  fonts: Fonts;
  footer?: FooterCfg | null;
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
    { symbol: 'WRLT3', price: 'R$ 00,00', change: '0,00%', direction: 'up' },
  ],

  nav: [
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
  ],

  header: { variant: 'navbar-default' },

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

// ── Main ──────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth check
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
    if (role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: super_admin required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { portalId: _portalId, nome, subdomain, colors, fonts, footer } = await req.json() as {
      portalId: string;
      nome: string;
      subdomain: string;
      colors?: Colors;
      fonts?: Fonts;
      footer?: FooterCfg | null;
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
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Step 1: get template's current main branch commit ─────────────────
    const refData = await ghJson<{ object: { sha: string } }>(
      await gh(`/repos/${githubOrg}/${templateRepo}/git/refs/heads/main`)
    );
    const templateCommitSha = refData.object.sha;

    // ── Step 2: get the tree SHA from that commit ─────────────────────────
    const commitData = await ghJson<{ tree: { sha: string } }>(
      await gh(`/repos/${githubOrg}/${templateRepo}/git/commits/${templateCommitSha}`)
    );
    const templateTreeSha = commitData.tree.sha;

    // ── Step 3: create new empty repo in the org ──────────────────────────
    await ghJson<unknown>(await gh(`/orgs/${githubOrg}/repos`, {
      method: 'POST',
      body: JSON.stringify({
        name: repoName,
        description: `Portal RI — ${nome}`,
        private: false,
        auto_init: false,
      }),
    }));

    // ── Step 4: build site.config.js content and create a blob ───────────
    const siteConfigContent = buildSiteConfig({
      nome,
      colors: colors ?? { primary: '#0B5B68', secondary: '#00D865', tertiary: '#141414' },
      fonts:  fonts  ?? { display: 'Plus Jakarta Sans', body: 'Inter' },
      footer: footer ?? null,
    });
    const encoded = btoa(unescape(encodeURIComponent(siteConfigContent)));

    const blobData = await ghJson<{ sha: string }>(
      await gh(`/repos/${githubOrg}/${repoName}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({ content: encoded, encoding: 'base64' }),
      })
    );

    // ── Step 5: create tree extending template's tree with the new config ─
    const newTreeData = await ghJson<{ sha: string }>(
      await gh(`/repos/${githubOrg}/${repoName}/git/trees`, {
        method: 'POST',
        body: JSON.stringify({
          base_tree: templateTreeSha,
          tree: [{
            path: 'scripts/site.config.js',
            mode: '100644',
            type: 'blob',
            sha: blobData.sha,
          }],
        }),
      })
    );

    // ── Step 6: create initial commit ────────────────────────────────────
    const newCommitData = await ghJson<{ sha: string }>(
      await gh(`/repos/${githubOrg}/${repoName}/git/commits`, {
        method: 'POST',
        body: JSON.stringify({
          message: `chore: initialize portal from template [${nome}]`,
          tree: newTreeData.sha,
          parents: [],
        }),
      })
    );

    // ── Step 7: create main branch pointing to the new commit ────────────
    await ghJson<unknown>(await gh(`/repos/${githubOrg}/${repoName}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({
        ref: 'refs/heads/main',
        sha: newCommitData.sha,
      }),
    }));

    const repoUrl  = `https://github.com/${githubOrg}/${repoName}`;
    let   vercelUrl = `https://${subdomain}.vercel.app`;

    // ── Step 8: create Vercel project (optional) ──────────────────────────
    if (vercelToken) {
      const vercelRes = await fetch('https://api.vercel.com/v10/projects', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: subdomain,
          framework: null, // static site — no framework
          gitRepository: { type: 'github', repo: `${githubOrg}/${repoName}` },
        }),
      });

      if (vercelRes.ok) {
        const vd = await vercelRes.json();
        vercelUrl = `https://${vd.name}.vercel.app`;
      }
    }

    return new Response(JSON.stringify({ repoName, repoUrl, vercelUrl }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
