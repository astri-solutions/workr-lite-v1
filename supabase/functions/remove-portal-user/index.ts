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
  // The failure is not always "the wrong key" — GoTrue has been observed
  // rejecting the SAME candidate key moments before accepting it again, which
  // points to a transient JWKS-cache hiccup on their side rather than a
  // deterministic bad key. A short backoff-and-retry across rounds rides
  // that out instead of giving up after a single pass through the candidates.
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const key of candidates) {
      const result = await run(createClient(supabaseUrl, key));
      if (!result.error || !isJwtKeyError(result.error)) return result;
      last = result;
    }
    if (attempt < 2) await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
  }
  return last!;
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
    'Vary': 'Origin',
  };
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

    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const { recordId } = await req.json() as { recordId?: string };
    if (!recordId) {
      return new Response(JSON.stringify({ error: 'recordId is required' }), {
        status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, resolveServiceKey());

    const { data: target } = await adminClient
      .from('portal_users')
      .select('id, portal_id, user_id')
      .eq('id', recordId)
      .maybeSingle();
    if (!target) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    // Authorization: super_admin can always remove.
    // client_user can remove only if they are an admin of that portal.
    const callerRole = caller.app_metadata?.role as string | undefined;
    if (callerRole !== 'super_admin') {
      const { data: callerEntry } = await adminClient
        .from('portal_users')
        .select('role')
        .eq('portal_id', target.portal_id)
        .eq('user_id', caller.id)
        .maybeSingle();
      if (callerEntry?.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Forbidden: portal admin role required' }), {
          status: 403, headers: { ...ch, 'Content-Type': 'application/json' },
        });
      }
    }

    const { error: deleteError } = await adminClient.from('portal_users').delete().eq('id', recordId);
    if (deleteError) throw deleteError;

    // If the account has no remaining access to any other portal, delete it
    // from auth entirely instead of leaving an orphaned account with no access.
    const { data: remaining } = await adminClient
      .from('portal_users')
      .select('id')
      .eq('user_id', target.user_id)
      .limit(1);

    // Access removal (the portal_users delete above) is the primary action
    // and has already happened regardless of what follows. This auth-account
    // cleanup is a separate concern — if it fails, that must be surfaced
    // distinctly (accountDeleteError + non-200 status) rather than folded
    // into an unqualified "ok: true", so a real leftover account is never
    // mistaken for a fully completed removal.
    let accountDeleted = false;
    let accountDeleteError: string | undefined;
    if (!remaining || remaining.length === 0) {
      const { error: delUserError } = await adminCall(supabaseUrl, c => c.auth.admin.deleteUser(target.user_id as string));
      if (!delUserError) accountDeleted = true;
      else accountDeleteError = delUserError.message;
    }

    return new Response(JSON.stringify({ ok: true, accountDeleted, accountDeleteError }), {
      status: accountDeleteError ? 207 : 200, headers: { ...ch, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const ch2 = corsHeaders(req.headers.get('Origin'));
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...ch2, 'Content-Type': 'application/json' },
    });
  }
});
