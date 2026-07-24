// ─── cvm-import-run ────────────────────────────────────────────────────────
// Phase 2/3: the real Auto CVM importer for one (portal, empresa). Reads
// dados.cvm.gov.br's IPE dataset, matches by CNPJ/código CVM, and — for
// each category that already has a routing rule pointing at a real canal —
// writes the document into portal_documents at that page.
//
// "Opção A" grouping behaviour: if the routed page is a plain 'lista' page,
// or is 'lista-agrupada' but missing this category's label, this function
// promotes it to 'lista-agrupada' and appends the missing category. It only
// ever ADDS — existing pageType/labels/order from manual edits in Canais
// are never removed or reordered. This is generic code, not per-portal
// config, so it applies the same way to every portal (existing or new)
// without any separate propagation step.
//
// Dates: each document's `data_publicacao` is the CVM's own Data_Entrega
// (the real filing date) — never "now()". created_at is left as the row's
// true insert timestamp, kept separate for audit purposes.
//
// Dedupe: cvm_protocolo (CVM's filing protocol number) is unique per
// (portal_id, cvm_protocolo) — re-running this for the same entity never
// creates duplicate documents.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { unzipSync } from 'https://esm.sh/fflate@0.8.2';

const ALLOWED_ORIGINS = [
  'https://workr-lite-v1.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

const IPE_BASE_URL = 'https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/IPE/DADOS';

interface IpeRow {
  cnpjCompanhia: string;
  codigoCvm: string;
  categoria: string;
  tipo: string;
  especie: string;
  dataReferencia: string;
  dataEntrega: string;
  status: string;
  descricaoAssunto: string;
  protocoloEntrega: string;
  linkDownload: string;
}

function onlyDigits(s: string): string {
  return s.replace(/\D/g, '');
}

// CVM's own CSV pads Codigo_CVM with leading zeros (e.g. "024910"); the
// admin panel stores whatever the user typed, usually without them
// ("24910") — compare numerically so that difference never causes a
// false non-match.
function normalizeCvmCode(s: string): string {
  const digits = onlyDigits(s);
  return digits.replace(/^0+/, '') || '0';
}

function parseCsvLine(line: string): string[] {
  return line.split(';').map(f => f.trim().replace(/^"|"$/g, ''));
}

async function fetchIpeYear(year: number): Promise<{ rows: IpeRow[]; error?: string; notPublishedYet?: boolean }> {
  // CVM publishes these as a ZIP, not a bare CSV — the file inside is named
  // the same as the zip with a .csv extension (there are a few auxiliary
  // CSVs bundled in too; only the main ipe_cia_aberta_{year}.csv matters).
  const url = `${IPE_BASE_URL}/ipe_cia_aberta_${year}.zip`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    return { rows: [], error: `Falha de rede ao buscar ${url}: ${String(e)}` };
  }
  // A 404 on the most recent year is expected, not a failure — CVM only
  // starts publishing that year's file once the first filing of the year
  // comes in. Older years 404ing would be genuinely wrong, but callers only
  // ever hit this for the current/near-current year.
  if (res.status === 404) return { rows: [], notPublishedYet: true };
  if (!res.ok) return { rows: [], error: `CVM retornou HTTP ${res.status} para ${url}` };

  const zipBuf = new Uint8Array(await res.arrayBuffer());
  let unzipped: Record<string, Uint8Array>;
  try {
    unzipped = unzipSync(zipBuf);
  } catch (e) {
    return { rows: [], error: `Falha ao extrair ${url}: ${String(e)}` };
  }
  const csvName = Object.keys(unzipped).find(n => n.toLowerCase() === `ipe_cia_aberta_${year}.csv`)
    ?? Object.keys(unzipped).find(n => n.toLowerCase().endsWith('.csv'));
  if (!csvName) return { rows: [], error: `Nenhum CSV encontrado dentro de ${url}` };

  const text = new TextDecoder('iso-8859-1').decode(unzipped[csvName]);
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], error: `Arquivo ${url} veio vazio` };

  const header = parseCsvLine(lines[0]).map(h => h.toLowerCase());
  const idx = (name: string) => header.findIndex(h => h.includes(name));
  const iCnpj = idx('cnpj');
  const iCodCvm = idx('codigo_cvm');
  const iCategoria = idx('categoria');
  const iTipo = header.findIndex(h => h === 'tipo');
  const iEspecie = idx('especie');
  const iDataRef = idx('data_referencia');
  const iDataEntrega = idx('data_entrega');
  const iStatus = idx('status');
  const iAssunto = idx('descricao_assunto') !== -1 ? idx('descricao_assunto') : idx('assunto');
  const iProtocolo = idx('protocolo');
  const iLink = idx('link_download') !== -1 ? idx('link_download') : idx('link');

  if (iCnpj === -1 || iCodCvm === -1) {
    return { rows: [], error: `Cabeçalho inesperado no CSV — colunas encontradas: ${header.join(', ')}` };
  }

  const rows: IpeRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const f = parseCsvLine(lines[i]);
    if (f.length < header.length) continue;
    rows.push({
      cnpjCompanhia: f[iCnpj] ?? '',
      codigoCvm: f[iCodCvm] ?? '',
      categoria: f[iCategoria] ?? '',
      tipo: iTipo !== -1 ? f[iTipo] ?? '' : '',
      especie: f[iEspecie] ?? '',
      dataReferencia: f[iDataRef] ?? '',
      dataEntrega: f[iDataEntrega] ?? '',
      status: f[iStatus] ?? '',
      descricaoAssunto: f[iAssunto] ?? '',
      protocoloEntrega: f[iProtocolo] ?? '',
      linkDownload: f[iLink] ?? '',
    });
  }
  return { rows };
}

