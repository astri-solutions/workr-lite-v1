import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Colors { primary: string; secondary: string; tertiary: string; }
interface Fonts { display: string; body: string; }

function buildSiteConfig(opts: {
  nome: string;
  colors: Colors;
  fonts: Fonts;
}) {
  return `// scripts/site.config.js
// Gerado pelo Workr Lite CMS — não editar manualmente.
export const siteConfig = {

  company: {
    name:        ${JSON.stringify(opts.nome)},
    nameShort:   ${JSON.stringify(opts.nome)},
    description: 'Relações com Investidores — ' + ${JSON.stringify(opts.nome)} + '.',
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

  ticker: {
    type:      'static',
    iframeUrl: '',
    items: [
      { symbol: 'WRLT3', price: 'R$ 00,00', change: '0,00%', direction: 'up' },
    ],
  },

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

  empresas: [],

  header: { variant: 'navbar-default' },

  restrictedNav: [],

  footer: {
    variant: 'simple',
    address:   '',
    email:     '',
    phone:     '',
    hours:     '',
    copyright: \`©Copyright \${opts.nome} \${new Date().getFullYear()}\`,
    social: { linkedin: '#', instagram: '#', facebook: '#' },
    legalLinks: [
      { label: 'Termos e Condições',      href: '/termos-e-condicoes.html'      },
      { label: 'Política de Privacidade', href: '/politica-de-privacidade.html' },
      { label: 'Definições de Cookies',   href: '/definicao-de-cookies.html'    },
    ],
    legalText: 'As informações contidas neste site são de caráter meramente informativo e não constituem oferta de valores mobiliários.',
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

    const { repoName, portalNome, colors, fonts } = await req.json() as {
      repoName?: string;
      portalNome: string;
      colors: Colors;
      fonts: Fonts;
    };

    const githubToken = Deno.env.get('GITHUB_TOKEN');
    const githubOrg = Deno.env.get('GITHUB_ORG') ?? 'astri-solutions';

    if (!githubToken) {
      return new Response(JSON.stringify({ error: 'GITHUB_TOKEN secret not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetRepo = repoName ?? 'cliente-workr-lite';
    const filePath = 'scripts/site.config.js';
    const newContent = buildSiteConfig({ nome: portalNome, colors, fonts });
    const encoded = btoa(unescape(encodeURIComponent(newContent)));

    // Get current file SHA (required for update)
    const getRes = await fetch(
      `https://api.github.com/repos/${githubOrg}/${targetRepo}/contents/${filePath}`,
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

    // Create or update the file
    const putRes = await fetch(
      `https://api.github.com/repos/${githubOrg}/${targetRepo}/contents/${filePath}`,
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
