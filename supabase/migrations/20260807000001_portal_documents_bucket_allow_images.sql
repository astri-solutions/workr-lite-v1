-- The portal-documents bucket's allowed_mime_types never included any
-- image/* type — fine for its original use (Documentos: PDF/Word/Excel/
-- PowerPoint), but AtendimentoPage.tsx also uploads screenshots to this same
-- bucket ("Anexe prints..."), and every one of those uploads was silently
-- rejected by Storage's mime allow-list. The client swallowed the error
-- (see AtendimentoPage.tsx fix in the same change), so a ticket just saved
-- with an empty anexos array and no indication anything had failed.
update storage.buckets
set allowed_mime_types = allowed_mime_types || array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif','image/svg+xml']
where id = 'portal-documents'
  and not (allowed_mime_types @> array['image/jpeg']);
