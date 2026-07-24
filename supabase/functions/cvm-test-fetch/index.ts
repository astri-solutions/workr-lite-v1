// ─── cvm-test-fetch ──────────────────────────────────────────────────────────
// Phase 2, step 1: prove the real CVM open-data pipeline works for a single
// CNPJ before wiring it into the scheduled import. Read-only — no writes to
// portal_documents or cvm_sync_state happen here.
//
// Source: dados.cvm.gov.br's "IPE" (Informações Periódicas e Eventuais) open
// dataset — a yearly CSV, not a live lookup API. No auth/API key needed.
// Encoding is ISO-8859-1 (Latin-1), delimiter is ';'.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  nomeCompanhia: string;
  codigoCvm: string;
  categoria: string;
  tipo: string;
  especie: string;
  dataReferencia: string;
  dataEntrega: string;
  status: string;
  descricaoAssunto: string;
  protocoloEntrega: string;
  versao: string;
  modalidade: string;
  linkDownload: string;
}

function onlyDigits(s: string): string {
  return s.replace(/\D/g, '');
}

// CVM's own CSV pads Codigo_CVM with leading zeros (e.g. "024910"); the
// admin panel stores whatever the user typed, usually without them.
function normalizeCvmCode(s: string): string {
  const digits = onlyDigits(s);
  return digits.replace(/^0+/, '') || '0';
}

/** Minimal CSV line splitter for this dataset — no embedded semicolons or
 *  quoted multi-line fields in practice, so a plain split is sufficient. */
function parseCsvLine(line: string): string[] {
  return line.split(';').map(f => f.trim().replace(/^"|"$/g, ''));
}

async function fetchIpeYear(year: number): Promise<{ rows: IpeRow[]; error?: string }> {
  const url = `${IPE_BASE_URL}/ipe_cia_aberta_${year}.csv`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    return { rows: [], error: `Falha de rede ao buscar ${url}: ${String(e)}` };
  }
  if (!res.ok) {
    return { rows: [], error: `CVM retornou HTTP ${res.status} para ${url}` };
  }
  const buf = await res.arrayBuffer();
  const text = new TextDecoder('iso-8859-1').decode(buf);
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], error: `Arquivo ${url} veio vazio` };

  const header = parseCsvLine(lines[0]).map(h => h.toLowerCase());
  const idx = (name: string) => header.findIndex(h => h.includes(name));
  const iCnpj = idx('cnpj');
  const iNome = idx('nome_compan');
  const iCodCvm = idx('codigo_cvm');
  const iCategoria = idx('categoria');
  const iTipo = header.findIndex(h => h === 'tipo');
  const iEspecie = idx('especie');
  const iDataRef = idx('data_referencia');
  const iDataEntrega = idx('data_entrega');
  const iStatus = idx('status');
  const iAssunto = idx('descricao_assunto') !== -1 ? idx('descricao_assunto') : idx('assunto');
  const iProtocolo = idx('protocolo');
  const iVersao = idx('versao');
  const iModalidade = idx('modalidade');
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
      nomeCompanhia: f[iNome] ?? '',
      codigoCvm: f[iCodCvm] ?? '',
      categoria: f[iCategoria] ?? '',
      tipo: iTipo !== -1 ? f[iTipo] ?? '' : '',
      especie: f[iEspecie] ?? '',
      dataReferencia: f[iDataRef] ?? '',
      dataEntrega: f[iDataEntrega] ?? '',
      status: f[iStatus] ?? '',
      descricaoAssunto: f[iAssunto] ?? '',
      protocoloEntrega: f[iProtocolo] ?? '',
      versao: f[iVersao] ?? '',
      modalidade: f[iModalidade] ?? '',
      linkDownload: f[iLink] ?? '',
    });
  }
  return { rows };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const ch = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: ch });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const { cnpj, cvmCode } = await req.json() as { cnpj?: string; cvmCode?: string };
    if (!cnpj && !cvmCode) {
      return new Response(JSON.stringify({ error: 'Informe cnpj ou cvmCode' }), {
        status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }
    const cnpjDigits = cnpj ? onlyDigits(cnpj) : null;
    const cvmCodeNorm = cvmCode?.trim() ? normalizeCvmCode(cvmCode) : null;

    // The current year's file is what CVM updates weekly with fresh filings;
    // fall back to last year too since a brand-new company or a slow start
    // of year might have nothing yet in the current year's file.
    const now = new Date();
    const years = [now.getFullYear(), now.getFullYear() - 1];

    const perYear: Record<string, { count: number; error?: string }> = {};
    const matches: IpeRow[] = [];

    for (const year of years) {
      const { rows, error } = await fetchIpeYear(year);
      if (error) { perYear[year] = { count: 0, error }; continue; }
      const found = rows.filter(r =>
        (cnpjDigits && onlyDigits(r.cnpjCompanhia) === cnpjDigits) ||
        (cvmCodeNorm && normalizeCvmCode(r.codigoCvm) === cvmCodeNorm)
      );
      perYear[year] = { count: found.length };
      matches.push(...found);
    }

    // Most recent filings first, capped — this is a test endpoint, not the
    // real importer, so we don't need every row, just proof it works.
    matches.sort((a, b) => b.dataEntrega.localeCompare(a.dataEntrega));
    const sample = matches.slice(0, 20);

    return new Response(JSON.stringify({
      cnpjSearched: cnpj ?? null,
      cvmCodeSearched: cvmCode ?? null,
      yearsChecked: years,
      perYear,
      totalMatches: matches.length,
      sample,
    }), { status: 200, headers: { ...ch, 'Content-Type': 'application/json' } });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...ch, 'Content-Type': 'application/json' },
    });
  }
});
