-- Auto CVM was scanning every 30 minutes (cvm-auto-sync-all, set up in
-- 20260729000002_cvm_auto_sync_cron.sql) — tighten to every 5 minutes so
-- newly filed CVM documents show up in each portal's Documentos CVM sooner.
-- Same job name/function/auth — only the schedule changes.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'cvm-auto-sync-all') then
    perform cron.unschedule('cvm-auto-sync-all');
  end if;
end $$;

select cron.schedule(
  'cvm-auto-sync-all',
  '*/5 * * * *',
  $cron$
  select net.http_post(
    url := 'https://mmhuwlpsgnvoxyuofliq.supabase.co/functions/v1/cvm-import-run',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
    ),
    body := '{"autoSyncAll": true}'::jsonb
  );
  $cron$
);
