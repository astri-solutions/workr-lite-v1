import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendFormSubmission } from '../_shared/postmark.ts';

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

    const { portalId, assunto, prioridade, titulo, mensagem } = await req.json() as {
      portalId?: string;
      assunto?: string;
      prioridade?: string;
      titulo?: string;
      mensagem?: string;
    };

    if (!portalId || !assunto || !titulo?.trim() || !mensagem?.trim()) {
      return new Response(JSON.stringify({ error: 'portalId, assunto, titulo and mensagem are required' }), {
        status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // portalId here is the portal_key (localStorage-style id), matching how
    // the CMS addresses the active portal everywhere else.
    const { data: portal } = await adminClient
      .from('portals')
      .select('cliente, suporte_email')
      .eq('portal_key', portalId)
      .maybeSingle();

    const toEmail = (portal?.suporte_email as string | undefined) || FALLBACK_SUPPORT_EMAIL;
    const portalNome = (portal?.cliente as string | undefined) ?? 'Portal';
    const assuntoLabel = ASSUNTO_LABEL[assunto] ?? assunto;
    const prioridadeLabel = PRIORIDADE_LABEL[prioridade ?? 'media'] ?? 'Média';

    await sendFormSubmission({
      portalNome,
      formTitulo: `Atendimento — ${assuntoLabel}`,
      toEmail,
      fields: [
        { label: 'Assunto', value: assuntoLabel },
        { label: 'Prioridade', value: prioridadeLabel },
        { label: 'Título', value: titulo.trim() },
        { label: 'Mensagem', value: mensagem.trim() },
        { label: 'Enviado por', value: user.email ?? '' },
      ],
      replyToEmail: user.email ?? undefined,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...ch, 'Content-Type': 'application/json' },
    });
  }
});
