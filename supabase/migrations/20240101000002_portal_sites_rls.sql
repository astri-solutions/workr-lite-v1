-- Enable RLS on portal_sites table
alter table if exists public.portal_sites enable row level security;

-- super_admin: full access
create policy "super_admin_all_portal_sites" on public.portal_sites
  for all
  to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  )
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

-- client_user: read only sites belonging to their portals
create policy "client_user_read_own_portal_sites" on public.portal_sites
  for select
  to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'client_user'
    and portal_id::text = any(
      array(
        select jsonb_array_elements_text(
          coalesce(auth.jwt() -> 'app_metadata' -> 'portalIds', '[]'::jsonb)
        )
      )
    )
  );
