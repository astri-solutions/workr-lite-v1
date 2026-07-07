# Workr Lite — Arquitetura de Backend

> Documento de referência para o desenvolvedor back-end.  
> Versão: 1.0 — Julho 2026

---

## 1. Visão Geral

O Workr Lite é um **CMS multi-tenant para Relações com Investidores (RI)** da Astri Solutions.  
Cada cliente (tenant) tem um portal RI customizado, gerenciado por este painel admin.

```
┌─────────────────────────────────────────────────────────┐
│  VPS Hostinger (Linux Ubuntu 22.04 LTS)                 │
│                                                          │
│  ┌──────────┐    ┌───────────┐    ┌─────────────────┐  │
│  │  Nginx   │───▶│  React    │    │   Go API        │  │
│  │  Proxy   │    │  (Admin)  │    │   :8080         │  │
│  │  :80/443 │───▶│  :3000    │    │                 │  │
│  └──────────┘    └───────────┘    └────────┬────────┘  │
│        │                                    │           │
│        └───────────── /api/* ──────────────▶│           │
│                                             │           │
│                                   ┌─────────▼────────┐  │
│                                   │   PostgreSQL 16  │  │
│                                   │   :5432          │  │
│                                   └──────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Stack

| Camada       | Tecnologia                    | Versão recomendada |
|--------------|-------------------------------|-------------------|
| Frontend     | React + TypeScript + Vite     | React 18          |
| Backend      | Go                            | 1.23+             |
| Banco        | PostgreSQL                    | 16                |
| Proxy        | Nginx                         | 1.25              |
| Email        | Postmark (transacional)       | HTTP API v1       |
| SSL          | Let's Encrypt + Certbot       | —                 |
| Container    | Docker + Docker Compose       | Compose v2        |
| VPS          | Hostinger VPS (Linux)         | Ubuntu 22.04 LTS  |

---

## 3. Modelo de Dados (entidades principais)

### 3.1 Multi-tenancy

O sistema é **multi-tenant por schema ou por coluna** (decisão do back-end).  
Recomendação: coluna `tenant_id` em todas as tabelas (mais simples no PostgreSQL).

```
tenants (portais)
  └── empresas          (entidades/fundos do portal)
        └── documentos
        └── midias
        └── resultados (central de resultados)
  └── usuarios_portal
  └── canais (nav tree)
  └── configuracoes (layout, cores, fontes, banner, etc.)
```

### 3.2 Tabelas esperadas

```sql
-- Tenants (portais de RI)
tenants
  id            UUID PK DEFAULT uuid_generate_v4()
  slug          TEXT UNIQUE NOT NULL          -- ex: "imc", "aurora"
  nome          TEXT NOT NULL
  dominio       TEXT                          -- portal público
  modelo        TEXT NOT NULL                -- 'sidebar' | 'tabmenu' | 'banner'
  ativo         BOOLEAN DEFAULT true
  criado_em     TIMESTAMPTZ DEFAULT now()
  atualizado_em TIMESTAMPTZ DEFAULT now()

-- Usuários do sistema (admin panel)
usuarios
  id            UUID PK
  email         TEXT UNIQUE NOT NULL
  nome          TEXT NOT NULL
  senha_hash    TEXT NOT NULL               -- bcrypt
  role          TEXT NOT NULL              -- 'super_admin' | 'admin' | 'editor' | 'viewer' | 'client_user'
  tenant_id     UUID FK → tenants(id)      -- NULL para super_admin
  ativo         BOOLEAN DEFAULT true
  criado_em     TIMESTAMPTZ DEFAULT now()

-- Empresas/Fundos dentro de um portal
empresas
  id            UUID PK
  tenant_id     UUID FK → tenants(id) NOT NULL
  nome          TEXT NOT NULL
  tipo          TEXT NOT NULL              -- 'EMPRESA' | 'FUNDO' | 'OUTRO'
  cnpj          TEXT
  cvm_codigo    TEXT                       -- código CVM para Auto CVM
  auto_cvm      BOOLEAN DEFAULT false
  importar_desde DATE
  ativo         BOOLEAN DEFAULT true
  principal     BOOLEAN DEFAULT false      -- empresa principal do portal
  criado_em     TIMESTAMPTZ DEFAULT now()

