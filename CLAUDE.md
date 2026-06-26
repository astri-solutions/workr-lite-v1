# Workr Lite CMS — CLAUDE.md

CMS multi-tenant de Relações com Investidores (RI) para empresas CVM Categoria B / Pré-IPO. Marca **Astri**.

## Stack

- **Frontend:** React + TypeScript + Vite (`apps/web-admin/`)
- **Backend:** Go — API REST + Auth + SSG + Ingestor CVM (`services/`) — *não implementado ainda*
- **Banco:** PostgreSQL puro self-hosted — *não implementado ainda*
- **Deploy:** Vercel (frontend) + VPS Hostinger (backend/banco) — *backend pendente*

## Estrutura do monorepo

```
/apps/web-admin        React+TS: Painel Admin (SPA)
/apps/web-public       Templates sites públicos (SSG) — pendente
/services/api          Go: API REST + Auth JWT — pendente
/services/ssg          Go: gerador estático — pendente
/services/ingestor     Go: Auto CVM — pendente
/db/migrations         SQL 0001..0019 — pendente
/infra                 Nginx, systemd, config Azion — pendente
/shared                Contrato de API compartilhado — pendente
```

## Identidade visual

- Verde `#00D865` (destaque — não usar como texto sobre branco)
- Teal `#0B5B68` (links/ações/primary)
- Escuro `#141414`
- Neutros `#6F6F6F` / `#949494` / `#B8B8B8`
- Fundos `#F4F4F4` / `#FAFAFA`
- Fontes: **Plus Jakarta Sans** (títulos) + **Inter** (corpo)

## Auth (fase atual — sem banco)

Credencial hardcoded em `AuthContext.tsx`:
- Email: `admin@astri.solutions`
- Senha: `workr2025`

Substituir por API Go com JWT quando o backend estiver pronto.

## Regras fundamentais (não alterar sem revisão)

- Tenant resolvido pelo **domínio** (não path)
- Público **estático** (SSG) — sem banco no acesso público
- Frontend **nunca** fala direto com o banco
- Seletor de empresa **adaptativo junto ao conteúdo** (oculta ≤1, cards 2–4, dropdown >4)
- Auto CVM: apenas regulatório, por CNPJ, CAPTCHA nunca contornado
- Central de Resultados: **sempre manual**

## Próximos passos (roadmap)

1. ~~Tela de login + shell do painel~~ ✅
2. API Go MVP (auth JWT, CRUD entidades/coleções/documentos)
3. Painel React: Documentos, Central de Resultados
4. SSG MVP + deploy estático
5. Auto CVM (ingestor)
6. Editor por blocos (`content_blocks` 0020)
7. Multi-domínio + SSL