// ─── CVM category → internal taxonomy ─────────────────────────────────────
// Maps the free-text Categoria/Tipo/Especie fields from the IPE CSV onto the
// fixed category ids used by Auto CVM's routing UI (CVM_ROUTABLE_CATEGORIES
// in AutoCvmPage.tsx). Best-effort text matching — CVM's own vocabulary is
// fairly stable, but this should be revisited once real CSV samples (via
// cvm-test-fetch) are reviewed against actual production data.
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function mapToCategoryId(row: IpeRow): { id: string; label: string } | null {
  const cat = normalize(row.categoria);
  const tipo = normalize(row.tipo);
  const especie = normalize(row.especie);
  const all = `${cat} ${tipo} ${especie}`;

  if (all.includes('fato relevante')) return { id: 'fato-relevante', label: 'Fato Relevante' };
  if (all.includes('comunicado ao mercado') || all.includes('comunicado')) return { id: 'comunicado', label: 'Comunicado ao Mercado' };
  if (all.includes('aviso') && all.includes('acionist')) return { id: 'aviso-acionistas', label: 'Aviso aos Acionistas' };
  if (all.includes('convocacao') || all.includes('edital')) return { id: 'convocacao', label: 'Convocação' };
  if (all.includes('assembleia') || all.includes('ata de reuniao') || all.includes('ata')) {
    if (all.includes('extraordinaria')) return { id: 'ata-age', label: 'Ata de AGE' };
    if (all.includes('ordinaria')) return { id: 'ata-ago', label: 'Ata de AGO' };
    return { id: 'ata-ago', label: 'Ata de AGO' };
  }
  if (all.includes('formulario de referencia')) return { id: 'formulario-referencia', label: 'Formulário de Referência' };
  if (all.includes('prospecto')) return { id: 'prospecto', label: 'Prospecto' };
  if (all.includes('informe mensal')) return { id: 'informe-mensal', label: 'Informe Mensal' };
  if (all.includes('informe trimestral') || all.includes('itr')) return { id: 'informe-trimestral', label: 'Informe Trimestral' };
  if (all.includes('periodic')) return { id: 'informacoes-periodicas', label: 'Informações Periódicas' };
  if (all.includes('societari') || all.includes('estatuto') || all.includes('acionista')) {
    return { id: 'documentos-societarios', label: 'Documentos Societários' };
  }
  if (all.includes('calendario de eventos')) return { id: 'calendario-eventos', label: 'Calendário de Eventos Corporativos' };
  if (all.includes('economico-financeiro') || all.includes('economico financeiro')) {
    return { id: 'dados-economico-financeiros', label: 'Dados Econômico-Financeiros' };
  }
  if (all.includes('plano de remuneracao')) return { id: 'plano-remuneracao', label: 'Plano de Remuneração Baseado em Ações' };
  if (all.includes('relatorio de sustentabilidade')) return { id: 'relatorio-sustentabilidade', label: 'Relatório de Sustentabilidade' };
  if (all.includes('relatorio proventos') || all.includes('relatorio de proventos')) return { id: 'relatorio-proventos', label: 'Relatório de Proventos' };
  if (all.includes('valores mobiliarios negociados')) return { id: 'valores-mobiliarios-negociados', label: 'Valores Mobiliários Negociados e Detidos' };

  // CVM's real taxonomy is much larger than this hand-picked list, and it
  // keeps surfacing categories we haven't hardcoded — instead of dropping
  // those documents silently, derive a stable id from the real Categoria
  // text so ANY category becomes routable (see discovered_categories),
  // without needing a code change for every new one CVM has.
  if (row.categoria.trim()) {
    const slug = normalize(row.categoria).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (slug) return { id: `cvm-${slug}`, label: row.categoria.trim() };
  }
  return null;
}

