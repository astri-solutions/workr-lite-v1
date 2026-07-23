-- Auto-publish documents whose scheduled date/time has arrived.
-- portal_documents.schedule_at already existed but was never wired to
-- anything: the admin form set status straight to 'Publicado' regardless of
-- the chosen schedule. This job, paired with the frontend now writing
-- status = 'Agendado' + schedule_at, is what actually defers publication.
create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'auto-publish-scheduled-documents',
  '* * * * *',
  $$update public.portal_documents set status = 'Publicado', updated_at = now() where status = 'Agendado' and schedule_at <= now();$$
);
