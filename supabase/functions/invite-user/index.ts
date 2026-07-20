import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Always resolve to an absolute URL — a bare "/definir-senha" (when SITE_URL
    // isn't set) fails Supabase's redirect allow-list match and GoTrue silently
    // falls back to the Site URL root, skipping the password-creation screen.
    const resolvedRedirectTo = redirectTo
      ?? (Deno.env.get('SITE_URL') ? `${Deno.env.get('SITE_URL')}/definir-senha` : 'https://workr-lite-v1.vercel.app/definir-senha');

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { name: nome ?? '' },
      redirectTo: resolvedRedirectTo,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resolvedRole = inviteRole === 'super_admin' ? 'super_admin' : 'client_user';
    const portalIds = (portaisConfig ?? []).map(p => p.portalId);

    if (data.user?.id) {
      await adminClient.auth.admin.updateUserById(data.user.id, {
        app_metadata: { role: resolvedRole, portais: portalIds },
      });

      // client_user access must always be tied to a specific portal + empresa —
      // create the portal_users rows the same way invite-portal-user does,
      // resolving each portalId (which may be a portal_key, not the UUID) first.
      if (resolvedRole === 'client_user' && portaisConfig?.length) {
        for (const cfg of portaisConfig) {
          try {
            let dbUuid: string | null = null;
            if (/^[0-9a-f-]{36}$/.test(cfg.portalId)) {
              dbUuid = cfg.portalId;
            } else {
              const { data: row } = await adminClient
                .from('portals').select('id').eq('portal_key', cfg.portalId).maybeSingle();
              dbUuid = row?.id ?? null;
            }
            if (!dbUuid) continue;
            await adminClient.from('portal_users').upsert({
              portal_id: dbUuid,
              user_id: data.user.id,
              email,
              nome: nome ?? '',
              role: cfg.role,
              empresas: cfg.empresas.length > 0 ? cfg.empresas : null,
            }, { onConflict: 'portal_id,user_id' });
          } catch { /* non-fatal per-portal */ }
        }
      }
    }

    return new Response(JSON.stringify({ id: data.user?.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