-- Documentos
documentos
  id            UUID PK
  tenant_id     UUID FK → tenants(id)
  empresa_id    UUID FK → empresas(id)
  titulo        JSONB NOT NULL             -- {"pt-BR": "...", "en": "...", "es": "..."}
  tipo          TEXT                       -- 'Fatos Relevantes' | 'Relatórios' | etc.
  status        TEXT DEFAULT 'draft'       -- 'draft' | 'published'
  paginas       TEXT[]                     -- páginas do portal onde aparece
  idiomas       TEXT[]                     -- ['pt-BR', 'en', 'es']
  arquivo_url   TEXT                       -- URL do arquivo (storage)
  link_externo  TEXT                       -- se for link externo (não upload)
  from_cvm      BOOLEAN DEFAULT false
  publicado_por UUID FK → usuarios(id)
  publicado_em  TIMESTAMPTZ
  editado_por   UUID FK → usuarios(id)
  editado_em    TIMESTAMPTZ
  agendado_em   TIMESTAMPTZ                -- publicação agendada
  criado_em     TIMESTAMPTZ DEFAULT now()

-- Mídias (imagens, vídeos, docs genéricos)
midias
  id            UUID PK
  tenant_id     UUID FK → tenants(id)
  empresa_id    UUID FK → empresas(id)
  nome          TEXT NOT NULL
  tipo          TEXT                       -- 'image' | 'video' | 'document'
  mime_type     TEXT
  arquivo_url   TEXT NOT NULL
  tamanho_bytes BIGINT
  largura       INT
  altura        INT
  alt           TEXT
  titulo        TEXT
  legenda       TEXT
  descricao     TEXT
  link          TEXT
  tags          TEXT[]
  criado_por    UUID FK → usuarios(id)
  criado_em     TIMESTAMPTZ DEFAULT now()

-- Central de Resultados (trimestres/períodos)
resultados_periodos
  id            UUID PK
  tenant_id     UUID FK → tenants(id)
  empresa_id    UUID FK → empresas(id)
  periodo       TEXT NOT NULL              -- ex: '2T25', '4T24', 'Anual 2024'
  tipo_periodo  TEXT NOT NULL             -- 'trimestral' | 'anual'
  exibir_home   BOOLEAN DEFAULT false
  status        TEXT DEFAULT 'draft'
  criado_em     TIMESTAMPTZ DEFAULT now()

resultados_documentos
  id            UUID PK
  periodo_id    UUID FK → resultados_periodos(id)
  tenant_id     UUID FK → tenants(id)
  nome          TEXT NOT NULL
  tipo          TEXT                       -- 'earnings' | 'apresentacao' | 'dfp' | etc.
  arquivo_url   TEXT
  idioma        TEXT DEFAULT 'pt-BR'
  status        TEXT DEFAULT 'draft'
  ordem         INT DEFAULT 0

-- Canais (nav tree do portal)
canais
  id            UUID PK
  tenant_id     UUID FK → tenants(id)
  parent_id     UUID FK → canais(id)      -- NULL = raiz
  nome          JSONB                      -- multilíngue
  slug          TEXT
  ativo         BOOLEAN DEFAULT true
  ordem         INT DEFAULT 0

-- Configurações do portal (layout, cores, fontes, etc.)
portal_config
  id            UUID PK
  tenant_id     UUID FK → tenants(id) UNIQUE
  cores         JSONB                      -- paleta customizada
  fontes        JSONB                      -- famílias tipográficas
  layout        JSONB                      -- configurações de layout
  banner        JSONB                      -- banner hero
  logotipo_url  TEXT
  favicon_url   TEXT
  footer        JSONB
  atualizado_em TIMESTAMPTZ DEFAULT now()

