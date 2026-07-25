import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Supabase project migrated to JWT Signing Keys (asymmetric ES256) — the
// legacy SUPABASE_SERVICE_ROLE_KEY (still auto-injected) fails signature
// verification against auth.admin.* calls with "unrecognized JWT kid <nil>
// for algorithm ES256". SUPABASE_SECRET_KEYS (also auto-injected, JSON map)
// holds the new opaque sb_secret_... key that sidesteps this entirely.
// Falls back to the legacy key if the new one is not configured yet.
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
    if (callerRole !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: super_admin required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json() as {
      action: 'delete' | 'ban' | 'unban' | 'update';
      userId: string;
      role?: string;
      portais?: string[];
      portalRoles?: Record<string, string>;
    };

    const { action, userId } = body;
    if (!action || !userId) {
      return new Response(JSON.stringify({ error: 'action and userId are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

    if (action === 'delete') {
      const { error } = await adminCall(supabaseUrl, c => c.auth.admin.deleteUser(userId));
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'ban') {
      const { error } = await adminCall(supabaseUrl, c => c.auth.admin.updateUserById(userId, {
        ban_duration: '876000h',
      }));
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'unban') {
      const { error } = await adminCall(supabaseUrl, c => c.auth.admin.updateUserById(userId, {
        ban_duration: 'none',
      }));
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update') {
      const updates: Record<string, unknown> = {};
      if (body.role !== undefined) updates.role = body.role;
      if (body.portais !== undefined) updates.portais = body.portais;
      const { error } = await adminCall(supabaseUrl, c => c.auth.admin.updateUserById(userId, {
        app_metadata: updates,
      }));
      if (error) throw error;

      // Per-portal role (admin/editor) lives in portal_users, not
      // app_metadata — apply it separately once the caller sends it.
      if (body.portalRoles && Object.keys(body.portalRoles).length > 0) {
        const { data: portalsData, error: portalsErr } = await adminCall(
          supabaseUrl,
          c => c.from('portals').select('id, portal_key'),
        );
        if (portalsErr) throw portalsErr;
        const keyToUuid: Record<string, string> = {};
        for (const p of (portalsData as { id: string; portal_key: string }[]) ?? []) {
          keyToUuid[p.portal_key] = p.id;
        }
        for (const [portalKey, role] of Object.entries(body.portalRoles)) {
          const portalUuid = keyToUuid[portalKey] ?? portalKey;
          const { error: roleErr } = await adminCall(
            supabaseUrl,
            c => c.from('portal_users').update({ role }).eq('portal_id', portalUuid).eq('user_id', userId),
          );
          if (roleErr) throw roleErr;
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
