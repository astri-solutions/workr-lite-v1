import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// See publish-config/index.ts for why this fallback exists (JWT Signing
// Keys migration broke the legacy service role key for some admin calls).
function resolveServiceKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
    if (keys?.default) return keys.default;
  } catch { /* not JSON or unset */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}

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

// 15 minutes is enough for one preview session without leaving a long-lived
// credential sitting in a browser's address bar/history.
const PREVIEW_TTL_SECONDS = 15 * 60;

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Mints a short-lived, portal-scoped opaque token (NOT a Supabase JWT — the
// project's JWT Signing Keys migration to asymmetric ES256 means we can't
// forge one of those from a shared secret). `preview-content` verifies this
// same token and reads draft rows via the service role, so no RLS policy on
// portal_materias/portal_documents/portal_resultado_* needs to be loosened.
Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const ch = corsHeaders(origin);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: ch });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonClient = createClient(
      supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
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

    const { portalId } = await req.json() as { portalId?: string };
    if (!portalId) {
      return new Response(JSON.stringify({ error: 'portalId is required' }), {
        status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, resolveServiceKey());
    const { data: portalRow } = await adminClient.from('portals').select('id').eq('portal_key', portalId).maybeSingle();
    const resolvedPortalUuid = portalRow?.id as string | undefined;
    if (!resolvedPortalUuid) {
      return new Response(JSON.stringify({ error: 'Portal not found' }), {
        status: 404, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    // client_user can only preview their own portal(s) — same tenant check
    // publish-config uses.
    if (role === 'client_user') {
      const userPortalIds: string[] = user.app_metadata?.portalIds ?? [];
      if (!userPortalIds.includes(resolvedPortalUuid)) {
        return new Response(JSON.stringify({ error: 'Forbidden: not your portal' }), {
          status: 403, headers: { ...ch, 'Content-Type': 'application/json' },
        });
      }
    }

    const secret = Deno.env.get('PREVIEW_TOKEN_SECRET');
    if (!secret) {
      return new Response(JSON.stringify({ error: 'PREVIEW_TOKEN_SECRET secret not configured' }), {
        status: 500, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const expiresAt = Math.floor(Date.now() / 1000) + PREVIEW_TTL_SECONDS;
    const payload = `${resolvedPortalUuid}.${expiresAt}`;
    const token = `${payload}.${await sign(payload, secret)}`;

    return new Response(JSON.stringify({ token, portalUuid: resolvedPortalUuid, expiresAt }), {
      status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders(req.headers.get('Origin')), 'Content-Type': 'application/json' },
    });
  }
});
