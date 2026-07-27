-- Regra de ouro: correções e melhorias de sistema devem alcançar todo portal
-- já criado, automaticamente, sem depender de ninguém clicar em nada. Esta
-- migration liga o "piloto automático": um pg_cron job chama a Edge Function
-- sync-template-all a cada 15 minutos, autenticado com a própria service_role
-- key (lida do Vault, nunca gravada em texto puro aqui ou em código).
--
-- Bootstrap: o segredo só existe no Vault depois que sync-template-all rodar
-- pelo menos uma vez com sucesso (ela mesma se auto-registra lá, veja
-- seed_service_role_vault_secret). Até esse primeiro run, o cron chama a
-- função sem Authorization válido e recebe 401 — inofensivo, só não faz
-- nada, e passa a funcionar sozinho assim que alguém rodar a sincronização
-- uma vez (manualmente pelo botão, ou automaticamente no próximo tick depois
-- que o segredo estiver salvo).

create extension if not exists pg_net;

-- SECURITY DEFINER: só assim uma chamada feita com a anon key (o que o
-- browser do super_admin usa para chegar até aqui via Supabase client) tem
-- permissão de escrever em vault.secrets, que por padrão só é gravável por
-- superusuário/owner. A função só faz uma coisa (upsert de UM segredo com
-- nome fixo) — não é um vetor genérico de escrita em Vault.
create or replace function public.seed_service_role_vault_secret(p_secret text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  existing_id uuid;
begin
  select id into existing_id from vault.secrets where name = 'service_role_key';
  if existing_id is null then
    perform vault.create_secret(p_secret, 'service_role_key', 'Usado pelo pg_cron para chamar sync-template-all automaticamente (regra de ouro).');
  else
    perform vault.update_secret(existing_id, p_secret);
  end if;
end;
$$;

revoke all on function public.seed_service_role_vault_secret(text) from public;
grant execute on function public.seed_service_role_vault_secret(text) to service_role;

select cron.schedule(
  'sync-template-all-portals',
  '*/15 * * * *',
  $cron$
  select net.http_post(
    url := 'https://mmhuwlpsgnvoxyuofliq.supabase.co/functions/v1/sync-template-all',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
    ),
    body := '{}'::jsonb
  );
  $cron$
);
