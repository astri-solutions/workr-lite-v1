import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Supabase project migrated to JWT Signing Keys (asymmetric ES256) — the
// legacy SUPABASE_SERVICE_ROLE_KEY (still auto-injected) fails signature
// verification against auth.admin.* calls with "unrecognized JWT kid <nil>
// for algorithm ES256". SUPABASE_SECRET_KEYS (also auto-injected, JSON map)
// holds the new opaque sb_secret_... key that sidesteps this entirely.
function resolveServiceKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
    if (keys?.default) return keys.default;
  } catch { /* not JSON or unset */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}

const ALLOWED_ORIGINS = [
  'https://workr.dev.br',
  'https://workr-lite-v1.pages.dev',
  'http://localhost:5173',
  'http://localhost:4173',
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

// disco/cpu/memória/inodes/versão do PHP não têm equivalente honesto no
// Cloudflare Pages (hosting serverless, sem esse tipo de métrica) — em vez
// de inventar valores, este endpoint só devolve o que a API do Cloudflare
// realmente informa: estado do último deploy e verificação do domínio.
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
    if (role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const { projectName } = await req.json() as { projectName?: string };
    if (!projectName) {
      return new Response(JSON.stringify({ error: 'projectName é obrigatório' }), {
        status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const cloudflareToken     = Deno.env.get('CLOUDFLARE_API_TOKEN');
    const cloudflareAccountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    if (!cloudflareToken || !cloudflareAccountId) {
      return new Response(JSON.stringify({ error: 'CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID não configurados' }), {
        status: 500, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }
    const cfHeaders = { 'Authorization': `Bearer ${cloudflareToken}` };

    let deployState: string | null = null;
    let deployCreatedAt: string | null = null;
    try {
      const depRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/pages/projects/${encodeURIComponent(projectName)}/deployments?per_page=1`,
        { headers: cfHeaders }
      );
      if (depRes.ok) {
        const depJson = await depRes.json() as {
          result?: { latest_stage?: { status?: string }; created_on?: string; environment?: string }[];
        };
        const d = depJson.result?.find(x => x.environment === 'production') ?? depJson.result?.[0];
        if (d) {
          deployState = d.latest_stage?.status ?? null;
          deployCreatedAt = d.created_on ?? null;
        }
      }
    } catch { /* non-fatal */ }

    let domainVerified: boolean | null = null;
    try {
      const domRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/pages/projects/${encodeURIComponent(projectName)}/domains`,
        { headers: cfHeaders }
      );
      if (domRes.ok) {
        const domJson = await domRes.json() as { result?: { status: string }[] };
        if (domJson.result && domJson.result.length > 0) {
          domainVerified = domJson.result.every(d => d.status === 'active');
        }
      }
    } catch { /* non-fatal */ }

    return new Response(JSON.stringify({ ok: true, deployState, deployCreatedAt, domainVerified }), {
      status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const ch2 = corsHeaders(req.headers.get('Origin'));
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...ch2, 'Content-Type': 'application/json' },
    });
  }
});
