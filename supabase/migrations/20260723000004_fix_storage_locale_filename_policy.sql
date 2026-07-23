-- Documents now store one file per locale, named "{doc.id}-{locale}.{ext}"
-- instead of "{doc.id}.{ext}". This anon read policy compared the filename
-- (before the first dot) to the document id for an EXACT match, so it never
-- matched the new locale-suffixed names — breaking public read access to
-- every per-locale document file. Match by prefix instead, which covers
-- both the old and new naming.
drop policy if exists anon_read_published_portal_documents_storage on storage.objects;
create policy anon_read_published_portal_documents_storage on storage.objects
for select
using (
  bucket_id = 'portal-documents'
  and exists (
    select 1 from portal_documents pd
    where storage.filename(objects.name) like (pd.id::text || '%')
      and pd.status = 'Publicado'
  )
);
