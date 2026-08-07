import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendFormSubmission } from '../_shared/postmark.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

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

const ASSUNTO_LABEL: Record<string, string> = {
  'duvida-tecnica': 'Dúvida técnica',
  'duvida-plataforma': 'Dúvida sobre a plataforma',
  'solicitacao-recurso': 'Solicitação de recurso',
  'relatar-problema': 'Relatar um problema',
  'financeiro': 'Financeiro / cobrança',
  'outro': 'Outro',
};

const PRIORIDADE_LABEL: Record<string, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };

// Every portal is meant to have a suporte_email assigned via o painel de
// controle (super_admin) — this is only a safety net for portals where that
// hasn't been set up yet, so messages never silently go nowhere.
const FALLBACK_SUPPORT_EMAIL = 'suporte@astri.solutions';

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

    const { portalId, assunto, prioridade, titulo, mensagem, anexos } = await req.json() as {
      portalId?: string;
      assunto?: string;
      prioridade?: string;
      titulo?: string;
      mensagem?: string;
      anexos?: string[]; // storage paths in the (private) portal-documents bucket, uploaded by the client before this call
    };

    if (!portalId || !assunto || !titulo?.trim() || !mensagem?.trim()) {
      return new Response(JSON.stringify({ error: 'portalId, assunto, titulo and mensagem are required' }), {
        status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      resolveServiceKey(),
    );

    // Logged-in, but still cheap for one account to flood support inboxes
    // with tickets — a handful per minute is generous for a real user.
    const { allowed } = await checkRateLimit(adminClient, `submit-atendimento:${user.id}`, 5, 60);
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Muitas tentativas — aguarde um momento e tente novamente.' }), {
        status: 429, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    // portalId here is the portal_key (localStorage-style id), matching how
    // the CMS addresses the active portal everywhere else.
    const { data: portal } = await adminClient
      .from('portals')
      .select('id, cliente, suporte_email')
      .eq('portal_key', portalId)
      .maybeSingle();

    const toEmail = (portal?.suporte_email as string | undefined) || FALLBACK_SUPPORT_EMAIL;
    const portalNome = (portal?.cliente as string | undefined) ?? 'Portal';
    const assuntoLabel = ASSUNTO_LABEL[assunto] ?? assunto;
    const prioridadeLabel = PRIORIDADE_LABEL[prioridade ?? 'media'] ?? 'Média';

    // Attachments are uploaded straight to Storage by the client (this
    // function only ever sees JSON) — sign each path here, with the service
    // role, into a link the support team can open. 7 days is generous for a
    // support ticket to be triaged without leaving the link live forever.
    const ANEXO_TTL_SECONDS = 7 * 24 * 60 * 60;
    const anexoLinks: string[] = [];
    for (const path of anexos ?? []) {
      try {
        const { data } = await adminClient.storage.from('portal-documents').createSignedUrl(path, ANEXO_TTL_SECONDS);
        if (data?.signedUrl) {
          const fileName = path.split('/').pop() ?? 'anexo';
          anexoLinks.push(`<a href="${data.signedUrl}">${fileName}</a>`);
        }
      } catch { /* one bad path shouldn't drop the whole ticket */ }
    }

    // Persist the ticket itself — before this, a support request only ever
    // existed as an e-mail (below) plus a per-portal jsonb blob nobody but
    // that portal's own users could see. This is what the Super Admin
    // Atendimento inbox reads from; the row is written with the service
    // role, so it lands regardless of which super_admin (if any) is
    // currently assigned as this portal's suporte_user_id — RLS on the
    // table itself is what scopes visibility to that one assignee.
    let ticketId: string | undefined;
    if (portal?.id) {
      const { data: ticketRow, error: insertErr } = await adminClient
        .from('portal_atendimentos')
        .insert({
          portal_id: portal.id,
          user_id: user.id,
          requester_nome: (user.user_metadata?.name as string | undefined) ?? null,
          requester_email: user.email ?? null,
          assunto,
          prioridade: prioridade ?? 'media',
          titulo: titulo.trim(),
          mensagem: mensagem.trim(),
          anexos: anexos ?? [],
        })
        .select('id')
        .single();
      if (insertErr) console.error('portal_atendimentos insert failed', insertErr);
      ticketId = ticketRow?.id as string | undefined;
    }

    await sendFormSubmission({
      portalNome,
      formTitulo: `Atendimento — ${assuntoLabel}`,
      toEmail,
      fields: [
        { label: 'Portal', value: portalNome },
        { label: 'Assunto', value: assuntoLabel },
        { label: 'Prioridade', value: prioridadeLabel },
        { label: 'Título', value: titulo.trim() },
        { label: 'Mensagem', value: mensagem.trim() },
        { label: 'Anexos', value: anexoLinks.join('<br>') },
        { label: 'Enviado por', value: user.email ?? '' },
      ],
      replyToEmail: user.email ?? undefined,
    });

    return new Response(JSON.stringify({ ok: true, id: ticketId }), {
      status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...ch, 'Content-Type': 'application/json' },
    });
  }
});
