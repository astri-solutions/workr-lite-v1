-- ─── Workr Lite — PostgreSQL Bootstrap ───────────────────────────────────────
-- Este script é executado uma única vez na primeira inicialização do container.
-- Migrations reais (via golang-migrate) criarão as tabelas no schema abaixo.

-- Habilita extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- busca full-text com trigrams
CREATE EXTENSION IF NOT EXISTS "unaccent"; -- busca sem acentos

-- Schema isolado por produto (opcional, pode usar public)
CREATE SCHEMA IF NOT EXISTS workr;
