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
      return new Response(JSON.stringify({ error: 'Forbidden: super_admin required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { portalId, nome, subdomain } = await req.json() as {
      portalId: string;
      nome: string;
      subdomain: string;
    };

    const githubToken = Deno.env.get('GITHUB_TOKEN');
    const vercelToken = Deno.env.get('VERCEL_TOKEN');
    const githubOrg = Deno.env.get('GITHUB_ORG') ?? 'astri-solutions';
    const templateRepo = 'cliente-workr-lite';
    const repoName = `portal-${subdomain}`;

    if (!githubToken) {
      return new Response(JSON.stringify({ error: 'GITHUB_TOKEN secret not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create GitHub repo from template
    const ghRes = await fetch(`https://api.github.com/repos/${githubOrg}/${templateRepo}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        owner: githubOrg,
        name: repoName,
        description: `Portal RI — ${nome}`,
        private: false,
        include_all_branches: false,
      }),
    });

    if (!ghRes.ok) {
      const ghBody = await ghRes.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: `GitHub: ${ghBody.message ?? ghRes.statusText}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ghData = await ghRes.json();
    const repoUrl = ghData.html_url as string;
    const cloneUrl = ghData.clone_url as string;

    let vercelUrl = `https://${repoName}.vercel.app`;

    // Create Vercel project (optional — skip if no token)
    if (vercelToken) {
      const vercelRes = await fetch('https://api.vercel.com/v10/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: repoName,
          framework: 'vite',
          gitRepository: {
            type: 'github',
            repo: `${githubOrg}/${repoName}`,
          },
        }),
      });

      if (vercelRes.ok) {
        const vercelData = await vercelRes.json();
        vercelUrl = `https://${vercelData.name}.vercel.app`;
      }
    }

    return new Response(JSON.stringify({
      repoName,
      repoUrl,
      cloneUrl,
      vercelUrl,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