-- Eventos do Calendário
calendario_eventos
  id            UUID PK
  tenant_id     UUID FK → tenants(id)
  titulo        JSONB
  data          DATE NOT NULL
  hora          TIME
  tipo          TEXT
  status        TEXT DEFAULT 'draft'
  exibir_home   BOOLEAN DEFAULT false
  criado_em     TIMESTAMPTZ DEFAULT now()

-- Matérias (press releases, conteúdo editorial)
materias
  id            UUID PK
  tenant_id     UUID FK → tenants(id)
  titulo        JSONB
  conteudo      JSONB                      -- rich text por idioma
  status        TEXT DEFAULT 'draft'
  destaque      BOOLEAN DEFAULT false
  imagem_url    TEXT
  publicado_em  TIMESTAMPTZ
  criado_em     TIMESTAMPTZ DEFAULT now()

-- Interações (contato, newsletter)
interacoes
  id            UUID PK
  tenant_id     UUID FK → tenants(id)
  tipo          TEXT                       -- 'contato' | 'newsletter' | 'mailing'
  nome          TEXT
  email         TEXT
  telefone      TEXT
  mensagem      TEXT
  status        TEXT DEFAULT 'novo'        -- 'novo' | 'lido' | 'respondido'
  criado_em     TIMESTAMPTZ DEFAULT now()
```

---

## 4. API REST — Endpoints esperados

O frontend consome uma API REST com prefixo `/api/v1/`.  
Autenticação via **JWT Bearer token** no header `Authorization`.

### 4.1 Auth
```
POST   /api/v1/auth/login          — email + senha → JWT
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me
PUT    /api/v1/auth/me/password
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
```

### 4.2 Tenants (portais)
```
GET    /api/v1/tenants             — super_admin only
POST   /api/v1/tenants
GET    /api/v1/tenants/:id
PUT    /api/v1/tenants/:id
DELETE /api/v1/tenants/:id
```

### 4.3 Empresas
```
GET    /api/v1/empresas                         — lista do tenant ativo
POST   /api/v1/empresas
GET    /api/v1/empresas/:id
PUT    /api/v1/empresas/:id
DELETE /api/v1/empresas/:id
POST   /api/v1/empresas/:id/toggle-ativo
POST   /api/v1/empresas/:id/migrar-documentos  — migra docs para outra empresa
```

### 4.4 Documentos
```
GET    /api/v1/documentos
POST   /api/v1/documentos
GET    /api/v1/documentos/:id
PUT    /api/v1/documentos/:id
DELETE /api/v1/documentos/:id
POST   /api/v1/documentos/:id/publicar
POST   /api/v1/documentos/:id/despublicar
POST   /api/v1/documentos/bulk-publicar
POST   /api/v1/documentos/bulk-despublicar
POST   /api/v1/documentos/bulk-excluir
```

### 4.5 Mídias
```
GET    /api/v1/midias
POST   /api/v1/midias          — multipart/form-data upload
PUT    /api/v1/midias/:id
DELETE /api/v1/midias/:id
```

### 4.6 Central de Resultados
```
GET    /api/v1/resultados
POST   /api/v1/resultados/periodos
PUT    /api/v1/resultados/periodos/:id
DELETE /api/v1/resultados/periodos/:id
POST   /api/v1/resultados/periodos/:id/documentos   — adicionar arquivo
PUT    /api/v1/resultados/documentos/:id
DELETE /api/v1/resultados/documentos/:id
```

### 4.7 Usuários do portal
```
GET    /api/v1/usuarios
POST   /api/v1/usuarios
PUT    /api/v1/usuarios/:id
DELETE /api/v1/usuarios/:id
POST   /api/v1/usuarios/:id/toggle-ativo
POST   /api/v1/usuarios/invite                — envio por email (Postmark)
```

### 4.8 Auto CVM
```
GET    /api/v1/cvm/empresas                   — empresas com código CVM
POST   /api/v1/cvm/sync/:empresa_id           — força sync manual
GET    /api/v1/cvm/documentos                 — docs importados
```

### 4.9 Configurações do portal
```
GET    /api/v1/config
PUT    /api/v1/config/cores
PUT    /api/v1/config/fontes
PUT    /api/v1/config/layout
PUT    /api/v1/config/banner
POST   /api/v1/config/logotipo                — upload
POST   /api/v1/config/favicon                 — upload
PUT    /api/v1/config/footer
```

### 4.10 Canais
```
GET    /api/v1/canais
PUT    /api/v1/canais                         — salva árvore completa (reorder + toggle)
```

### 4.11 Outros
```
GET    /api/v1/calendario
POST   /api/v1/calendario
PUT    /api/v1/calendario/:id
DELETE /api/v1/calendario/:id

