-- Support tickets ("Atendimento") were only ever emailed via Postmark and
-- stashed in the requester's own portal_config.interacoes jsonb blob — never
-- written to a real, cross-portal-queryable table. That made a Super Admin
-- inbox impossible: there was nothing to read across portals. This table is
-- the missing persisted ticket store.
create table if not exists public.portal_atendimentos (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.portals(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  requester_nome text,
  requester_email text,
  assunto text,
  prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta')),
  titulo text not null,
  mensagem text not null,
  -- Storage paths in the private portal-documents bucket (same pattern
  -- submit-atendimento already used before this table existed) — signed
  -- into temporary links on read, same as DocumentosPage does.
  anexos jsonb not null default '[]'::jsonb,
  status text not null default 'novo' check (status in ('novo', 'resolvido')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

create index if not exists portal_atendimentos_portal_id_idx on public.portal_atendimentos (portal_id);
create index if not exists portal_atendimentos_status_idx on public.portal_atendimentos (status);

alter table public.portal_atendimentos enable row level security;

-- Point of attention from the request: a ticket must be visible ONLY to the
-- specific super_admin assigned as that portal's suporte_user_id (set in
-- Painel de Controle) — not to every super_admin. A portal with no assignee
-- yet simply has no viewer until one is set, matching how submit-atendimento
-- already routes the notification e-mail to that same suporte_user_id/email.
create policy "atendimento_select_assigned_super_admin"
  on public.portal_atendimentos for select
  using (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
    and exists (
      select 1 from public.portals p
      where p.id = portal_atendimentos.portal_id
        and p.suporte_user_id = auth.uid()
    )
  );

create policy "atendimento_update_assigned_super_admin"
  on public.portal_atendimentos for update
  using (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
    and exists (
      select 1 from public.portals p
      where p.id = portal_atendimentos.portal_id
        and p.suporte_user_id = auth.uid()
    )
  );

-- Inserts happen exclusively from submit-atendimento (service role, bypasses
-- RLS) — no insert policy is needed for any client-side role.
