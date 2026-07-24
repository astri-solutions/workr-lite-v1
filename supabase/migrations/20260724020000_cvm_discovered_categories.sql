-- CVM's real category taxonomy is much larger than the fixed list of ~16
-- categories hand-picked in AutoCvmPage.tsx (CVM_ROUTABLE_CATEGORIES) — every
-- real test surfaces new ones ("Calendário de Eventos Corporativos", "Dados
-- Econômico-Financeiros", "Relatório de Sustentabilidade", ...). Rather than
-- keep whack-a-moling one category at a time in code, cvm-import-run now
-- records every distinct category it actually encounters for an entity here,
-- and the routing UI lists this union with the static list so an admin can
-- configure a destination for ANY real category without a new deploy.
alter table public.cvm_sync_state
  add column if not exists discovered_categories jsonb not null default '[]'::jsonb;
