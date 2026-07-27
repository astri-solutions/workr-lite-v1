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
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...ch, 'Content-Type': 'application/json' } });
    }
    const role = user.app_metadata?.role as string | undefined;
    if (role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: super_admin required' }), { status: 403, headers: { ...ch, 'Content-Type': 'application/json' } });
    }

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
    const TEMPLATE_EXCLUDE = new Set(['scripts/site.config.js']);
    const tplRefRes = await gh(`/repos/${githubOrg}/cliente-workr-lite/git/ref/heads/main`);
    if (!tplRefRes.ok) {
      return new Response(JSON.stringify({ error: 'Não foi possível ler o repositório template cliente-workr-lite.' }), { status: 502, headers: { ...ch, 'Content-Type': 'application/json' } });
    }
    const tplRefData = await tplRefRes.json() as { object: { sha: string } };
    const tplCommitData = await (await gh(`/repos/${githubOrg}/cliente-workr-lite/git/commits/${tplRefData.object.sha}`)).json() as { tree: { sha: string } };
    const tplTreeData = await (await gh(`/repos/${githubOrg}/cliente-workr-lite/git/trees/${tplCommitData.tree.sha}?recursive=1`)).json() as { tree: GitTreeEntry[] };
    const templateFiles = tplTreeData.tree.filter(t =>
      t.type === 'blob'
      && (t.path.startsWith('scripts/') || t.path.startsWith('styles/') || t.path === 'vite.config.js')
      && !TEMPLATE_EXCLUDE.has(t.path)
    );
    if (templateFiles.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum arquivo compartilhado encontrado no template — abortando por segurança.' }), { status: 502, headers: { ...ch, 'Content-Type': 'application/json' } });
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

        const treeEntries = changedFiles.map(tf => ({ path: tf.path, mode: '100644', type: 'blob', sha: tf.sha }));
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
