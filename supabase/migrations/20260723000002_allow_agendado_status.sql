-- The 'Agendado' document status (added alongside schedule_at wiring in the
-- admin) was rejected by this CHECK constraint, which only ever allowed
-- 'Publicado'/'Rascunho' — every scheduled-publish attempt failed silently
-- with "Falha ao salvar o documento".
alter table portal_documents drop constraint portal_documents_status_check;
alter table portal_documents add constraint portal_documents_status_check
  check (status = ANY (ARRAY['Publicado'::text, 'Rascunho'::text, 'Agendado'::text]));
