// ─── sync-template-all ───────────────────────────────────────────────────────
// A portal's site is its own repo/deploy/content — but the RUNTIME that makes
// it work (scripts/, styles/, vite.config.js in cliente-workr-lite) is one
// shared system. Today that shared code only reaches an already-provisioned
// portal when someone clicks "Publicar" on THAT portal (publish-config's
// self-heal resyncs it as a side effect) — a client who never publishes again
// stays on the old, possibly-buggy template forever, even after a fix ships.
//
// This function is the fix for that gap: it pushes the current
// cliente-workr-lite scripts/styles/vite.config.js into EVERY already
// -provisioned portal, one commit per portal, and NEVER touches
// scripts/site.config.js or any per-portal content. Run this once after any
// change to the shared template so every portal ends up on the corrected
// system without depending on that portal's own admin publishing anything.
//
// Efficient by construction: a blob's SHA is a pure hash of its content, so
// comparing the template blob's sha against whatever sha already sits at that
// path in a portal's tree tells us — without downloading anything twice —
// whether that specific file actually changed for that portal. Portals
// already in sync get zero commits and zero redeploys.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function resolveServiceKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    if (keys?.default) return keys.default;
  } catch { /* not JSON or unset */ }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
}

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

interface GitTreeEntry { path: string; type: string; sha: string; }

