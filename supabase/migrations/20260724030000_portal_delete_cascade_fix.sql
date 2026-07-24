-- Deleting a portal failed with a foreign key violation because
-- portal_activity_log and portal_media were the only two of the ~12 tables
-- referencing portals(id) that weren't set to ON DELETE CASCADE (everything
-- else already cascades correctly) — delete-portal's single
-- `portals.delete()` call relies entirely on cascade, with no explicit
-- per-table cleanup, so these two silently blocked every deletion.
alter table public.portal_activity_log
  drop constraint portal_activity_log_portal_id_fkey,
  add constraint portal_activity_log_portal_id_fkey
    foreign key (portal_id) references public.portals(id) on delete cascade;

alter table public.portal_media
  drop constraint portal_media_portal_id_fkey,
  add constraint portal_media_portal_id_fkey
    foreign key (portal_id) references public.portals(id) on delete cascade;
