/**
 * Postmark email client for Supabase Edge Functions.
 * Requires POSTMARK_TOKEN secret set in Supabase Edge Function secrets.
 * Requires POSTMARK_FROM secret (e.g. "noreply@astri.solutions").
 */

const POSTMARK_API = 'https://api.postmarkapp.com/email';

interface PostmarkPayload {
  From: string;
  To: string;
  Subject: string;
  HtmlBody: string;
  TextBody?: string;
  ReplyTo?: string;
  MessageStream: string;
}

async function sendPostmark(payload: PostmarkPayload): Promise<{ MessageID?: string; ErrorCode?: number; Message?: string }> {
  const token = Deno.env.get('POSTMARK_TOKEN');
  if (!token) throw new Error('POSTMARK_TOKEN secret not configured');

  const res = await fetch(POSTMARK_API, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': token,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json() as { MessageID?: string; ErrorCode?: number; Message?: string };
  if (!res.ok || (json.ErrorCode && json.ErrorCode !== 0)) {
    throw new Error(`Postmark error ${json.ErrorCode}: ${json.Message}`);
  }
  return json;
}

function from(): string {
  return Deno.env.get('POSTMARK_FROM') ?? 'noreply@astri.solutions';
}

// ── Public senders ─────────────────────────────────────────────────────────────

/**
 * Send a portal admin invite with the Supabase-generated invite link.
 * Bypasses Supabase's built-in email sender (no rate limit).
 */
export async function sendUserInvite(opts: {
  email: string;
  nome?: string;
  portalNome?: string;
  inviteLink: string;
}): Promise<void> {
  const displayName = opts.nome || opts.email;
  const portal = opts.portalNome ? ` do portal <strong>${opts.portalNome}</strong>` : '';

  await sendPostmark({
    From: from(),
    To: opts.email,
    Subject: `Seu acesso ao CMS${opts.portalNome ? ` — ${opts.portalNome}` : ''} está pronto`,
    MessageStream: 'outbound',
    HtmlBody: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Inter,Arial,sans-serif">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#0B5B68;padding:28px 32px">
      <span style="color:#00D865;font-size:20px;font-weight:700;letter-spacing:-0.5px">Workr Lite</span>
    </div>
    <div style="padding:32px">
      <p style="margin:0 0 16px;font-size:15px;color:#141414">Olá, <strong>${displayName}</strong></p>
      <p style="margin:0 0 24px;font-size:15px;color:#414141;line-height:1.6">
        Você foi convidado para administrar o CMS${portal}. Clique no botão abaixo para definir sua senha e acessar o painel.
      </p>
      <a href="${opts.inviteLink}"
         style="display:inline-block;padding:13px 28px;background:#0B5B68;color:#fff;text-decoration:none;border-radius:7px;font-size:14px;font-weight:600">
        Definir senha e acessar
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#949494;line-height:1.5">
        Este link expira em 24 horas. Se você não solicitou este acesso, ignore este e-mail.
      </p>
    </div>
    <div style="padding:16px 32px;background:#f9f9f9;border-top:1px solid #eee">
      <p style="margin:0;font-size:11px;color:#B8B8B8">Workr Lite · Astri Solutions · astri.solutions</p>
    </div>
  </div>
</body>
</html>`,
    TextBody: `Olá ${displayName},\n\nVocê foi convidado para administrar o CMS${opts.portalNome ? ` do portal ${opts.portalNome}` : ''}.\n\nAcesse o link abaixo para definir sua senha:\n${opts.inviteLink}\n\nEste link expira em 24 horas.\n\n— Workr Lite / Astri Solutions`,
  });
}

/**
 * Send a password-reset link, triggered either by an admin (from the "Editar
 * usuário" modal) or by the user themselves (login screen's "Esqueci minha
 * senha"). Uses the same Supabase-generated `action_link` pattern as
 * sendUserInvite — bypasses Supabase's own SMTP so the email is reliable and
 * carries the same Workr Lite branding. The recovery link overwrites whatever
 * password already exists once the user submits a new one on /definir-senha;
 * it does not require knowing the old password.
 */
export async function sendPasswordReset(opts: {
  email: string;
  nome?: string;
  resetLink: string;
  triggeredByAdmin?: boolean;
}): Promise<void> {
  const displayName = opts.nome || opts.email;
  const context = opts.triggeredByAdmin
    ? 'Um administrador solicitou a redefinição da sua senha de acesso ao CMS.'
    : 'Recebemos uma solicitação para redefinir a senha da sua conta no CMS.';

  await sendPostmark({
    From: from(),
    To: opts.email,
    Subject: 'Redefinição de senha — Workr Lite',
    MessageStream: 'outbound',
    HtmlBody: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Inter,Arial,sans-serif">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#0B5B68;padding:28px 32px">
      <span style="color:#00D865;font-size:20px;font-weight:700;letter-spacing:-0.5px">Workr Lite</span>
    </div>
    <div style="padding:32px">
      <p style="margin:0 0 16px;font-size:15px;color:#141414">Olá, <strong>${displayName}</strong></p>
      <p style="margin:0 0 24px;font-size:15px;color:#414141;line-height:1.6">
        ${context} Clique no botão abaixo para criar uma nova senha — a senha atual deixa de funcionar assim que você definir a nova.
      </p>
      <a href="${opts.resetLink}"
         style="display:inline-block;padding:13px 28px;background:#0B5B68;color:#fff;text-decoration:none;border-radius:7px;font-size:14px;font-weight:600">
        Redefinir senha
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#949494;line-height:1.5">
        Este link expira em 1 hora. Se você não solicitou esta redefinição, ignore este e-mail — sua senha atual continua válida.
      </p>
    </div>
    <div style="padding:16px 32px;background:#f9f9f9;border-top:1px solid #eee">
      <p style="margin:0;font-size:11px;color:#B8B8B8">Workr Lite · Astri Solutions · astri.solutions</p>
    </div>
  </div>
</body>
</html>`,
    TextBody: `Olá ${displayName},\n\n${context}\n\nAcesse o link abaixo para criar uma nova senha:\n${opts.resetLink}\n\nEste link expira em 1 hora. Se você não solicitou esta redefinição, ignore este e-mail — sua senha atual continua válida.\n\n— Workr Lite / Astri Solutions`,
  });
}

/**
 * Notify an email that ALREADY has an account that it was just granted
 * access to another portal — no activation link, since there's no signup
 * step left to complete. Sending an activation/magic link to someone who
 * already has a working password is confusing (it reads as "reset your
 * password?") and unnecessary; this is a plain heads-up: log in as usual.
 */
export async function sendPortalAccessGranted(opts: {
  email: string;
  nome?: string;
  portalNome?: string;
  role?: string;
  loginUrl?: string;
}): Promise<void> {
  const displayName = opts.nome || opts.email;
  const portal = opts.portalNome ? ` ao portal <strong>${opts.portalNome}</strong>` : ' a um novo portal';
  const roleLabel: Record<string, string> = { admin: 'administrador', editor: 'editor', viewer: 'visualizador' };
  const roleText = opts.role && roleLabel[opts.role] ? ` como <strong>${roleLabel[opts.role]}</strong>` : '';
  const login = opts.loginUrl ?? 'https://workr.dev.br/login';

  await sendPostmark({
    From: from(),
    To: opts.email,
    Subject: `Novo acesso liberado${opts.portalNome ? ` — ${opts.portalNome}` : ''}`,
    MessageStream: 'outbound',
    HtmlBody: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Inter,Arial,sans-serif">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#0B5B68;padding:28px 32px">
      <span style="color:#00D865;font-size:20px;font-weight:700;letter-spacing:-0.5px">Workr Lite</span>
    </div>
    <div style="padding:32px">
      <p style="margin:0 0 16px;font-size:15px;color:#141414">Olá, <strong>${displayName}</strong></p>
      <p style="margin:0 0 24px;font-size:15px;color:#414141;line-height:1.6">
        Você foi adicionado${portal}${roleText}. Use sua conta existente (mesmo e-mail e senha de sempre) para acessar — não é preciso criar um novo cadastro.
      </p>
      <a href="${login}"
         style="display:inline-block;padding:13px 28px;background:#0B5B68;color:#fff;text-decoration:none;border-radius:7px;font-size:14px;font-weight:600">
        Acessar o painel
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#949494;line-height:1.5">
        Se você não esperava este e-mail, entre em contato com quem administra o portal.
      </p>
    </div>
    <div style="padding:16px 32px;background:#f9f9f9;border-top:1px solid #eee">
      <p style="margin:0;font-size:11px;color:#B8B8B8">Workr Lite · Astri Solutions · astri.solutions</p>
    </div>
  </div>
</body>
</html>`,
    TextBody: `Olá ${displayName},\n\nVocê foi adicionado${opts.portalNome ? ` ao portal ${opts.portalNome}` : ' a um novo portal'}${opts.role && roleLabel[opts.role] ? ` como ${roleLabel[opts.role]}` : ''}.\n\nUse sua conta existente para acessar: ${login}\n\nSe você não esperava este e-mail, entre em contato com quem administra o portal.\n\n— Workr Lite / Astri Solutions`,
  });
}

/**
 * Send a lead alert ("Fale com RI") to the portal's contact emails.
 */
export async function sendLeadAlert(opts: {
  portalNome: string;
  toEmails: string[];
  lead: { nome: string; email: string; telefone?: string; assunto?: string; mensagem: string };
}): Promise<void> {
  if (opts.toEmails.length === 0) return;
  await sendPostmark({
    From: from(),
    To: opts.toEmails.join(','),
    ReplyTo: opts.lead.email,
    Subject: `[${opts.portalNome}] Novo contato do RI — ${opts.lead.assunto ?? 'Contato'}`,
    MessageStream: 'outbound',
    HtmlBody: `
<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto">
  <h2 style="color:#0B5B68;margin-bottom:4px">Novo contato — ${opts.portalNome}</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr><td style="padding:8px 0;color:#6F6F6F;width:120px">Nome</td><td><strong>${opts.lead.nome}</strong></td></tr>
    <tr><td style="padding:8px 0;color:#6F6F6F">E-mail</td><td><a href="mailto:${opts.lead.email}">${opts.lead.email}</a></td></tr>
    ${opts.lead.telefone ? `<tr><td style="padding:8px 0;color:#6F6F6F">Telefone</td><td>${opts.lead.telefone}</td></tr>` : ''}
    ${opts.lead.assunto ? `<tr><td style="padding:8px 0;color:#6F6F6F">Assunto</td><td>${opts.lead.assunto}</td></tr>` : ''}
  </table>
  <div style="margin-top:16px;padding:16px;background:#f9f9f9;border-radius:6px;font-size:14px;color:#141414;line-height:1.6">
    ${opts.lead.mensagem.replace(/\n/g, '<br>')}
  </div>
</div>`,
    TextBody: `Novo contato — ${opts.portalNome}\n\nNome: ${opts.lead.nome}\nE-mail: ${opts.lead.email}${opts.lead.telefone ? `\nTelefone: ${opts.lead.telefone}` : ''}${opts.lead.assunto ? `\nAssunto: ${opts.lead.assunto}` : ''}\n\n${opts.lead.mensagem}`,
  });
}

/**
 * Send a notification for a CMS-configured form submission (any field set —
 * "Fale com RI", "Mailing", or a custom formulário matéria).
 */
export async function sendFormSubmission(opts: {
  portalNome: string;
  formTitulo: string;
  toEmail: string;
  fields: { label: string; value: string }[];
  replyToEmail?: string;
}): Promise<void> {
  const rows = opts.fields
    .filter(f => f.value)
    .map(f => `<tr><td style="padding:8px 0;color:#6F6F6F;width:140px;vertical-align:top">${f.label}</td><td>${f.value.replace(/\n/g, '<br>')}</td></tr>`)
    .join('');
  const textRows = opts.fields.filter(f => f.value).map(f => `${f.label}: ${f.value}`).join('\n');

  await sendPostmark({
    From: from(),
    To: opts.toEmail,
    ...(opts.replyToEmail ? { ReplyTo: opts.replyToEmail } : {}),
    Subject: `[${opts.portalNome}] Novo envio — ${opts.formTitulo}`,
    MessageStream: 'outbound',
    HtmlBody: `
<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto">
  <h2 style="color:#0B5B68;margin-bottom:4px">Novo envio — ${opts.formTitulo}</h2>
  <p style="color:#949494;font-size:13px;margin-top:0">Portal ${opts.portalNome}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
</div>`,
    TextBody: `Novo envio — ${opts.formTitulo}\nPortal ${opts.portalNome}\n\n${textRows}`,
  });
}

/**
 * Send an ops alert (Auto CVM errors, provisioning failures, etc.).
 */
export async function sendCvmAlert(opts: {
  subject: string;
  body: string;
}): Promise<void> {
  const to = Deno.env.get('OPS_ALERT_EMAIL');
  if (!to) return; // non-fatal if not configured
  await sendPostmark({
    From: from(),
    To: to,
    Subject: `[Workr Lite Ops] ${opts.subject}`,
    MessageStream: 'outbound',
    HtmlBody: `<pre style="font-family:monospace;font-size:13px">${opts.body}</pre>`,
    TextBody: opts.body,
  });
}
