import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Supabase project migrated to JWT Signing Keys (asymmetric ES256) — the
// legacy SUPABASE_SERVICE_ROLE_KEY (still auto-injected) fails signature
// verification against auth.admin.* calls with "unrecognized JWT kid <nil>
// for algorithm ES256". SUPABASE_SECRET_KEYS (also auto-injected, JSON map)
// holds the new opaque sb_secret_... key that sidesteps this entirely.
// Falls back to the legacy key if the new one is not configured yet.
function resolveServiceKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    if (keys?.default) return keys.default;
  } catch { /* not JSON or unset */ }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
}

const ALLOWED_ORIGINS = [
  'https://workr-lite-v1.vercel.app',
  'https://workr.dev.br',
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

// UUID v4 pattern
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    const role = user.app_metadata?.role as string | undefined;
    if (role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const { repoName, vercelProjectName, cloudflareProjectName, portalId } = await req.json() as {
      repoName?: string;
      vercelProjectName?: string;
      // Cloudflare Pages project name (== repoName in practice, since
      // provision-portal names the Pages project after the repo) — kept as
      // its own field rather than reusing repoName so the caller stays
      // explicit about which platform actually hosts this portal.
      cloudflareProjectName?: string;
      portalId?: string; // UUID or portal_key — we resolve either
    };

    const githubToken     = Deno.env.get('GITHUB_TOKEN');
    const vercelToken     = Deno.env.get('VERCEL_TOKEN');
    const cloudflareToken = Deno.env.get('CLOUDFLARE_API_TOKEN');
    const cloudflareAccountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const githubOrg   = Deno.env.get('GITHUB_ORG') ?? 'astri-solutions';

    const results: { github?: string; vercel?: string; cloudflare?: string; db?: string } = {};

    // ── Delete GitHub repo ────────────────────────────────────────────────────
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
      if (ghRes.status === 204 || ghRes.status === 404) {
        results.github = 'deleted';
      } else {
        const body = await ghRes.json().catch(() => ({})) as { message?: string };
        results.github = `error:${ghRes.status}:${body.message ?? ghRes.statusText}`;
      }
    } else if (repoName && !githubToken) {
      results.github = 'error:no_token';
    }

    // ── Delete Vercel project ─────────────────────────────────────────────────
    if (vercelProjectName && vercelToken) {
      const vRes = await fetch(
        `https://api.vercel.com/v9/projects/${encodeURIComponent(vercelProjectName)}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${vercelToken}` },
        }
      );
      results.vercel = (vRes.status === 204 || vRes.ok || vRes.status === 404) ? 'deleted' : `error:${vRes.status}`;
    } else if (vercelProjectName && !vercelToken) {
      results.vercel = 'error:no_token';
    }

    // ── Delete Cloudflare Pages project ─────────────────────────────────────────
    if (cloudflareProjectName && cloudflareToken && cloudflareAccountId) {
      const cfRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/pages/projects/${encodeURIComponent(cloudflareProjectName)}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${cloudflareToken}` },
        }
      );
      results.cloudflare = (cfRes.status === 204 || cfRes.ok || cfRes.status === 404) ? 'deleted' : `error:${cfRes.status}`;
    } else if (cloudflareProjectName && (!cloudflareToken || !cloudflareAccountId)) {
      results.cloudflare = 'error:no_token';
    }

    // ── Delete all database records (service role — bypasses RLS) ─────────────
    if (portalId) {
      try {
        const admin = createClient(supabaseUrl, resolveServiceKey());

        // Resolve UUID: accept either a UUID directly or a portal_key string
        let uuid: string | null = null;
        if (UUID_RE.test(portalId)) {
          uuid = portalId;
        } else {
          const { data } = await admin.from('portals').select('id').eq('portal_key', portalId).single();
          uuid = data?.id ?? null;
        }

        // Also try resolving by github_repo as a last resort
        if (!uuid && repoName) {
          const { data } = await admin.from('portals').select('id').eq('github_repo', repoName).single();
          uuid = data?.id ?? null;
        }

        if (uuid) {
          // Find users that belong ONLY to this portal before deleting the junction rows
          const { data: portalUserRows } = await admin
            .from('portal_users')
            .select('user_id')
            .eq('portal_id', uuid);

          const userIds: string[] = (portalUserRows ?? []).map((r: { user_id: string }) => r.user_id);

          // Determine which users have no other portal memberships (orphan after this deletion)
          const orphanUserIds: string[] = [];
          for (const uid of userIds) {
            const { count } = await admin
              .from('portal_users')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', uid)
              .neq('portal_id', uuid);
            if ((count ?? 0) === 0) orphanUserIds.push(uid);
          }

          // Deleting portals cascades to every table with a portal_id FK
          // (portal_sites, portal_users, portal_config, portal_documents,
          // portal_activity_log, portal_media, cvm_sync_state, etc.)
          const { error: delErr } = await admin.from('portals').delete().eq('id', uuid);
          results.db = delErr ? `error:${delErr.message}` : 'deleted';

          // The auth-user cleanup below is a separate concern from the DB
          // deletion above — if the delete itself failed, don't run it: it
          // would previously still fire, and any of ITS errors got appended
          // onto results.db, making an unrelated auth issue look like part
          // of the same failure as the FK violation that actually blocked
          // the delete.
          if (!delErr) {
            // Remove orphan auth users (invited solely for this portal)
            const authErrors: string[] = [];
            const deletedUids = new Set<string>(orphanUserIds);
            for (const uid of orphanUserIds) {
              const { error: authErr } = await admin.auth.admin.deleteUser(uid);
              if (authErr) authErrors.push(authErr.message);
            }

            // Also sweep auth users by app_metadata.portalIds — catches ghost accounts
            // created by generateLink but never properly linked into portal_users
            try {
              const { data: { users: allUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 });
              for (const au of allUsers) {
                if (deletedUids.has(au.id)) continue; // already handled above
                const ids: string[] = au.app_metadata?.portalIds ?? [];
                if (!ids.includes(uuid)) continue;
                // Remove this portal from their portalIds
                const remaining = ids.filter((id: string) => id !== uuid);
                if (remaining.length === 0) {
                  // No other portals — delete the auth user
                  const { error: delErr2 } = await admin.auth.admin.deleteUser(au.id);
                  if (delErr2) authErrors.push(delErr2.message);
                } else {
                  // Has other portals — just strip this portal from portalIds
                  await admin.auth.admin.updateUserById(au.id, {
                    app_metadata: { ...au.app_metadata, portalIds: remaining },
                  });
                }
              }
            } catch { /* non-fatal sweep */ }

            if (authErrors.length > 0) {
              results.db += `:auth_warn:${authErrors.join(',')}`;
            }
          }
        } else {
          results.db = 'not_found';
        }
      } catch (e) {
        results.db = `error:${String(e)}`;
      }
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
