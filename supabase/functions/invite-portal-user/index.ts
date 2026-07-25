import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendUserInvite } from '../_shared/postmark.ts';

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

// A failed listUsers() must never be treated the same as "no matching user
// found" — that exact confusion (transient error silently read as "email is
// new") is what produced a duplicate/ghost account for an already-existing
// user in a real past incident. Paginated so accounts beyond the first 1000
// are never invisible to the existing-user check either.
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

    const callerRole = user.app_metadata?.role as string | undefined;
    const adminClient = createClient(
      supabaseUrl,
      resolveServiceKey(),
    );

    const { email, nome, portalId, portalKey, role, empresas, redirectTo, resend } = await req.json() as {
      email: string;
      nome?: string;
      portalId?: string;
      portalKey?: string;
      role?: string;
      empresas?: string[] | null;
      redirectTo?: string;
      resend?: boolean;
    };

    if (!email) {
      return new Response(JSON.stringify({ error: 'email is required' }), {
        status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    // Resolve portal UUID: portalId may already be the UUID, or we look up by portalKey
    let dbUuid: string | null = null;
    const lookupKey = portalKey ?? portalId;
    if (lookupKey) {
      try {
        // First try treating portalId directly as the UUID (when provisioner returned it)
        if (portalId && /^[0-9a-f-]{36}$/.test(portalId)) {
          dbUuid = portalId;
        } else {
          const { data: row } = await adminClient
            .from('portals')
            .select('id')
            .eq('portal_key', lookupKey)
            .maybeSingle();
          dbUuid = row?.id ?? null;
        }
      } catch { /* non-fatal */ }
    }

    // Authorization: super_admin can always invite.
    // client_user can invite only if they are an admin of the target portal.
    if (callerRole !== 'super_admin') {
      if (callerRole !== 'client_user' || !dbUuid) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...ch, 'Content-Type': 'application/json' },
        });
      }
      // Verify the caller has admin role in portal_users for this portal
      const { data: callerEntry } = await adminClient
        .from('portal_users')
        .select('role')
        .eq('portal_id', dbUuid)
        .eq('user_id', user.id)
        .maybeSingle();
      if (callerEntry?.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Forbidden: portal admin role required' }), {
          status: 403, headers: { ...ch, 'Content-Type': 'application/json' },
        });
      }
      // Portal admins can invite editor/viewer AND other admins of their own portal.
    }

    // Helper: upsert portal_users record. Conflict target is (portal_id,
    // email) — not (portal_id,user_id) — because email is the durable
    // identity here: if the existing-user lookup below ever fails open and
    // a second auth account gets created for an email already present in
    // this portal, this constraint (and this onConflict target) turns that
    // into an update instead of a second row.
    async function upsertPortalUser(uid: string) {
      if (!dbUuid) return { error: null };
      const { error } = await adminClient.from('portal_users').upsert({
        portal_id: dbUuid,
        user_id: uid,
        email,
        nome: nome ?? '',
        role: role ?? 'editor',
        empresas: empresas ?? null,
      }, { onConflict: 'portal_id,email' });
      return { error };
    }

    let userId: string | null = null;

    // Check if user already exists before generating invite link. A failed
    // lookup must abort here — falling through to "treat as new user" is
    // exactly how a duplicate/ghost account gets created for an email that
    // already has a real one.
    const { users: existingUsers, error: listErr } = await listAllUsers(supabaseUrl);
    if (listErr || !existingUsers) {
      return new Response(JSON.stringify({ error: `Falha ao verificar usuários existentes: ${listErr?.message ?? 'erro desconhecido'}` }), {
        status: 500, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }
    const existingUser = existingUsers.find(u => u.email === email);

    if (existingUser) {
      userId = existingUser.id;
      const existingIds: string[] = (existingUser.app_metadata?.portalIds as string[] | undefined) ?? [];
      const newId = dbUuid ?? portalId;
      const merged = newId && !existingIds.includes(newId) ? [...existingIds, newId] : existingIds;
      const { error: updErr } = await adminCall(supabaseUrl, c => c.auth.admin.updateUserById(existingUser.id, {
        app_metadata: { role: 'client_user', portalIds: merged },
      }));
      if (updErr) {
        return new Response(JSON.stringify({ error: `Falha ao atualizar metadados do usuário: ${updErr.message}` }), {
          status: 500, headers: { ...ch, 'Content-Type': 'application/json' },
        });
      }
      const { error: upsertErr } = await upsertPortalUser(existingUser.id);
      if (upsertErr) {
        return new Response(JSON.stringify({ error: `Falha ao vincular usuário ao portal: ${upsertErr.message}` }), {
          status: 500, headers: { ...ch, 'Content-Type': 'application/json' },
        });
      }

      if (resend) {
        // Re-send invite email via a new magic link (recovery link acts as login)
        const inviteRedirectTo2 = redirectTo ?? `${Deno.env.get('SITE_URL') ?? 'https://workr-lite-v1.vercel.app'}/definir-senha`;
        const { data: linkData2, error: linkError2 } = await adminCall(supabaseUrl, c => c.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: { redirectTo: inviteRedirectTo2 },
        }));
        if (!linkError2 && linkData2?.properties?.action_link) {
          let portalNome2: string | undefined;
          if (dbUuid) {
            const { data: pRow2 } = await adminClient.from('portals').select('cliente').eq('id', dbUuid).maybeSingle();
            portalNome2 = pRow2?.cliente as string | undefined;
          }
          try {
            await sendUserInvite({ email, nome: nome ?? undefined, portalNome: portalNome2, inviteLink: linkData2.properties.action_link });
          } catch (emailErr) {
            return new Response(JSON.stringify({ id: userId, alreadyExists: true, emailError: String(emailErr) }), {
              status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
            });
          }
          return new Response(JSON.stringify({ id: userId, alreadyExists: true, emailSent: true }), {
            status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response(JSON.stringify({ id: userId, alreadyExists: true }), {
        status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    // New user — generate invite link (creates auth record, no Supabase email sent)
    const inviteRedirectTo = redirectTo ?? `${Deno.env.get('SITE_URL') ?? 'https://workr-lite-v1.vercel.app'}/definir-senha`;
    const { data: linkData, error: linkError } = await adminCall(supabaseUrl, c => c.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { data: { name: nome ?? '' }, redirectTo: inviteRedirectTo },
    }));

    if (linkError || !linkData?.user) {
      return new Response(JSON.stringify({ error: linkError?.message ?? 'Failed to generate invite link' }), {
        status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    userId = linkData.user.id;

    // Set app_metadata + portal_users
    const appMeta: Record<string, unknown> = { role: 'client_user' };
    if (portalId) appMeta.portalIds = dbUuid ? [dbUuid] : [portalId];
    const { error: newUserUpdErr } = await adminCall(supabaseUrl, c => c.auth.admin.updateUserById(userId!, { app_metadata: appMeta }));
    if (newUserUpdErr) {
      return new Response(JSON.stringify({ error: `Falha ao atualizar metadados do usuário: ${newUserUpdErr.message}` }), {
        status: 500, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }
    const { error: newUpsertErr } = await upsertPortalUser(userId);
    if (newUpsertErr) {
      return new Response(JSON.stringify({ error: `Falha ao vincular usuário ao portal: ${newUpsertErr.message}` }), {
        status: 500, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    // Resolve portal name for email
    let portalNome: string | undefined;
    if (dbUuid) {
      const { data: pRow } = await adminClient.from('portals').select('cliente').eq('id', dbUuid).maybeSingle();
      portalNome = pRow?.cliente as string | undefined;
    }

    // Send invite email via Postmark (bypasses Supabase rate limit)
    const postmarkToken = Deno.env.get('POSTMARK_TOKEN');
    if (postmarkToken) {
      try {
        await sendUserInvite({
          email,
          nome: nome ?? undefined,
          portalNome,
          inviteLink: linkData.properties.action_link,
        });
      } catch (emailErr) {
        // Email failed but user + portal_users were created — return warning
        return new Response(JSON.stringify({ id: userId, emailError: String(emailErr) }), {
          status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // No Postmark configured — fall back to Supabase invite email (may hit rate limit)
      await adminCall(supabaseUrl, c => c.auth.admin.inviteUserByEmail(email, {
        data: { name: nome ?? '' },
        redirectTo: inviteRedirectTo,
      })).catch(() => { /* non-fatal */ });
    }

    return new Response(JSON.stringify({ id: userId }), {
      status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const ch2 = corsHeaders(req.headers.get('Origin'));
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...ch2, 'Content-Type': 'application/json' },
    });
  }
});
