-- Periodic Auto CVM sync: until now, "check dados.cvm.gov.br for new
-- filings" (cvm-import-run in normal mode) only ever ran when an admin
-- manually clicked "Verificar agora"/"Importar histórico" in AutoCvmPage —
-- there was no scheduled trigger, so a portal nobody actively checks would
-- simply never pick up new CVM documents. This wires the same golden-rule
-- cron pattern already used by sync-template-all-portals (pg_net + the
-- service_role key already seeded in Vault by that migration) to call
-- cvm-import-run with { autoSyncAll: true } every 30 minutes, which iterates
-- every autoCvm-enabled empresa across every portal, auto-imports whatever
-- already has a routing rule, and raises/clears cvm_alerts for whatever
-- doesn't (see cvm-import-run/index.ts, runEntitySync).
--
-- Reuses the same 'service_role_key' Vault secret sync-template-all already
-- seeds — no separate bootstrap needed here.

create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'cvm-auto-sync-all') then
    perform cron.unschedule('cvm-auto-sync-all');
  end if;
end $$;

select cron.schedule(
  'cvm-auto-sync-all',
  '*/30 * * * *',
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
