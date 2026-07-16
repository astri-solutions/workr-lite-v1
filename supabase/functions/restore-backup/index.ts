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

    const { repoName, sha } = await req.json() as { repoName?: string; sha?: string };

    if (!repoName || !sha) {
      return new Response(JSON.stringify({ error: 'repoName and sha are required' }), {
        status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(repoName) || !/^[0-9a-f]{5,40}$/.test(sha)) {
      return new Response(JSON.stringify({ error: 'Invalid repoName or sha' }), {
        status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const githubToken = Deno.env.get('GITHUB_TOKEN');
    if (!githubToken) {
      return new Response(JSON.stringify({ error: 'GITHUB_TOKEN not configured' }), {
        status: 500, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const githubOrg = Deno.env.get('GITHUB_ORG') ?? 'astri-solutions';

    // Force-update the main branch ref to the target SHA (equivalent to git reset --hard <sha>)
    const ghRes = await fetch(
      `https://api.github.com/repos/${githubOrg}/${repoName}/git/refs/heads/main`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
          'User-Agent': 'workr-lite-cms',
        },
        body: JSON.stringify({ sha, force: true }),
      }
    );

    if (ghRes.status === 200) {
      const data = await ghRes.json();
      return new Response(JSON.stringify({ ok: true, ref: data.ref, sha: data.object?.sha }), {
        status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const body = await ghRes.json().catch(() => ({})) as { message?: string };
    return new Response(
      JSON.stringify({ ok: false, error: body.message ?? `GitHub ${ghRes.status}` }),
      { status: 502, headers: { ...ch, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
});
