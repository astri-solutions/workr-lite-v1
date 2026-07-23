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

    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const { recordId } = await req.json() as { recordId?: string };
    if (!recordId) {
      return new Response(JSON.stringify({ error: 'recordId is required' }), {
        status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: target } = await adminClient
      .from('portal_users')
      .select('id, portal_id, user_id')
      .eq('id', recordId)
      .maybeSingle();
    if (!target) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    // Authorization: super_admin can always remove.
    // client_user can remove only if they are an admin of that portal.
    const callerRole = caller.app_metadata?.role as string | undefined;
    if (callerRole !== 'super_admin') {
      const { data: callerEntry } = await adminClient
        .from('portal_users')
        .select('role')
        .eq('portal_id', target.portal_id)
        .eq('user_id', caller.id)
        .maybeSingle();
      if (callerEntry?.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Forbidden: portal admin role required' }), {
          status: 403, headers: { ...ch, 'Content-Type': 'application/json' },
        });
      }
    }

    const { error: deleteError } = await adminClient.from('portal_users').delete().eq('id', recordId);
    if (deleteError) throw deleteError;

    // If the account has no remaining access to any other portal, delete it
    // from auth entirely instead of leaving an orphaned account with no access.
    const { data: remaining } = await adminClient
      .from('portal_users')
      .select('id')
      .eq('user_id', target.user_id)
      .limit(1);

    let accountDeleted = false;
    if (!remaining || remaining.length === 0) {
      const { error: delUserError } = await adminClient.auth.admin.deleteUser(target.user_id as string);
      if (!delUserError) accountDeleted = true;
    }

    return new Response(JSON.stringify({ ok: true, accountDeleted }), {
      status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const ch2 = corsHeaders(req.headers.get('Origin'));
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...ch2, 'Content-Type': 'application/json' },
    });
  }
});