GET    /api/v1/materias
POST   /api/v1/materias
PUT    /api/v1/materias/:id
DELETE /api/v1/materias/:id

GET    /api/v1/interacoes
PUT    /api/v1/interacoes/:id/status
DELETE /api/v1/interacoes/:id

GET    /healthz                               — health check (sem auth)
```

---

## 5. Autenticação e Permissões

### Roles
| Role          | Acesso                                                        |
|---------------|---------------------------------------------------------------|
| `super_admin` | Tudo — gerencia todos os tenants, usuários, configurações     |
| `admin`       | Tenant específico — tudo exceto excluir tenant                |
| `editor`      | Criar/editar documentos e mídias; não pode excluir            |
| `viewer`      | Somente leitura                                               |
| `client_user` | Mesmas permissões que admin no tenant vinculado               |

### JWT Claims esperados
```json
{
  "sub": "uuid-do-usuario",
  "email": "user@domain.com",
  "role": "client_user",
  "tenant_id": "uuid-do-tenant",
  "portais": [{"id": "uuid", "nome": "Nome do Portal"}],
  "active_portal_id": "uuid-do-portal-ativo",
  "exp": 1234567890
}
```

---

## 6. Email (Postmark)

Usar a API HTTP do Postmark para emails transacionais.

### Templates necessários
| Template             | Trigger                                      |
|----------------------|----------------------------------------------|
| `user-invite`        | Convite de novo usuário (com link de acesso) |
| `reset-password`     | Recuperação de senha                         |
| `document-published` | Notificação de novo documento (opcional)     |
| `welcome`            | Boas-vindas após primeiro acesso             |

### Variáveis de ambiente necessárias
```
POSTMARK_SERVER_TOKEN  — token do servidor Postmark
POSTMARK_FROM_EMAIL    — remetente verificado no Postmark
POSTMARK_FROM_NAME     — nome exibido no remetente
```

---

## 7. Storage de arquivos

### Opção A — Local (mais simples, recomendado para início)
- Arquivos salvos em `/app/uploads` dentro do container
- Montado como volume Docker `uploads_data`
- Nginx serve `/uploads/` diretamente

### Opção B — S3 (recomendado para escala)
- Compatível com AWS S3, Cloudflare R2 (mais barato), Wasabi
- Variáveis: `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_ENDPOINT`

### Tipos de arquivo aceitos
- Documentos: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ZIP
- Mídias: JPG, PNG, GIF, SVG, WebP, MP4, MP3
- Tamanho máximo: 50 MB (configurável no Nginx e API)

---

## 8. Auto CVM

Importação automática de documentos da CVM (dados abertos).

### Fonte de dados
- API CVM: `https://dados.cvm.gov.br/api/dados/`
- Documentos por CNPJ/código CVM

### Fluxo
1. Cron job (Go) roda diariamente às 06h e 18h
2. Busca documentos novos por empresa com `auto_cvm = true`
3. Faz download do arquivo e salva no storage
4. Cria registro em `documentos` com `from_cvm = true`
5. Notifica via Postmark (opcional) se configurado

