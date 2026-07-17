import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    const { email, nome, portalId, portalKey, role, empresas, redirectTo } = await req.json() as {
      email: string;
      nome?: string;
      portalId?: string;
      portalKey?: string;
      role?: string;
      empresas?: string[] | null;
      redirectTo?: string;
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
      // Portal admins can only invite editor/viewer — not other admins
      if (role === 'admin') {
        return new Response(JSON.stringify({ error: 'Forbidden: only super_admin can grant admin role' }), {
          status: 403, headers: { ...ch, 'Content-Type': 'application/json' },
        });
      }
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

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { name: nome ?? '' },
      redirectTo: redirectTo ?? `${Deno.env.get('SITE_URL') ?? ''}/definir-senha`,
    });

    let userId: string | null = null;

    if (error) {
      // User already exists — patch app_metadata and upsert portal_users, return 200
      const msg = error.message?.toLowerCase() ?? '';
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        try {
          const { data: { users } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
          const existing = users.find(u => u.email === email);
          if (existing) {
            userId = existing.id;
            const existingIds: string[] = existing.app_metadata?.portalIds ?? [];
            const newId = dbUuid ?? portalId;
            const merged = newId && !existingIds.includes(newId) ? [...existingIds, newId] : existingIds;
            await adminClient.auth.admin.updateUserById(existing.id, {
              app_metadata: { role: 'client_user', portalIds: merged },
            });
            await upsertPortalUser(existing.id);
          }
        } catch { /* non-fatal */ }
        // Return 200 — the user was successfully linked to the portal even if the invite wasn't sent
        return new Response(JSON.stringify({ id: userId, alreadyExists: true }), {
          status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    // New invite: set role + portalIds in app_metadata + create portal_users record
    if (data.user?.id) {
      userId = data.user.id;
      const appMeta: Record<string, unknown> = { role: 'client_user' };
      if (portalId) {
        appMeta.portalIds = dbUuid ? [dbUuid] : [portalId];
      }
      await adminClient.auth.admin.updateUserById(data.user.id, { app_metadata: appMeta });
      await upsertPortalUser(data.user.id);
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
