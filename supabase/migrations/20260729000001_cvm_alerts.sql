-- cvm_alerts: user-facing notification queue for Auto CVM categories that
-- have no routing rule yet (or whose rule's target page no longer exists).
-- cvm-import-run writes/updates a row here every time it finds a document
-- in a category with no valid destination page — the topbar bell
-- (AlertsBell.tsx) polls unresolved rows so an admin finds out a new
-- category needs a page without having to remember to open Auto CVM and
-- scroll through "Destinos de importação" on their own. Resolved as soon as
-- a routing rule points at a real page, checked at the start of every sync
-- (so a routing-only fix, with no new documents that run, still clears it).
create table if not exists public.cvm_alerts (
  id                  uuid primary key default gen_random_uuid(),
  portal_id           uuid not null references public.portals(id) on delete cascade,
  empresa_id          text not null, -- matches an id in portal_config.empresas[]
  cvm_category_id     text not null,
  cvm_category_label  text not null,
  created_at          timestamptz not null default now(),
  resolved_at         timestamptz,
  unique (portal_id, empresa_id, cvm_category_id)
);

create index if not exists cvm_alerts_unresolved_idx
  on public.cvm_alerts (portal_id)
  where resolved_at is null;

alter table public.cvm_alerts enable row level security;

-- Auto CVM is a super_admin-only feature (Portal client_users never see the
-- routing UI it links to), so only that role needs access to the alerts.
create policy "super_admin_all_cvm_alerts" on public.cvm_alerts
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');
