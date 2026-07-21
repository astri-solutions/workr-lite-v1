import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendUserInvite } from '../_shared/postmark.ts';

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
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

    // Helper: upsert portal_users record
    async function upsertPortalUser(uid: string) {
      if (!dbUuid) return;
      await adminClient.from('portal_users').upsert({
        portal_id: dbUuid,
        user_id: uid,
        email,
        nome: nome ?? '',
        role: role ?? 'editor',
        empresas: empresas ?? null,
      }, { onConflict: 'portal_id,user_id' });
    }

    let userId: string | null = null;

    // Check if user already exists before generating invite link
    const { data: { users: existingUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const existingUser = existingUsers.find(u => u.email === email);

    if (existingUser) {
      userId = existingUser.id;
      const existingIds: string[] = existingUser.app_metadata?.portalIds ?? [];
      const newId = dbUuid ?? portalId;
      const merged = newId && !existingIds.includes(newId) ? [...existingIds, newId] : existingIds;
      await adminClient.auth.admin.updateUserById(existingUser.id, {
        app_metadata: { role: 'client_user', portalIds: merged },
      });
      await upsertPortalUser(existingUser.id);

      if (resend) {
        // Re-send invite email via a new magic link (recovery link acts as login)
        const inviteRedirectTo2 = redirectTo ?? `${Deno.env.get('SITE_URL') ?? 'https://workr-lite-v1.vercel.app'}/definir-senha`;
        const { data: linkData2, error: linkError2 } = await adminClient.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: { redirectTo: inviteRedirectTo2 },
        });
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
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { data: { name: nome ?? '' }, redirectTo: inviteRedirectTo },
    });

    if (linkError || !linkData?.user) {
      return new Response(JSON.stringify({ error: linkError?.message ?? 'Failed to generate invite link' }), {
        status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    userId = linkData.user.id;

    // Set app_metadata + portal_users
    const appMeta: Record<string, unknown> = { role: 'client_user' };
    if (portalId) appMeta.portalIds = dbUuid ? [dbUuid] : [portalId];
    await adminClient.auth.admin.updateUserById(userId, { app_metadata: appMeta });
    await upsertPortalUser(userId);

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
      await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { name: nome ?? '' },
        redirectTo: inviteRedirectTo,
      }).catch(() => { /* non-fatal */ });
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