interface PortalResult {
  repoName: string;
  status: 'updated' | 'already-current' | 'error';
  filesChanged?: number;
  error?: string;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const ch = corsHeaders(origin);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: ch });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...ch, 'Content-Type': 'application/json' } });
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

    // A pg_cron job calls this on a schedule so the golden rule ("every fix
    // reaches every portal") holds without anyone remembering to click a
    // button — it authenticates with the service_role key itself (fetched
    // from Vault, never hardcoded in the cron job's SQL). This project has
    // migrated to Supabase's newer opaque `sb_secret_...` key format for its
    // service_role key — NOT a three-part JWT — so a bearer token equal to
    // that resolved key IS the trusted service-role credential; there is no
    // `role` claim to decode out of it (attempting to, e.g. via
    // `token.split('.')[1]`, silently produced `undefined` for this opaque
    // format, and every cron-triggered call fell through to the user-JWT
    // path and failed with 401). A legacy long-lived JWT-format service key
    // (`role: "service_role"` claim, base64url-encoded) is still accepted as
    // a fallback for projects that haven't migrated.
    const bearerToken = authHeader.replace(/^Bearer\s+/i, '');
    const isServiceRoleCall = bearerToken === resolveServiceKey() || (() => {
      try {
        const segment = bearerToken.split('.')[1];
        if (!segment) return false;
        const base64 = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(segment.length + ((4 - (segment.length % 4)) % 4), '=');
        const payload = JSON.parse(atob(base64));
        return payload?.role === 'service_role';
      } catch { return false; }
    })();

    if (!isServiceRoleCall) {
      const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
      const { data: { user }, error: authError } = await anonClient.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...ch, 'Content-Type': 'application/json' } });
      }
      const role = user.app_metadata?.role as string | undefined;
      if (role !== 'super_admin') {
        return new Response(JSON.stringify({ error: 'Forbidden: super_admin required' }), { status: 403, headers: { ...ch, 'Content-Type': 'application/json' } });
      }
    }

    // Keeps Vault's copy of the service key fresh so the cron job (which
    // reads it from there, never from a hardcoded value) always has a
    // working credential — self-healing the same way the rest of this
    // system does, with no separate setup step for whoever runs this first.
    try {
      const seedAdmin = createClient(supabaseUrl, resolveServiceKey());
      await seedAdmin.rpc('seed_service_role_vault_secret', { p_secret: resolveServiceKey() });
    } catch { /* non-fatal — cron keeps using whatever is already in Vault */ }

    const githubToken = Deno.env.get('GITHUB_TOKEN');
    const githubOrg = Deno.env.get('GITHUB_ORG') ?? 'astri-solutions';
    if (!githubToken) {
      return new Response(JSON.stringify({ error: 'GITHUB_TOKEN secret not configured' }), { status: 500, headers: { ...ch, 'Content-Type': 'application/json' } });
    }

    const ghHeaders = {
      'Authorization': `Bearer ${githubToken}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    };
    async function gh(path: string, init?: RequestInit) {
      return fetch(`https://api.github.com${path}`, { ...init, headers: { ...ghHeaders, ...(init?.headers ?? {}) } });
    }

    // ── 1. Read the template's shared files ONCE — every portal is diffed
    // against this same snapshot, so the whole run reflects one consistent
    // version of the system rather than a moving target if the template
    // changed mid-run.
    const TEMPLATE_EXCLUDE = new Set(['scripts/site.config.js', 'public/scripts/theme-data.js']);
    const tplRefRes = await gh(`/repos/${githubOrg}/cliente-workr-lite/git/ref/heads/main`);
    if (!tplRefRes.ok) {
      return new Response(JSON.stringify({ error: 'Não foi possível ler o repositório template cliente-workr-lite.' }), { status: 502, headers: { ...ch, 'Content-Type': 'application/json' } });
    }
    const tplRefData = await tplRefRes.json() as { object: { sha: string } };
    const tplCommitData = await (await gh(`/repos/${githubOrg}/cliente-workr-lite/git/commits/${tplRefData.object.sha}`)).json() as { tree: { sha: string } };
    const tplTreeData = await (await gh(`/repos/${githubOrg}/cliente-workr-lite/git/trees/${tplCommitData.tree.sha}?recursive=1`)).json() as { tree: GitTreeEntry[] };
    const templateFiles = tplTreeData.tree.filter(t =>
      t.type === 'blob'
      && (t.path.startsWith('scripts/') || t.path.startsWith('styles/') || t.path === 'vite.config.js' || t.path === 'public/scripts/theme-critical.js'
          || t.path === 'vercel.json' || t.path === 'public/robots.txt' || t.path === 'public/_headers')
      && !TEMPLATE_EXCLUDE.has(t.path)
    );
    if (templateFiles.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum arquivo compartilhado encontrado no template — abortando por segurança.' }), { status: 502, headers: { ...ch, 'Content-Type': 'application/json' } });
    }

    // Blob content, fetched from the template repo lazily and cached by sha —
    // every portal that needs a given file shares the same fetch. Git blob
    // SHAs are NOT valid across repos: even though the hash is a pure
    // function of content, GitHub's Git Data API looks up the object in that
    // specific repo's own store, so a portal repo that never had this exact
    // blob rejects a tree entry pointing at it ("not a valid blob") — the
    // content has to actually be POSTed into the target repo first.
    const blobContentCache = new Map<string, string>();
    async function templateBlobContent(sha: string): Promise<string | null> {
      const cached = blobContentCache.get(sha);
      if (cached) return cached;
      const res = await gh(`/repos/${githubOrg}/cliente-workr-lite/git/blobs/${sha}`);
      if (!res.ok) return null;
      const data = await res.json() as { content: string };
      const content = data.content.replace(/\n/g, '');
      blobContentCache.set(sha, content);
      return content;
    }

    // ── 2. Every portal with a linked repo ──────────────────────────────────
    const admin = createClient(supabaseUrl, resolveServiceKey());
    const { data: portals, error: portalsErr } = await admin
      .from('portals')
      .select('portal_key, cliente, github_repo')
      .not('github_repo', 'is', null);
    if (portalsErr) {
      return new Response(JSON.stringify({ error: `Falha ao listar portais: ${portalsErr.message}` }), { status: 500, headers: { ...ch, 'Content-Type': 'application/json' } });
    }

    const results: PortalResult[] = [];

    for (const portal of portals ?? []) {
      const repoName = portal.github_repo as string;
      try {
        const refRes = await gh(`/repos/${githubOrg}/${repoName}/git/ref/heads/main`);
        if (!refRes.ok) { results.push({ repoName, status: 'error', error: 'repo/branch não encontrado' }); continue; }
        const refData = await refRes.json() as { object: { sha: string } };
        const baseCommitSha = refData.object.sha;
        const commitData = await (await gh(`/repos/${githubOrg}/${repoName}/git/commits/${baseCommitSha}`)).json() as { tree: { sha: string } };
        const baseTreeSha = commitData.tree.sha;
        const treeRes = await gh(`/repos/${githubOrg}/${repoName}/git/trees/${baseTreeSha}?recursive=1`);
        const treeData = await treeRes.json() as { tree: GitTreeEntry[] };
        const currentShaByPath = new Map(treeData.tree.filter(t => t.type === 'blob').map(t => [t.path, t.sha]));

        // A file whose blob sha already matches the template's is byte-for-byte
        // identical — nothing to write, and nothing to commit for it.
        const changedFiles = templateFiles.filter(tf => currentShaByPath.get(tf.path) !== tf.sha);
        if (changedFiles.length === 0) {
          results.push({ repoName, status: 'already-current' });
          continue;
        }

        // Recreate each changed blob IN THIS repo — reusing the template's
        // sha directly here is exactly what produced "tree.sha ... is not a
        // valid blob" the first time around.
        const treeEntries: { path: string; mode: string; type: string; sha: string }[] = [];
        let blobFetchFailed = false;
        for (const tf of changedFiles) {
          const content = await templateBlobContent(tf.sha);
          if (content === null) { blobFetchFailed = true; break; }
          const blobRes = await gh(`/repos/${githubOrg}/${repoName}/git/blobs`, {
            method: 'POST',
            body: JSON.stringify({ content, encoding: 'base64' }),
          });
          if (!blobRes.ok) { blobFetchFailed = true; break; }
          const blobData = await blobRes.json() as { sha: string };
          treeEntries.push({ path: tf.path, mode: '100644', type: 'blob', sha: blobData.sha });
        }
        if (blobFetchFailed) {
          results.push({ repoName, status: 'error', error: 'falha ao recriar um ou mais blobs neste repositório' });
          continue;
        }

        const newTreeRes = await gh(`/repos/${githubOrg}/${repoName}/git/trees`, {
          method: 'POST',
          body: JSON.stringify({ base_tree: baseTreeSha, tree: treeEntries }),
        });
        if (!newTreeRes.ok) {
          const b = await newTreeRes.json().catch(() => ({}));
          results.push({ repoName, status: 'error', error: `tree create failed: ${(b as { message?: string }).message ?? newTreeRes.statusText}` });
          continue;
        }
        const newTree = await newTreeRes.json() as { sha: string };

        const newCommitRes = await gh(`/repos/${githubOrg}/${repoName}/git/commits`, {
          method: 'POST',
          body: JSON.stringify({
            message: `chore: sincroniza sistema compartilhado (scripts/styles)\n\n${changedFiles.map(f => f.path).join(', ')}`,
            tree: newTree.sha,
            parents: [baseCommitSha],
          }),
        });
        if (!newCommitRes.ok) {
          const b = await newCommitRes.json().catch(() => ({}));
          results.push({ repoName, status: 'error', error: `commit create failed: ${(b as { message?: string }).message ?? newCommitRes.statusText}` });
          continue;
        }
        const newCommit = await newCommitRes.json() as { sha: string };

        const refUpdateRes = await gh(`/repos/${githubOrg}/${repoName}/git/refs/heads/main`, {
          method: 'PATCH',
          body: JSON.stringify({ sha: newCommit.sha }),
        });
        if (!refUpdateRes.ok) {
          const b = await refUpdateRes.json().catch(() => ({}));
          results.push({ repoName, status: 'error', error: `ref update failed: ${(b as { message?: string }).message ?? refUpdateRes.statusText}` });
          continue;
        }

        results.push({ repoName, status: 'updated', filesChanged: changedFiles.length });
      } catch (e) {
        results.push({ repoName, status: 'error', error: String(e) });
      }
    }

    return new Response(JSON.stringify({
      templateFilesChecked: templateFiles.length,
      portalsChecked: results.length,
      portalsUpdated: results.filter(r => r.status === 'updated').length,
      portalsAlreadyCurrent: results.filter(r => r.status === 'already-current').length,
      portalsFailed: results.filter(r => r.status === 'error').length,
      results,
    }), { status: 200, headers: { ...ch, 'Content-Type': 'application/json' } });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...ch, 'Content-Type': 'application/json' } });
  }
});