---

## 9. VPS — Configuração Hostinger

### Especificações mínimas recomendadas
| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| CPU     | 2 vCPU | 4 vCPU      |
| RAM     | 4 GB   | 8 GB        |
| Disco   | 40 GB SSD | 80 GB SSD |
| OS      | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### Portas a abrir no firewall
```
22    — SSH (restringir a IP fixo se possível)
80    — HTTP (redirect para HTTPS)
443   — HTTPS
5432  — PostgreSQL (somente entre containers, não expor externamente)
```

### Domínios necessários
```
DOMAIN.com.br            — portal público do cliente (future)
admin.DOMAIN.com.br      — painel admin (React)
api.DOMAIN.com.br        — API Go (opcional, pode usar /api/ no mesmo domínio)
```

---

## 10. Como iniciar o ambiente

```bash
# 1. Clonar o repositório
git clone https://github.com/astri-solutions/workr-lite-v1.git
cd workr-lite-v1

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com as credenciais reais

# 3. Subir todos os serviços
docker compose up -d

# 4. Verificar status
docker compose ps
docker compose logs api
docker compose logs db

# 5. Acessar
# Painel admin:  http://localhost:3000
# API:           http://localhost:8080
# PostgreSQL:    localhost:5432
```

### Comandos úteis
```bash
# Rebuild após mudanças
docker compose build api
docker compose up -d api

# Ver logs em tempo real
docker compose logs -f api

# Acessar o banco
docker compose exec db psql -U workr -d workrlite

# Backup do banco
docker compose exec db pg_dump -U workr workrlite > backup.sql

# Renovar SSL (já automatizado pelo certbot, mas pode forçar)
docker compose exec certbot certbot renew --force-renewal
```

---

## 11. Estrutura de pastas do projeto

```
workr-lite-v1/
├── apps/
│   ├── api/                     # Go API (a criar)
│   │   ├── cmd/api/main.go      # entrypoint
│   │   ├── internal/
│   │   │   ├── auth/            # JWT, middleware
│   │   │   ├── handlers/        # HTTP handlers por recurso
│   │   │   ├── models/          # structs do banco
│   │   │   ├── services/        # lógica de negócio
│   │   │   ├── repository/      # queries SQL
│   │   │   └── email/           # integração Postmark
│   │   ├── migrations/          # arquivos SQL numerados
│   │   ├── Dockerfile
│   │   ├── go.mod
│   │   └── go.sum
│   │
│   └── web-admin/               # React SPA (existente)
│       ├── src/
│       ├── nginx/default.conf
│       ├── Dockerfile
│       └── package.json
│
├── docker/
│   ├── nginx/
│   │   ├── nginx.conf
│   │   └── conf.d/workr.conf
│   └── postgres/
│       └── init.sql
│
├── docker-compose.yml
├── .env.example
├── ARCHITECTURE.md              # este arquivo
└── CLAUDE.md
```

---

## 12. Checklist para o back-end

- [ ] Criar estrutura Go (`cmd/api`, `internal/`, `migrations/`)
- [ ] Configurar banco (migrations com golang-migrate)
- [ ] Implementar auth (login, JWT, refresh, logout)
- [ ] CRUD de tenants e usuários
- [ ] CRUD de empresas com fluxo de ativar/desativar e migrar
- [ ] Upload de documentos (arquivo + link externo)
- [ ] Upload de mídias (imagem/vídeo)
- [ ] Central de resultados (períodos + documentos)
- [ ] Auto CVM (cron + integração dados.cvm.gov.br)
- [ ] Integração Postmark (invite, reset-password)
- [ ] Configurar SSL via Certbot no VPS
- [ ] Substituir `DOMAIN.com.br` em `docker/nginx/conf.d/workr.conf`
- [ ] Ajustar `CORS_ORIGINS` no `.env` para os domínios reais
