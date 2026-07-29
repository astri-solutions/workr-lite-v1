-- Per-document (not per-período) fields, mirroring portal_documents:
-- pt_only marks a document as Portuguese-only (same file for every idioma);
-- data_publicacao/schedule_at let a Central de Resultados document be
-- backdated or scheduled just like a Documentos entry. Redundant across a
-- document's own per-locale rows (every locale sibling carries the same
-- value) — same reasoning as nome/tipo/status already being shared there.
alter table public.portal_resultado_arquivos
  add column if not exists pt_only boolean not null default false,
  add column if not exists data_publicacao timestamptz,
  add column if not exists schedule_at timestamptz;

create index if not exists portal_resultado_arquivos_schedule_idx
  on public.portal_resultado_arquivos (schedule_at)
  where status = 'Agendado';

create extension if not exists pg_cron with schema extensions;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'auto-publish-scheduled-resultado-arquivos') then
    perform cron.unschedule('auto-publish-scheduled-resultado-arquivos');
  end if;
end $$;

select cron.schedule(
  'auto-publish-scheduled-resultado-arquivos',
  '* * * * *',
  $$update public.portal_resultado_arquivos set status = 'Publicado', updated_at = now() where status = 'Agendado' and schedule_at is not null and schedule_at <= now();$$
);