const FILE_EXT_BY_CONTENT_TYPE: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/zip': 'zip',
};

// CVM's Link_Download sometimes points straight at a real file, but for many
// filing types it's actually an HTML viewer page (RAD/ENET) that would need
// further scraping to reach the real document — in that case we keep the
// external link instead of storing an HTML page as if it were the file.
async function downloadCvmFile(url: string): Promise<{ bytes: Uint8Array; ext: string; contentType: string } | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!contentType || contentType.startsWith('text/html')) return null;
    const ext = FILE_EXT_BY_CONTENT_TYPE[contentType] ?? (url.match(/\.([a-z0-9]{2,4})(?:\?.*)?$/i)?.[1]?.toLowerCase());
    if (!ext) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length === 0) return null;
    return { bytes, ext, contentType };
  } catch {
    return null;
  }
}

// dd/mm/yyyy (or yyyy-mm-dd, just in case) → ISO timestamp. Never falls back
// to "now" — an unparseable date is left null rather than lying about when
// the document was actually published.
function parseCvmDate(raw: string): string | null {
  const s = raw.trim();
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return new Date(`${br[3]}-${br[2]}-${br[1]}T12:00:00Z`).toISOString();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(`${iso[1]}-${iso[2]}-${iso[3]}T12:00:00Z`).toISOString();
  return null;
}

interface EmpresaRow {
  id: string; nome: string; cnpj: string; cvmCodigo: string; autoCvm: boolean;
}
interface CvmRoutingRule {
  cvmCategoryId: string; cvmCategoryLabel: string; targetId: string; targetLabel: string; groupCategory?: string;
}
interface CanalNode {
  id?: string; label: string; pageType?: string; listaAgrupadaCategories?: string[]; children?: CanalNode[];
}

