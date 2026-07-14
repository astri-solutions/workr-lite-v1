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

    const role = user.app_metadata?.role as string | undefined;
    if (role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { repoName, vercelProjectName } = await req.json() as {
      repoName?: string;
      vercelProjectName?: string;
    };

    const githubToken = Deno.env.get('GITHUB_TOKEN');
    const vercelToken = Deno.env.get('VERCEL_TOKEN');
    const githubOrg   = Deno.env.get('GITHUB_ORG') ?? 'astri-solutions';

    const results: { github?: string; vercel?: string } = {};

    // Delete GitHub repo
    if (repoName && githubToken) {
      const ghRes = await fetch(
        `https://api.github.com/repos/${githubOrg}/${repoName}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        }
      );
      results.github = ghRes.status === 204 ? 'deleted' : `error:${ghRes.status}`;
    }

    // Delete Vercel project
    if (vercelProjectName && vercelToken) {
      const vRes = await fetch(
        `https://api.vercel.com/v9/projects/${encodeURIComponent(vercelProjectName)}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${vercelToken}` },
        }
      );
      results.vercel = vRes.status === 204 || vRes.ok ? 'deleted' : `error:${vRes.status}`;
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
