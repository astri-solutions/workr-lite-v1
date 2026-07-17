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
    if (callerRole !== 'super_admin' && callerRole !== 'client_user') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw error;

    // Load portals to resolve UUID → portal_key and build display names
    const { data: portalsData } = await adminClient.from('portals').select('id, portal_key, cliente');
    const uuidToPortalKey: Record<string, string> = {};
    const uuidToNome: Record<string, string> = {};
    const keyToNome: Record<string, string> = {};
    for (const p of portalsData ?? []) {
      uuidToPortalKey[p.id] = p.portal_key;
      uuidToNome[p.id] = p.cliente;
      keyToNome[p.portal_key] = p.cliente;
    }

    function resolveIds(rawIds: string[]): string[] {
      return rawIds.map(id => uuidToPortalKey[id] ?? id);
    }

    const callerRawIds = (user.app_metadata?.portalIds as string[] | undefined)
      ?? (user.app_metadata?.portais as string[] | undefined) ?? [];
    const callerPortalIds = resolveIds(callerRawIds);

    let allUsers = data.users.map(u => {
      const rawIds = (u.app_metadata?.portalIds as string[] | undefined)
        ?? (u.app_metadata?.portais as string[] | undefined) ?? [];
      const ids = resolveIds(rawIds);
      const portaisNomes = ids.map(id => keyToNome[id] ?? uuidToNome[id] ?? id);
      return {
        id: u.id,
        email: u.email ?? '',
        nome: (u.user_metadata?.name as string | undefined) || u.email || '',
        role: (u.app_metadata?.role as string | undefined) || 'client_user',
        portalIds: ids,
        portais: ids, // backwards compat alias
        portaisNomes,
        status: u.banned_until ? 'Suspenso' : 'Ativo',
      };
    });

    // client_user only sees users that belong to at least one of their portals
    if (callerRole === 'client_user') {
      allUsers = allUsers.filter(u =>
        callerPortalIds.length > 0 && u.portalIds.some(p => callerPortalIds.includes(p))
      );
    }

    const users = allUsers;

    return new Response(JSON.stringify({ users }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