// Additive-only: promotes a node to 'lista-agrupada' and/or appends a
// missing category label. Never removes or reorders what a human configured.
function ensureCategoryOnTree(canais: CanalNode[], targetId: string, categoryLabel: string): { canais: CanalNode[]; changed: boolean } {
  let changed = false;
  function walk(node: CanalNode): CanalNode {
    let next = node;
    if (node.id === targetId) {
      const cats = node.listaAgrupadaCategories ?? [];
      const needsPromote = node.pageType !== 'lista-agrupada';
      const needsCategory = !cats.includes(categoryLabel);
      if (needsPromote || needsCategory) {
        changed = true;
        next = {
          ...node,
          pageType: 'lista-agrupada',
          listaAgrupadaCategories: needsCategory ? [...cats, categoryLabel] : cats,
        };
      }
    }
    if (next.children) {
      next = { ...next, children: next.children.map(walk) };
    }
    return next;
  }
  const result = canais.map(walk);
  return { canais: result, changed };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const ch = corsHeaders(origin);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: ch });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...ch, 'Content-Type': 'application/json' } });
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...ch, 'Content-Type': 'application/json' } });
    }

    const { portalId, empresaId, desde } = await req.json() as { portalId?: string; empresaId?: string; desde?: string };
    if (!portalId || !empresaId) {
      return new Response(JSON.stringify({ error: 'Informe portalId e empresaId' }), { status: 400, headers: { ...ch, 'Content-Type': 'application/json' } });
    }
    // "desde" (Importar histórico) requests everything filed on/after that
    // date, which may span several years back. Without it (Verificar agora),
    // only the current + previous year are checked — that's the window CVM
    // actually keeps up to date week-to-week.
    const desdeDate = desde ? new Date(`${desde}T00:00:00Z`) : null;

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: cfg } = await admin.from('portal_config').select('empresas, canais').eq('portal_id', portalId).maybeSingle();
    const empresas = (cfg?.empresas ?? []) as EmpresaRow[];
    const empresa = empresas.find(e => e.id === empresaId);
    if (!empresa) {
      return new Response(JSON.stringify({ error: 'Empresa não encontrada neste portal.' }), { status: 404, headers: { ...ch, 'Content-Type': 'application/json' } });
    }
    if (!empresa.autoCvm) {
      return new Response(JSON.stringify({ error: 'Auto CVM não está ativado para esta empresa.' }), { status: 400, headers: { ...ch, 'Content-Type': 'application/json' } });
    }

    const { data: syncRow } = await admin.from('cvm_sync_state').select('routing, discovered_categories').eq('portal_id', portalId).eq('empresa_id', empresaId).maybeSingle();
    const routing = (syncRow?.routing ?? []) as CvmRoutingRule[];
    const routingByCategory = new Map(routing.map(r => [r.cvmCategoryId, r]));
    const discoveredById = new Map<string, string>(
      ((syncRow?.discovered_categories ?? []) as { id: string; label: string }[]).map(c => [c.id, c.label])
    );

    const cnpjDigits = empresa.cnpj ? onlyDigits(empresa.cnpj) : null;
    const cvmCode = empresa.cvmCodigo?.trim() ? normalizeCvmCode(empresa.cvmCodigo) : null;

    const now = new Date();
    // Always include at least the previous year as a fallback — the current
    // year's CVM file may not exist yet (they only publish it once the
    // year's first filing lands), and the per-row date filter below already
    // excludes anything before `desde`, so widening the range never leaks in
    // documents outside the requested window.
    const earliestYear = desdeDate ? Math.min(desdeDate.getFullYear(), now.getFullYear() - 1) : now.getFullYear() - 1;
    const years = Array.from({ length: now.getFullYear() - earliestYear + 1 }, (_, i) => earliestYear + i);
    const matches: IpeRow[] = [];
    const fetchErrors: string[] = [];

    for (const year of years) {
      const { rows, error, notPublishedYet } = await fetchIpeYear(year);
      if (notPublishedYet) continue; // CVM hasn't started this year's file yet — not an error
      if (error) { fetchErrors.push(error); continue; }
      matches.push(...rows.filter(r => {
        const isEntity = (cnpjDigits && onlyDigits(r.cnpjCompanhia) === cnpjDigits) || (cvmCode && normalizeCvmCode(r.codigoCvm) === cvmCode);
        if (!isEntity) return false;
        if (!desdeDate) return true;
        const filedAt = parseCvmDate(r.dataEntrega) ?? parseCvmDate(r.dataReferencia);
        return !!filedAt && new Date(filedAt) >= desdeDate;
      }));
    }

    let canais = (cfg?.canais ?? []) as CanalNode[];
    let canaisChanged = false;
    let imported = 0;
    let skippedDuplicate = 0;
    let skippedUnrouted = 0;
    let skippedNoMap = 0;
    let skippedNoDate = 0;
    const unroutedCategories = new Set<string>();
    let discoveredChanged = false;

    for (const row of matches) {
      const mapped = mapToCategoryId(row);
      if (!mapped) {
        // Only genuinely empty Categoria text falls through the slug
        // fallback above — nothing meaningful to route.
        skippedNoMap++;
        continue;
      }
      if (!discoveredById.has(mapped.id)) { discoveredById.set(mapped.id, mapped.label); discoveredChanged = true; }
      const rule = routingByCategory.get(mapped.id);
      if (!rule) {
        unroutedCategories.add(mapped.label);
        skippedUnrouted++;
        continue;
      }

      const dataPublicacao = parseCvmDate(row.dataEntrega) ?? parseCvmDate(row.dataReferencia);
      if (!dataPublicacao) { skippedNoDate++; continue; }

      // CVM's own protocol number is the ideal dedupe key, but a small
      // fraction of rows come without one — fall back to a composite key
      // instead of silently dropping the document.
      const dedupeKey = row.protocoloEntrega || `sem-protocolo:${onlyDigits(row.cnpjCompanhia)}:${mapped.id}:${row.dataEntrega}:${row.descricaoAssunto}`.slice(0, 250);

      const { canais: nextCanais, changed } = ensureCategoryOnTree(canais, rule.targetId, mapped.label);
      if (changed) { canais = nextCanais; canaisChanged = true; }

      // Prefer storing the real file (same as a manual upload in Documentos)
      // over just linking out to the CVM — download it into our own storage
      // whenever Link_Download actually points at a file rather than a
      // viewer page, so it behaves identically to a document uploaded by
      // hand: signed URLs, consistent icons, no dependency on CVM's uptime.
      const downloaded = await downloadCvmFile(row.linkDownload);
      let filePath: string | null = null;
      let externalLink: string | null = row.linkDownload || null;
      if (downloaded) {
        const storagePath = `${portalId}/cvm-${empresaId}-${dedupeKey.replace(/[^a-zA-Z0-9._-]/g, '_')}.${downloaded.ext}`;
        const { error: uploadError } = await admin.storage
          .from('portal-documents')
          .upload(storagePath, downloaded.bytes, { upsert: true, contentType: downloaded.contentType });
        if (!uploadError) { filePath = storagePath; externalLink = null; }
      }

      const { error: insertError } = await admin.from('portal_documents').insert({
        portal_id: portalId,
        entity_id: empresaId,
        titulo: { 'pt-BR': row.descricaoAssunto || mapped.label },
        tipo: mapped.label,
        status: 'Publicado',
        pagina_ids: [rule.targetId],
        sub_group_ids: { [rule.targetId]: [mapped.label] },
        idiomas: ['pt-BR'],
        pt_only: true,
        file_path: filePath,
        external_link: externalLink,
        from_cvm: true,
        cvm_protocolo: dedupeKey,
        data_publicacao: dataPublicacao,
        publicado_por: 'Auto CVM',
        ultimo_editor: 'Auto CVM',
      });

      if (insertError) {
        if (insertError.code === '23505') skippedDuplicate++;
        else fetchErrors.push(`Falha ao importar protocolo ${dedupeKey}: ${insertError.message}`);
      } else {
        imported++;
      }
    }

    if (canaisChanged) {
      await admin.from('portal_config').upsert({ portal_id: portalId, canais }, { onConflict: 'portal_id' });
    }

    const resultNow = new Date().toISOString();
    const result = {
      documentsFound: matches.length,
      documentsImported: imported,
      errors: [
        ...fetchErrors,
        // Not a problem — expected on every re-run, but silently absorbing
        // it into "0 importados" reads as if the whole run failed.
        ...(skippedDuplicate > 0 ? [`${skippedDuplicate} documento(s) já haviam sido importados anteriormente.`] : []),
        ...(skippedNoMap > 0 ? [`${skippedNoMap} documento(s) sem categoria informada pela CVM.`] : []),
        ...(unroutedCategories.size > 0 ? [`${skippedUnrouted} documento(s) sem destino configurado nas categorias: ${[...unroutedCategories].join(', ')}. Configure o roteamento em Auto CVM.`] : []),
        ...(skippedNoDate > 0 ? [`${skippedNoDate} documento(s) ignorados por data de entrega inválida.`] : []),
      ],
    };

    const discoveredCategories = [...discoveredById].map(([id, label]) => ({ id, label }));

    await admin.from('cvm_sync_state').upsert({
      portal_id: portalId,
      empresa_id: empresaId,
      ...(discoveredChanged ? { discovered_categories: discoveredCategories } : {}),
      ultima_sync: resultNow,
      last_sync_result: result,
    }, { onConflict: 'portal_id,empresa_id' });

    return new Response(JSON.stringify({ entityId: empresaId, syncedAt: resultNow, ...result, skippedDuplicate }), {
      status: 200, headers: { ...ch, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...ch, 'Content-Type': 'application/json' } });
  }
});
