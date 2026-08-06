import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendUserInvite, sendPortalAccessGranted } from '../_shared/postmark.ts';

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

// A failed listUsers() must never be treated the same as "no matching user
// found" — see invite-portal-user's identical helper for the incident that
// motivated this. Paginated so accounts beyond the first 1000 aren't invisible.
async function listAllUsers(supabaseUrl: string) {
  const perPage = 1000;
  const all: { id: string; email?: string; app_metadata?: Record<string, unknown> }[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await adminCall(supabaseUrl, c => c.auth.admin.listUsers({ page, perPage }));
    if (error) return { users: null, error };
    all.push(...data.users);
    if (data.users.length < perPage) break;
  }
  return { users: all, error: null };
}

// Wildcard is safe here (unlike a cookie-based session): every request below
// is authenticated by a bearer token in the Authorization header, which a
// malicious page on another origin cannot read or forge on the caller's
// behalf — CORS only controls which origins get to read the *response*.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify the caller is an authenticated super_admin
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

    const { email, nome, redirectTo, portaisConfig, role: inviteRole } = await req.json() as {
      email: string;
      nome?: string;
      redirectTo?: string;
      portaisConfig?: Array<{ portalId: string; role: 'admin' | 'editor' | 'viewer'; empresas: string[] }>;
      role?: string;
    };

    if (!email) {
      return new Response(JSON.stringify({ error: 'email is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service_role client to invite the user
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const adminClient = createClient(
      supabaseUrl,
      resolveServiceKey(),
    );

    // Always resolve to an absolute URL — a bare "/definir-senha" (when SITE_URL
    // isn't set) fails Supabase's redirect allow-list match and GoTrue silently
    // falls back to the Site URL root, skipping the password-creation screen.
    const resolvedRedirectTo = redirectTo
      ?? (Deno.env.get('SITE_URL') ? `${Deno.env.get('SITE_URL')}/definir-senha` : 'https://workr.dev.br/definir-senha');

    const resolvedRole = inviteRole === 'super_admin' ? 'super_admin' : 'client_user';

    // Resolve every portaisConfig entry to its real portal UUID up front —
    // shared by both the existing-user and new-user paths below.
    async function resolvePortalUuid(rawId: string): Promise<string | null> {
      if (/^[0-9a-f-]{36}$/.test(rawId)) return rawId;
      const { data: row } = await adminClient.from('portals').select('id').eq('portal_key', rawId).maybeSingle();
      return row?.id ?? null;
    }

    async function linkPortalUsers(userId: string): Promise<{ resolvedUuids: string[]; portalLinkErrors: string[] }> {
      const resolvedUuids: string[] = [];
      const portalLinkErrors: string[] = [];
      if (resolvedRole === 'client_user' && portaisConfig?.length) {
        for (const cfg of portaisConfig) {
          try {
            const dbUuid = await resolvePortalUuid(cfg.portalId);
            if (!dbUuid) continue;
            resolvedUuids.push(dbUuid);
            // Conflict target is (portal_id, email), not (portal_id, user_id) —
            // email is the durable identity; this turns a would-be duplicate
            // row for an already-invited email into an update instead.
            const { error: linkErr } = await adminClient.from('portal_users').upsert({
              portal_id: dbUuid,
              user_id: userId,
              email,
              nome: nome ?? '',
              role: cfg.role,
              empresas: cfg.empresas.length > 0 ? cfg.empresas : null,
            }, { onConflict: 'portal_id,email' });
            if (linkErr) portalLinkErrors.push(`${cfg.portalId}: ${linkErr.message}`);
          } catch (e) { portalLinkErrors.push(`${cfg.portalId}: ${String(e)}`); }
        }
      }
      return { resolvedUuids, portalLinkErrors };
    }

    // An email that already has an account (invited to any portal before,
    // or created directly in auth.users) never goes through the invite-link
    // flow again — there's no signup step left to complete, and generating
    // a fresh "invite" link for an existing user is either rejected by
    // GoTrue or reads as a confusing password-reset. Instead: link the new
    // portal(s) and send a plain "you now have access" alert.
    const { users: existingUsers, error: listErr } = await listAllUsers(supabaseUrl);
    if (listErr || !existingUsers) {
      return new Response(JSON.stringify({ error: `Falha ao verificar usuários existentes: ${listErr?.message ?? 'erro desconhecido'}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const existingUser = existingUsers.find(u => u.email === email);

    if (existingUser) {
      const userId = existingUser.id;
      const { resolvedUuids, portalLinkErrors } = await linkPortalUsers(userId);
      const existingIds: string[] = (existingUser.app_metadata?.portalIds as string[] | undefined) ?? [];
      const newlyAdded = resolvedUuids.filter(id => !existingIds.includes(id));
      const mergedIds = [...new Set([...existingIds, ...resolvedUuids])];

      const { error: metaErr } = await adminCall(supabaseUrl, c => c.auth.admin.updateUserById(userId, {
        app_metadata: { role: resolvedRole, portalIds: mergedIds },
      }));
      if (metaErr) {
        return new Response(JSON.stringify({ error: `Falha ao atualizar metadados do usuário: ${metaErr.message}` }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (newlyAdded.length > 0) {
        let portalNome: string | undefined;
        if (newlyAdded.length === 1) {
          const { data: pRow } = await adminClient.from('portals').select('cliente').eq('id', newlyAdded[0]).maybeSingle();
          portalNome = pRow?.cliente as string | undefined;
        }
        const roleForEmail = portaisConfig?.find(c => c.portalId === newlyAdded[0])?.role;
        try {
          await sendPortalAccessGranted({ email, nome: nome ?? undefined, portalNome, role: roleForEmail });
        } catch (emailErr) {
          return new Response(JSON.stringify({ id: userId, alreadyExists: true, portalLinkErrors: portalLinkErrors.length ? portalLinkErrors : undefined, emailError: String(emailErr) }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response(JSON.stringify({ id: userId, alreadyExists: true, portalLinkErrors: portalLinkErrors.length ? portalLinkErrors : undefined }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate the invite link ourselves so we can send it via Postmark —
    // Supabase's built-in inviteUserByEmail relies on the project's own SMTP
    // config (rate-limited / often unconfigured) and ignores POSTMARK_FROM.
    const { data, error } = await adminCall(supabaseUrl, c => c.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { data: { name: nome ?? '' }, redirectTo: resolvedRedirectTo },
    }));

    if (error || !data?.user) {
      return new Response(JSON.stringify({ error: error?.message ?? 'Failed to generate invite link' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = data.user.id;
    const { resolvedUuids, portalLinkErrors } = await linkPortalUsers(userId);

    // app_metadata key MUST be "portalIds" (not "portais") and hold the real
    // UUIDs — the portal_users RLS policy reads auth.jwt() -> app_metadata ->
    // 'portalIds' and matches it against portal_id (UUID). A wrong key name
    // or portal_key values here make the RLS silently return zero rows.
    const { error: metaErr } = await adminCall(supabaseUrl, c => c.auth.admin.updateUserById(userId, {
      app_metadata: { role: resolvedRole, portalIds: resolvedUuids },
    }));
    if (metaErr) {
      return new Response(JSON.stringify({ error: `Falha ao atualizar metadados do usuário: ${metaErr.message}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send the invite e-mail via Postmark (reliable, bypasses Supabase's SMTP
    // rate limit); fall back to Supabase's native invite e-mail only if
    // Postmark isn't configured.
    const postmarkToken = Deno.env.get('POSTMARK_TOKEN');
    if (postmarkToken) {
      try {
        await sendUserInvite({ email, nome: nome ?? undefined, inviteLink: data.properties.action_link });
      } catch (emailErr) {
        return new Response(JSON.stringify({ id: userId, emailError: String(emailErr) }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      await adminCall(supabaseUrl, c => c.auth.admin.inviteUserByEmail(email, {
        data: { name: nome ?? '' },
        redirectTo: resolvedRedirectTo,
      })).catch(() => { /* non-fatal */ });
    }

    return new Response(JSON.stringify({ id: userId, portalLinkErrors: portalLinkErrors.length ? portalLinkErrors : undefined }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
