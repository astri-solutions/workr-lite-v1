-- Groups per-locale files of the SAME logical document (e.g. "Apresentação
-- de Resultados 1T26" in pt-BR and its EN counterpart) so the admin UI can
-- show one row per document with per-locale file slots, instead of one row
-- per file. Nullable/no default: existing rows have no group and are shown
-- as their own single-locale document, identical to previous behavior.
alter table public.portal_resultado_arquivos
  add column if not exists grupo_id text;

create index if not exists portal_resultado_arquivos_grupo_id_idx
  on public.portal_resultado_arquivos (periodo_id, grupo_id);
