import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, clientIp } from '../_shared/rateLimit.ts';

function resolveServiceKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
    if (keys?.default) return keys.default;
  } catch { /* not JSON or unset */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}

// Called directly from deployed client-portal sites (any of their own
// subdomains/Vercel projects) via `scripts/components/preview.js`'s
// fetchWithPreview() — access is gated by the opaque, portal-scoped,
// short-lived token from mint-preview-token instead of a fixed origin
// allowlist, so CORS is intentionally open on this one read-only endpoint.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyToken(token: string, secret: string): Promise<string | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [portalUuid, expiresAtStr, sig] = parts;
  const expiresAt = Number(expiresAtStr);
  if (!portalUuid || !Number.isFinite(expiresAt)) return null;
  if (Date.now() / 1000 > expiresAt) return null;
  const expected = await sign(`${portalUuid}.${expiresAtStr}`, secret);
  if (sig !== expected) return null;
  return portalUuid;
}

const ALLOWED_KINDS = new Set(['materias', 'documentos', 'resultado_periodos', 'resultado_arquivos']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const url = new URL(req.url);
    const portalId = url.searchParams.get('portalId'); // portal UUID, already resolved (same value site.config.js's supabase.portalId holds)
    const token = url.searchParams.get('token');
    const kind = url.searchParams.get('kind');
    const pageId = url.searchParams.get('pageId');

    if (!portalId || !token || !kind || !ALLOWED_KINDS.has(kind)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    if ((kind === 'materias' || kind === 'documentos') && !pageId) {
      return new Response(JSON.stringify({ error: 'pageId is required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const secret = Deno.env.get('PREVIEW_TOKEN_SECRET');
    if (!secret) {
      return new Response(JSON.stringify({ error: 'PREVIEW_TOKEN_SECRET secret not configured' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    const tokenPortalUuid = await verifyToken(token, secret);
    if (!tokenPortalUuid || tokenPortalUuid !== portalId) {
      return new Response(JSON.stringify({ error: 'Invalid or expired preview token' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, resolveServiceKey());

    // Fully public, no session — bound the worst case of a script hammering
    // this with guessed/stale tokens. Generous enough for real preview usage
    // (a page polling this a few times while someone reviews a draft).
    const { allowed } = await checkRateLimit(adminClient, `preview-content:${clientIp(req)}`, 60, 60);
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    let data: unknown[] = [];
    if (kind === 'materias') {
      const { data: rows } = await adminClient.from('portal_materias').select('*')
        .eq('portal_id', portalId).eq('page_id', pageId).order('data', { ascending: false });
      data = rows ?? [];
    } else if (kind === 'documentos') {
      const { data: rows } = await adminClient.from('portal_documents').select('*')
        .eq('portal_id', portalId).contains('pagina_ids', [pageId]).order('created_at', { ascending: false });
      data = rows ?? [];
    } else if (kind === 'resultado_periodos') {
      const { data: rows } = await adminClient.from('portal_resultado_periodos').select('*')
        .eq('portal_id', portalId).order('created_at', { ascending: false });
      data = rows ?? [];
    } else if (kind === 'resultado_arquivos') {
      const { data: rows } = await adminClient.from('portal_resultado_arquivos').select('*')
        .eq('portal_id', portalId).order('ordem', { ascending: true });
      data = rows ?? [];
    }

    return new Response(JSON.stringify(data), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
