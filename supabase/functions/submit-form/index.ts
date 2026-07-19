import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendFormSubmission } from '../_shared/postmark.ts';

// Public endpoint called directly from client portal static sites — every
// portal lives on its own domain, so the origin allowlist used by the CMS
// edge functions doesn't apply here. There is no session/cookie involved,
// and every write is scoped by validating portalId+materiaId together
// against the database, so an open CORS policy is safe.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface FormField {
  id: string;
  type: string;
  label: string;
  required?: boolean;
}
interface FormularioContent {
  kind?: string;
  fields?: FormField[];
  receiverEmail?: string;
  replyTo?: boolean;
}
interface InteracaoEntry {
  id: string;
  tipo: 'fale-ri' | 'mailing';
  nome: string;
  email: string;
  mensagem: string;
  status: 'novo';
  data: string;
}

function pick(fields: FormField[], values: Record<string, string>, predicate: (f: FormField) => boolean): string {
  const f = fields.find(predicate);
  return f ? (values[f.id] ?? '').trim() : '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const { portalId, materiaId, values } = await req.json() as {
      portalId?: string;
      materiaId?: string;
      values?: Record<string, string>;
    };

    if (!portalId || !materiaId || !values) {
      return new Response(JSON.stringify({ error: 'portalId, materiaId and values are required' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Validate portalId+materiaId together — prevents submitting against a
    // matéria that belongs to a different portal, or one that's unpublished.
    const { data: materia } = await admin
      .from('portal_materias')
      .select('id, titulo, page_id, content, status')
      .eq('id', materiaId)
      .eq('portal_id', portalId)
      .maybeSingle();

    if (!materia || materia.status !== 'publicado') {
      return new Response(JSON.stringify({ error: 'Form not found or not published' }), {
        status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const content = materia.content as FormularioContent | null;
    if (!content || content.kind !== 'formulario' || !Array.isArray(content.fields)) {
      return new Response(JSON.stringify({ error: 'This matéria is not a formulário' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const fields = content.fields;
    const missing = fields.filter(f => f.required && !(values[f.id] ?? '').trim());
    if (missing.length > 0) {
      return new Response(JSON.stringify({ error: `Missing required field(s): ${missing.map(f => f.label).join(', ')}` }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const emailVal = pick(fields, values, f => f.type === 'email');
    const nomeVal = pick(fields, values, f => f.type === 'text') || pick(fields, values, f => f.type === 'company') || 'Visitante';
    const mensagemVal = pick(fields, values, f => f.type === 'textarea')
      || fields.map(f => `${f.label}: ${(values[f.id] ?? '').trim()}`).filter(Boolean).join('\n');

    const entry: InteracaoEntry = {
      id: crypto.randomUUID(),
      tipo: materia.page_id === 'mailing' ? 'mailing' : 'fale-ri',
      nome: nomeVal,
      email: emailVal,
      mensagem: mensagemVal,
      status: 'novo',
      data: new Date().toISOString().slice(0, 10).split('-').reverse().join('/'),
    };

    // Append to portal_config.interacoes (read-modify-write — acceptable at
    // this submission volume) and fetch the portal name for the email subject.
    const [{ data: cfgRow }, { data: portalRow }] = await Promise.all([
      admin.from('portal_config').select('interacoes').eq('portal_id', portalId).maybeSingle(),
      admin.from('portals').select('cliente').eq('id', portalId).maybeSingle(),
    ]);
    const nextInteracoes = [entry, ...((cfgRow?.interacoes as InteracaoEntry[] | null) ?? [])];
    await admin.from('portal_config').update({ interacoes: nextInteracoes }).eq('portal_id', portalId);

    if (content.receiverEmail) {
      try {
        await sendFormSubmission({
          portalNome: portalRow?.cliente ?? 'Portal',
          formTitulo: materia.titulo || 'Formulário',
          toEmail: content.receiverEmail,
          fields: fields.map(f => ({ label: f.label, value: (values[f.id] ?? '').trim() })),
          replyToEmail: content.replyTo ? emailVal || undefined : undefined,
        });
      } catch (e) {
        // The submission itself succeeded (interação recorded) — email is
        // best-effort, don't fail the visitor's request over an SMTP hiccup.
        console.error('sendFormSubmission failed', e);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
