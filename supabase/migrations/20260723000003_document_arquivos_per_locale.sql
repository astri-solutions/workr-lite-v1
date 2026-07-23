-- Documents only had ONE shared file_path/external_link for the whole row,
-- while titulo was already per-locale (jsonb keyed by language). Editing the
-- "file" for one language actually replaced the single shared file used by
-- every language — e.g. deleting the EN attachment deleted the PT one too.
-- `arquivos` makes files/links independent per locale, the same shape titulo
-- already has: { [locale]: { filePath?, externalLink? } }.
alter table portal_documents add column if not exists arquivos jsonb;

update portal_documents
set arquivos = jsonb_build_object(
  'pt-BR', jsonb_strip_nulls(jsonb_build_object('filePath', file_path, 'externalLink', external_link))
)
where arquivos is null and (file_path is not null or external_link is not null);
