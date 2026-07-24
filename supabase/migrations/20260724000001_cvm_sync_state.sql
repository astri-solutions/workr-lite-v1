-- cvm_sync_state: Auto CVM operational data, one row per (portal, empresa).
--
-- Company identity (nome, cnpj, cvmCodigo, autoCvm, importarDesde) already
-- lives in portal_config.empresas — this table does NOT duplicate that.
-- It only holds what's specific to the CVM sync process itself: where
-- imported documents get routed in the real canal/subcanal tree, and the
-- last sync's timestamps/result.
create table if not exists public.cvm_sync_state (
  id            uuid primary key default gen_random_uuid(),
  portal_id     uuid not null references public.portals(id) on delete cascade,
  empresa_id    text not null, -- matches an id in portal_config.empresas[]
  status        text not null default 'ativo'
                  check (status in ('ativo', 'pausado', 'erro')),
  -- Array of { cvmCategoryId, cvmCategoryLabel, canalId, subCanalId, subSubCanalId }
  -- mapping a CVM document category to a real node in the canal tree.
  routing       jsonb not null default '[]'::jsonb,
  ultima_sync   timestamptz,
  proxima_sync  timestamptz,
  -- { documentsFound, documentsImported, errors[] } from the most recent sync
  last_sync_result jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (portal_id, empresa_id)
);

create trigger cvm_sync_state_updated_at
  before update on public.cvm_sync_state
  for each row execute function public.set_updated_at();

alter table public.cvm_sync_state enable row level security;

create policy "super_admin_all_cvm_sync_state" on public.cvm_sync_state
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

create policy "client_user_own_cvm_sync_state" on public.cvm_sync_state
  for all to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'client_user'
    and portal_id::text = any(
      array(select jsonb_array_elements_text(
        coalesce(auth.jwt() -> 'app_metadata' -> 'portalIds', '[]'::jsonb)
      ))
    )
  )
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'client_user'
    and portal_id::text = any(
      array(select jsonb_array_elements_text(
        coalesce(auth.jwt() -> 'app_metadata' -> 'portalIds', '[]'::jsonb)
      ))
    )
  );
