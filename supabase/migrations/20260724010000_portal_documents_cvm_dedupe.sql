-- Auto CVM real import needs two things portal_documents didn't have yet:
--
-- 1. data_publicacao: the document's REAL publication date as filed with the
--    CVM (Data_Entrega in the IPE dataset). Without this, imported documents
--    would show today's date (created_at, which is just "when this row was
--    inserted") instead of the date it was actually published — misleading
--    on the site and breaking the "ano" filter in Documentos.
--
-- 2. cvm_protocolo: the CVM's own filing protocol number, used as the
--    dedupe key so re-running the importer never creates duplicate rows for
--    a document already imported.
alter table public.portal_documents
  add column if not exists data_publicacao timestamptz,
  add column if not exists cvm_protocolo text;

-- Only enforced when cvm_protocolo is set (manual, non-CVM documents have
-- no protocol and are unaffected).
create unique index if not exists portal_documents_cvm_dedupe
  on public.portal_documents (portal_id, cvm_protocolo)
  where cvm_protocolo is not null;
