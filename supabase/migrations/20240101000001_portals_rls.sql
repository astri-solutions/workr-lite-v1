-- Enable RLS on portals table
alter table if exists public.portals enable row level security;

-- super_admin: full access
create policy "super_admin_all_portals" on public.portals
  for all
  to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  )
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

-- client_user: read only their own portals (via app_metadata.portalIds)
create policy "client_user_read_own_portals" on public.portals
  for select
  to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'client_user'
    and id::text = any(
      array(
        select jsonb_array_elements_text(
          coalesce(auth.jwt() -> 'app_metadata' -> 'portalIds', '[]'::jsonb)
        )
      )
    )
  );
