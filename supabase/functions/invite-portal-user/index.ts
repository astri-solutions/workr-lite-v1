import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendUserInvite, sendPortalAccessGranted } from '../_shared/postmark.ts';

function resolveServiceKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    if (keys?.default) return keys.default;
  } catch { /* not JSON or unset */ }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
}

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

    let dbUuid: string | null = null;
    const lookupKey = portalKey ?? portalId;
    if (lookupKey) {
      try {
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

    if (callerRole !== 'super_admin') {
      if (callerRole !== 'client_user' || !dbUuid) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...ch, 'Content-Type': 'application/json' },
        });
      }
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
    }

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
      const isNewPortalForUser = !!newId && !existingIds.includes(newId);
      const merged = isNewPortalForUser ? [...existingIds, newId!] : existingIds;
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

      if (isNewPortalForUser || resend) {
        let portalNome2: string | undefined;
        if (dbUuid) {
          const { data: pRow2 } = await adminClient.from('portals').select('cliente').eq('id', dbUuid).maybeSingle();
          portalNome2 = pRow2?.cliente as string | undefined;
        }
        try {
          await sendPortalAccessGranted({ email, nome: nome ?? undefined, portalNome: portalNome2, role: role ?? 'editor' });
        } catch (emailErr) {
          return new Response(JSON.stringify({ id: userId, alreadyExists: true, emailError: String(emailErr) }), {
            status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ id: userId, alreadyExists: true, emailSent: true }), {
          status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ id: userId, alreadyExists: true }), {
        status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const inviteRedirectTo = redirectTo ?? `${Deno.env.get('SITE_URL') ?? 'https://workr.dev.br'}/definir-senha`;
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

    let portalNome: string | undefined;
    if (dbUuid) {
      const { data: pRow } = await adminClient.from('portals').select('cliente').eq('id', dbUuid).maybeSingle();
      portalNome = pRow?.cliente as string | undefined;
    }

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
        return new Response(JSON.stringify({ id: userId, emailError: String(emailErr) }), {
          status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
        });
      }
    } else {
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
