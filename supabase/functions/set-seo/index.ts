import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Supabase project migrated to JWT Signing Keys (asymmetric ES256) — the
// legacy SUPABASE_SERVICE_ROLE_KEY (still auto-injected) fails signature
// verification against auth.admin.* calls with "unrecognized JWT kid <nil>
// for algorithm ES256". SUPABASE_SECRET_KEYS (also auto-injected, JSON map)
// holds the new opaque sb_secret_... key that sidesteps this entirely.
function resolveServiceKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
    if (keys?.default) return keys.default;
  } catch { /* not JSON or unset */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

interface SeoCfg { metaTitulo?: string; metaDescricao?: string; analyticsId?: string; clarityId?: string; }

// Same shape publish-config's buildSeoSection emits (and provision-portal
// before it) — matches this exactly so the regex below reliably finds and
// replaces the block regardless of which of the two ever wrote it last.
function buildSeoBlock(seo: SeoCfg, fallbackTitle: string): string {
  return `{
    title:             ${JSON.stringify(seo.metaTitulo || fallbackTitle)},
    description:       ${JSON.stringify(seo.metaDescricao ?? '')},
    googleAnalyticsId: ${JSON.stringify(seo.analyticsId ?? '')},
    clarityId:         ${JSON.stringify(seo.clarityId ?? '')},
  }`;
}

// Only replaces the `seo: {...}` object already present in the generated
// site.config.js — every other field untouched, unlike publish-config's full
// rebuild (which would need every other field re-sent or it resets them).
// Safe as a non-nested-brace match: every value inside `seo` is a plain
// string, so the first `}` really is the end of the object.
function patchSeoBlock(source: string, seoBlock: string): string | null {
  const re = /seo:\s*\{[^}]*\},/;
  if (!re.test(source)) return null;
  return source.replace(re, `seo: ${seoBlock},`);
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

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const role = user.app_metadata?.role as string | undefined;
    if (role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: apenas super_admin pode alterar SEO/Analytics' }), {
        status: 403, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const { portalId, metaTitulo, metaDescricao, analyticsId, clarityId } = await req.json() as {
      portalId?: string;
      metaTitulo?: string;
      metaDescricao?: string;
      analyticsId?: string;
      clarityId?: string;
    };
    if (!portalId) {
      return new Response(JSON.stringify({ error: 'portalId é obrigatório' }), {
        status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }
    const seo: SeoCfg = { metaTitulo, metaDescricao, analyticsId, clarityId };

    const adminClient = createClient(supabaseUrl, resolveServiceKey());

    const { data: portalRow, error: portalError } = await adminClient
      .from('portals')
      .select('id, cliente, github_repo')
      .eq('portal_key', portalId)
      .single();

    if (portalError || !portalRow) {
      return new Response(JSON.stringify({ error: 'Portal não encontrado' }), {
        status: 404, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    // Merge into `informacoes` (nomeFantasia/emailContato/idiomas already
    // live there) instead of overwriting it wholesale — same footgun this
    // codebase already hit once with idiomas getting silently wiped.
    const { data: existingCfg } = await adminClient
      .from('portal_config')
      .select('informacoes')
      .eq('portal_id', portalRow.id)
      .maybeSingle();
    const informacoes = { ...(existingCfg?.informacoes as Record<string, unknown> ?? {}), seo };

    const { error: upsertError } = await adminClient
      .from('portal_config')
      .upsert({ portal_id: portalRow.id, informacoes }, { onConflict: 'portal_id' });

    if (upsertError) {
      return new Response(JSON.stringify({ error: `Falha ao salvar no banco: ${upsertError.message}` }), {
        status: 500, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    if (!portalRow.github_repo) {
      return new Response(JSON.stringify({ ok: true, sitePatched: false }), {
        status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const githubToken = Deno.env.get('GITHUB_TOKEN');
    const githubOrg = Deno.env.get('GITHUB_ORG') ?? 'astri-solutions';
    if (!githubToken) {
      return new Response(JSON.stringify({ ok: true, sitePatched: false, warning: 'GITHUB_TOKEN não configurado — dados salvos apenas no banco' }), {
        status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const ghHeaders = {
      'Authorization': `Bearer ${githubToken}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    const filePath = 'scripts/site.config.js';
    const getUrl = `https://api.github.com/repos/${githubOrg}/${portalRow.github_repo}/contents/${filePath}`;

    const getRes = await fetch(getUrl, { headers: ghHeaders });
    if (!getRes.ok) {
      return new Response(JSON.stringify({ ok: true, sitePatched: false, warning: `Não foi possível ler site.config.js do GitHub (status ${getRes.status})` }), {
        status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }
    const getJson = await getRes.json() as { content: string; sha: string };
    const currentContent = decodeURIComponent(escape(atob(getJson.content.replace(/\n/g, ''))));

    const seoBlock = buildSeoBlock(seo, `${portalRow.cliente} — Relações com Investidores`);
    const patched = patchSeoBlock(currentContent, seoBlock);
    if (patched === null) {
      return new Response(JSON.stringify({ ok: true, sitePatched: false, warning: 'site.config.js ainda não tem o campo seo — publique o portal uma vez para gerá-lo' }), {
        status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const putRes = await fetch(getUrl, {
      method: 'PUT',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'SEO/Analytics atualizado via Painel de Controle',
        content: btoa(unescape(encodeURIComponent(patched))),
        sha: getJson.sha,
      }),
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      return new Response(JSON.stringify({ ok: true, sitePatched: false, warning: `Falha ao publicar no GitHub: ${errText}` }), {
        status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, sitePatched: true }), {
      status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const ch2 = corsHeaders(req.headers.get('Origin'));
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...ch2, 'Content-Type': 'application/json' },
    });
  }
});
