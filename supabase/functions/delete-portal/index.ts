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

    const role = user.app_metadata?.role as string | undefined;
    if (role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...ch, 'Content-Type': 'application/json' },
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
      if (ghRes.status === 204) {
        results.github = 'deleted';
      } else {
        const body = await ghRes.json().catch(() => ({})) as { message?: string };
        results.github = `error:${ghRes.status}:${body.message ?? ghRes.statusText}`;
      }
    } else if (repoName && !githubToken) {
      results.github = 'error:no_token';
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
    } else if (vercelProjectName && !vercelToken) {
      results.vercel = 'error:no_token';
    }

    const hasErrors = Object.values(results).some(v => typeof v === 'string' && v.startsWith('error:'));

    return new Response(JSON.stringify({ ok: !hasErrors, results }), {
      status: hasErrors ? 207 : 200, headers: { ...ch, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const ch2 = corsHeaders(req.headers.get('Origin'));
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...ch2, 'Content-Type': 'application/json' },
    });
  }
});
