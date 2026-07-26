-- Scheduled publication for matérias, mirroring what portal_documents
-- already does. Until now NovaMateriaPage offered a date field but there
-- was nowhere to store it, so the choice was silently discarded and the
-- matéria published immediately.
alter table public.portal_materias
  add column if not exists schedule_at timestamptz;

-- The cron job below scans for due matérias every minute.
create index if not exists portal_materias_schedule_at_idx
  on public.portal_materias (schedule_at)
  where status = 'agendado';

create extension if not exists pg_cron with schema extensions;

-- Idempotent: re-running this migration must not fail on a duplicate name.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'auto-publish-scheduled-materias') then
    perform cron.unschedule('auto-publish-scheduled-materias');
  end if;
end $$;

select cron.schedule(
  'auto-publish-scheduled-materias',
  '* * * * *',
  $$update public.portal_materias
      set status = 'publicado', updated_at = now()
    where status = 'agendado' and schedule_at is not null and schedule_at <= now();$$
);
