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

// The GoTrue Admin API (auth.admin.*) has been observed intermittently
// rejecting whichever of the two candidate service keys resolveServiceKey()
// picked first, with this same "unrecognized JWT kid" error — while the
// other candidate works fine for that same call moments later. Rather than
// surface that raw auth error to the user, adminCall() below tries every
// candidate key in order and only gives up if all of them fail.
function serviceKeyCandidates(): string[] {
  const out: string[] = [];
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
    if (keys?.default) out.push(keys.default);
  } catch { /* not JSON or unset */ }
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy && !out.includes(legacy)) out.push(legacy);
  return out;
}

function isJwtKeyError(err: { message?: string } | null): boolean {
  return !!err?.message && /unrecognized JWT kid|invalid JWT/i.test(err.message);
}

async function adminCall<T>(
  supabaseUrl: string,
  run: (client: ReturnType<typeof createClient>) => Promise<{ data: T; error: { message: string } | null }>
): Promise<{ data: T; error: { message: string } | null }> {
  const candidates = serviceKeyCandidates();
  let last: { data: T; error: { message: string } | null } | null = null;
  for (const key of candidates) {
    const result = await run(createClient(supabaseUrl, key));
    if (!result.error || !isJwtKeyError(result.error)) return result;
    last = result;
  }
  return last!;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const callerRole = user.app_metadata?.role as string | undefined;
    if (callerRole !== 'super_admin' && callerRole !== 'client_user') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const adminClient = createClient(
      supabaseUrl,
      resolveServiceKey(),
    );

    // Paginated — a hardcoded single page silently hides any account beyond
    // the first 1000 once the project grows past that.
    const fetchedUsers: { id: string; email?: string; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown>; banned_until?: string | null }[] = [];
    for (let page = 1; page <= 20; page++) {
      const { data: pageData, error } = await adminCall(supabaseUrl, c => c.auth.admin.listUsers({ page, perPage: 1000 }));
      if (error) throw error;
      fetchedUsers.push(...pageData.users);
      if (pageData.users.length < 1000) break;
    }
    const data = { users: fetchedUsers };

    // Load portals to resolve UUID → portal_key and build display names
    const { data: portalsData } = await adminClient.from('portals').select('id, portal_key, cliente');
    const uuidToPortalKey: Record<string, string> = {};
    const uuidToNome: Record<string, string> = {};
    const keyToNome: Record<string, string> = {};
    for (const p of portalsData ?? []) {
      uuidToPortalKey[p.id] = p.portal_key;
      uuidToNome[p.id] = p.cliente;
      keyToNome[p.portal_key] = p.cliente;
    }

    function resolveIds(rawIds: string[]): string[] {
      return rawIds.map(id => uuidToPortalKey[id] ?? id);
    }

    const callerRawIds = (user.app_metadata?.portalIds as string[] | undefined)
      ?? (user.app_metadata?.portais as string[] | undefined) ?? [];
    const callerPortalIds = resolveIds(callerRawIds);

    let allUsers = data.users.map(u => {
      const rawIds = (u.app_metadata?.portalIds as string[] | undefined)
        ?? (u.app_metadata?.portais as string[] | undefined) ?? [];
      const ids = resolveIds(rawIds);
      const portaisNomes = ids.map(id => keyToNome[id] ?? uuidToNome[id] ?? id);
      return {
        id: u.id,
        email: u.email ?? '',
        nome: (u.user_metadata?.name as string | undefined) || u.email || '',
        role: (u.app_metadata?.role as string | undefined) || 'client_user',
        portalIds: ids,
        portais: ids, // backwards compat alias
        portaisNomes,
        status: u.banned_until ? 'Suspenso' : 'Ativo',
      };
    });

    // client_user only sees users that belong to at least one of their portals
    if (callerRole === 'client_user') {
      allUsers = allUsers.filter(u =>
        callerPortalIds.length > 0 && u.portalIds.some(p => callerPortalIds.includes(p))
      );
    }

    const users = allUsers;

    return new Response(JSON.stringify({ users }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
