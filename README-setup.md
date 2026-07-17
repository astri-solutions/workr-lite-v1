# Workr Lite — Setup Guide

## 1. Supabase

Projeto: `mmhuwlpsgnvoxyuofliq` (workr-lite-v1) · Região: sa-east-1

### Onde obter as chaves
| Variável | Onde encontrar |
|---|---|
| `SUPABASE_URL` | Dashboard → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Dashboard → Settings → API → `anon public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard → Settings → API → `service_role` (**nunca expor no frontend**) |
| `DATABASE_URL` | Dashboard → Settings → Database → Connection string (Session mode) |

### Secrets das Edge Functions
Configure via CLI (uma vez por ambiente):
```bash
supabase secrets set \
  POSTMARK_TOKEN=<seu_token> \
  POSTMARK_FROM=noreply@astri.solutions \
  OPS_ALERT_EMAIL=projetos@astri.solutions \
  GITHUB_TOKEN=<ghp_...> \
  VERCEL_TOKEN=<vercel_token> \
  GITHUB_ORG=astri-solutions \
  SITE_URL=https://workr-lite-v1.vercel.app
```

Verificar secrets configurados:
```bash
supabase secrets list
```

### Migrações
As migrações estão em `supabase/migrations/`. Para aplicar num projeto limpo:
```bash
supabase db push
```

---

## 2. Postmark

### Criar conta e obter token
1. Acesse [account.postmarkapp.com](https://account.postmarkapp.com)
2. Crie um **Server** (ex: `workr-lite-prod`)
3. Vá em **API Tokens** → copie o **Server API Token**
4. Configure como secret: `supabase secrets set POSTMARK_TOKEN=<token>`

### Verificar domínio `astri.solutions`
1. No Postmark: **Sender Signatures** → **Add Domain** → `astri.solutions`
2. O Postmark exibirá registros DNS para adicionar no **Route 53** (AWS):

| Tipo | Nome | Valor |
|---|---|---|
| TXT | `resend._domainkey` (ou `pm._domainkey`) | Valor DKIM do Postmark |
| TXT | `@` | `v=spf1 include:spf.mtasv.net ~all` |
| CNAME | `pm-bounces` | `pm.mtasv.net` |

3. Aguardar propagação DNS (5–30 min) e clicar **Verify** no Postmark
4. Testar envio: **Message Streams → outbound → Send Test**

### Fluxos de e-mail implementados
| Função | Trigger | Descrição |
|---|---|---|
| `sendUserInvite` | `invite-portal-user` EF | Convite de admin com link gerado pelo Supabase Auth |
| `sendLeadAlert` | Formulário de contato (futuro) | Alerta para e-mail do portal sobre novo lead |
| `sendCvmAlert` | Auto CVM (futuro) | Alerta operacional para `OPS_ALERT_EMAIL` |

Módulo compartilhado: `supabase/functions/_shared/postmark.ts`

---

## 3. GitHub + Vercel (provision-portal)

### GitHub Token
1. github.com → Settings → Developer settings → Personal access tokens → Fine-grained
2. Permissões necessárias na org `astri-solutions`: **Contents** (read/write), **Administration** (read/write)
3. `supabase secrets set GITHUB_TOKEN=ghp_...`

### Vercel Token
1. vercel.com → Settings → Tokens → Create
2. Scope: `Full Account`
3. `supabase secrets set VERCEL_TOKEN=...`

Padrão de nomes gerados:
- Repo GitHub: `astri-solutions/workr-portal-{subdomain}`
- Projeto Vercel: `workr-portal-{subdomain}`
- URL: `https://workr-portal-{subdomain}.vercel.app`

---

## 4. Frontend (apps/web-admin)

Criar `apps/web-admin/.env.local` (ignorado pelo git):
```
VITE_SUPABASE_URL=https://mmhuwlpsgnvoxyuofliq.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Rodar localmente:
```bash
cd apps/web-admin
npm install
npm run dev
```
