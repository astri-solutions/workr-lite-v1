-- Which pages of a portal actually have published content. The site uses
-- this to hide empty channels from the navbar (and 404 their pages)
-- instead of showing an "Em construção" placeholder.
--
-- One round trip rather than three separate REST queries, because this
-- runs on the critical path before the nav can be rendered.
--
-- security definer: it only ever returns page identifiers, which are
-- already public in the site's own site.config.js — no content leaks —
-- and this way it doesn't depend on each table's anon-read policies
-- lining up.
create or replace function public.portal_content_index(p_portal_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'pageIds', coalesce((
      select jsonb_agg(distinct pid)
      from (
        select page_id as pid
          from portal_materias
         where portal_id = p_portal_id
           and status = 'publicado'
        union all
        select unnest(pagina_ids) as pid
          from portal_documents
         where portal_id = p_portal_id
           and status = 'Publicado'
      ) t
      where pid is not null and pid <> ''
    ), '[]'::jsonb),
    -- Resultados aren't tied to a page id: they render on whichever page
    -- is typed as a results page, so the client pairs this flag with the
    -- channel's own pageType.
    'hasResultados', exists(
      select 1
        from portal_resultado_periodos
       where portal_id = p_portal_id
         and status = 'Publicado'
    )
  );
$$;

grant execute on function public.portal_content_index(uuid) to anon, authenticated;
