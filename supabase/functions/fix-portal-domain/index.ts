import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Same key-resolution dance as every other function here — see
// sync-template-all for the full rationale.
function resolveServiceKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
    if (keys?.default) return keys.default;
  } catch { /* not JSON or unset */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}

const ALLOWED_ORIGINS = [
  'https://workr-lite-v1.vercel.app',
  'https://workr.dev.br',
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

// Self-heals a Cloudflare-hosted portal's custom subdomain (<slug>.workr.dev.br)
// when it's missing or broken — the same two-call sequence provision-portal
// runs once at creation time (add the hostname to the Pages project, then
// create the actual CNAME record; the first call alone never creates DNS),
// but idempotent: checks what already exists before creating anything, so
// it's safe to run against a portal that's already fine.
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
    const bearerToken = authHeader.replace(/^Bearer\s+/i, '');
    const isServiceRoleCall = bearerToken === resolveServiceKey();

    if (!isServiceRoleCall) {
      const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
      const { data: { user }, error: authError } = await anonClient.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...ch, 'Content-Type': 'application/json' } });
      }
      const role = user.app_metadata?.role as string | undefined;
      if (role !== 'super_admin') {
        return new Response(JSON.stringify({ error: 'Forbidden: super_admin required' }), { status: 403, headers: { ...ch, 'Content-Type': 'application/json' } });
      }
    }

    const { portalId } = await req.json() as { portalId?: string };
    if (!portalId) {
      return new Response(JSON.stringify({ error: 'portalId é obrigatório' }), {
        status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, resolveServiceKey());
    const { data: portal, error: portalErr } = await admin
      .from('portals')
      .select('id, cliente, github_repo, hosting_provider, cloudflare_url')
      .eq('portal_key', portalId)
      .maybeSingle();
    if (portalErr || !portal) {
      return new Response(JSON.stringify({ error: 'Portal não encontrado' }), {
        status: 404, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }
    if (portal.hosting_provider !== 'cloudflare') {
      return new Response(JSON.stringify({ error: `Portal não é hospedado na Cloudflare (hosting_provider=${portal.hosting_provider})` }), {
        status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }
    if (!portal.github_repo) {
      return new Response(JSON.stringify({ error: 'Portal sem repositório vinculado' }), {
        status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const cloudflareToken = Deno.env.get('CLOUDFLARE_API_TOKEN');
    const cloudflareAccountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    if (!cloudflareToken || !cloudflareAccountId) {
      return new Response(JSON.stringify({ error: 'CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID não configurados' }), {
        status: 500, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const cfHeaders = { 'Authorization': `Bearer ${cloudflareToken}`, 'Content-Type': 'application/json' };
    const repoName = portal.github_repo as string;

    // 1. Read the Pages project's real *.pages.dev subdomain — never trust
    // a value guessed from the repo name, and this also confirms the
    // project itself actually exists before we try attaching anything to it.
    const projRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/pages/projects/${repoName}`, {
      headers: cfHeaders,
    });
    if (!projRes.ok) {
      const body = await projRes.json().catch(() => ({})) as { errors?: { message?: string }[] };
      return new Response(JSON.stringify({ error: `Projeto Cloudflare Pages '${repoName}' não encontrado: ${body?.errors?.[0]?.message ?? `HTTP ${projRes.status}`}` }), {
        status: 404, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }
    const projBody = await projRes.json() as { result: { subdomain: string; domains?: string[] } };
    const pagesSubdomain = projBody.result.subdomain; // e.g. "abc123.pages.dev"

    const cleanSubdomain = repoName.replace(/^workr-portal-/, '');
    const customDomain = `${cleanSubdomain}.workr.dev.br`;

    const steps: string[] = [];

    // 2. Ensure the custom hostname is attached to the Pages project.
    if (!(projBody.result.domains ?? []).includes(customDomain)) {
      const domainRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/pages/projects/${repoName}/domains`, {
        method: 'POST',
        headers: cfHeaders,
        body: JSON.stringify({ name: customDomain }),
      });
      if (domainRes.ok || domainRes.status === 409) {
        steps.push('domain:attached');
      } else {
        const body = await domainRes.json().catch(() => ({})) as { errors?: { message?: string }[] };
        const msg = body?.errors?.[0]?.message ?? '';
        // Cloudflare's GET /pages/projects response's `domains` field doesn't
        // always list every attached custom hostname (seen in practice: a
        // domain that's genuinely already attached still gets a 4xx "You
        // have already added this custom domain" from the POST below) — so
        // that exact response is itself proof of the state we wanted, not
        // an error.
        if (/already added this custom domain/i.test(msg)) {
          steps.push('domain:already-attached');
        } else {
          return new Response(JSON.stringify({ error: `Falha ao anexar domínio ao Pages: ${msg || `HTTP ${domainRes.status}`}`, steps }), {
            status: 502, headers: { ...ch, 'Content-Type': 'application/json' },
          });
        }
      }
    } else {
      steps.push('domain:already-attached');
    }

    // 3. Resolve the workr.dev.br zone, then ensure the CNAME record exists
    // — this is the step that was actually missing for the portal that
    // prompted this function: the domain can be "Active" on the Pages side
    // with zero DNS record behind it.
    const zoneRes = await fetch('https://api.cloudflare.com/client/v4/zones?name=workr.dev.br', { headers: cfHeaders });
    const zoneBody = await zoneRes.json().catch(() => ({})) as { result?: { id: string }[] };
    const zoneId = zoneBody.result?.[0]?.id;
    if (!zoneId) {
      return new Response(JSON.stringify({ error: 'Não foi possível resolver a zona workr.dev.br', steps }), {
        status: 502, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const existingRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=CNAME&name=${customDomain}`, { headers: cfHeaders });
    const existingBody = await existingRes.json().catch(() => ({})) as { result?: { id: string; content: string }[] };
    const existingRecord = existingBody.result?.[0];

    if (existingRecord) {
      if (existingRecord.content !== pagesSubdomain) {
        // Record exists but points somewhere stale — repoint it.
        const patchRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${existingRecord.id}`, {
          method: 'PATCH',
          headers: cfHeaders,
          body: JSON.stringify({ content: pagesSubdomain }),
        });
        steps.push(patchRes.ok ? 'dns:repointed' : `dns:repoint-failed:${patchRes.status}`);
      } else {
        steps.push('dns:already-correct');
      }
    } else {
      const dnsRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
        method: 'POST',
        headers: cfHeaders,
        body: JSON.stringify({ type: 'CNAME', name: cleanSubdomain, content: pagesSubdomain, proxied: true }),
      });
      if (dnsRes.ok) {
        steps.push('dns:created');
      } else {
        const body = await dnsRes.json().catch(() => ({})) as { errors?: { message?: string }[] };
        return new Response(JSON.stringify({ error: `Falha ao criar registro DNS: ${body?.errors?.[0]?.message ?? `HTTP ${dnsRes.status}`}`, steps }), {
          status: 502, headers: { ...ch, 'Content-Type': 'application/json' },
        });
      }
    }

    // Keep portals.cloudflare_url pointing at the custom domain — it may
    // still have been correctly set even though the DNS record itself
    // never existed, but this covers the case where it wasn't.
    if (portal.cloudflare_url !== `https://${customDomain}`) {
      await admin.from('portals').update({ cloudflare_url: `https://${customDomain}` }).eq('id', portal.id);
      steps.push('db:cloudflare_url-updated');
    }

    return new Response(JSON.stringify({ ok: true, customDomain, pagesSubdomain, steps }), {
      status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const ch2 = corsHeaders(req.headers.get('Origin'));
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...ch2, 'Content-Type': 'application/json' },
    });
  }
});
