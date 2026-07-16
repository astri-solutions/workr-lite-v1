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

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    // Only super_admin can invite portal users
    const role = user.app_metadata?.role as string | undefined;
    if (role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: super_admin required' }), {
        status: 403, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const { email, nome, portalId, redirectTo } = await req.json() as {
      email: string;
      nome?: string;
      portalId?: string;
      redirectTo?: string;
    };

    if (!email) {
      return new Response(JSON.stringify({ error: 'email is required' }), {
        status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { name: nome ?? '' },
      redirectTo: redirectTo ?? `${Deno.env.get('SITE_URL') ?? ''}/definir-senha`,
    });

    // Resolve portal UUID (publish-config checks portals.id, not portal_key)
    let dbUuid: string | null = null;
    if (portalId) {
      try {
        const { data: row } = await adminClient
          .from('portals')
          .select('id')
          .eq('portal_key', portalId)
          .maybeSingle();
        dbUuid = row?.id ?? null;
      } catch { /* non-fatal */ }
    }

    let userId: string | null = null;

    if (error) {
      // If user already exists, find them and patch app_metadata
      if (error.message?.toLowerCase().includes('already') || error.message?.toLowerCase().includes('registered')) {
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
          }
        } catch { /* non-fatal */ }
        return new Response(JSON.stringify({ error: error.message, id: userId }), {
          status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    // New invite: set role + portalIds in app_metadata
    if (data.user?.id) {
      userId = data.user.id;
      const appMeta: Record<string, unknown> = { role: 'client_user' };
      if (portalId) {
        appMeta.portalIds = dbUuid ? [dbUuid] : [portalId];
      }
      await adminClient.auth.admin.updateUserById(data.user.id, { app_metadata: appMeta });
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
