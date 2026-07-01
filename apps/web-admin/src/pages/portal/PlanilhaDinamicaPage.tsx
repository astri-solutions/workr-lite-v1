import { useState, useRef } from 'react';
import Modal from '../../components/Modal';
import StickyPageHeader from '../../components/StickyPageHeader';
import FilterBar from '../../components/FilterBar';
import PORTAL_CONFIG from '../../portalConfig';
import '../admin/AdminPages.css';
import './PlanilhaDinamicaPage.css';

interface SpreadsheetRow {
  id: string;
  titulo: string;
  periodo: string;   // ex: "2T25"
  ano: string;
  status: 'Publicado' | 'Rascunho';
  arquivo: string;
  tamanho: string;
  publicadoPor: string;
  dataUpload: string;
}

const QUARTER_OPTIONS = ['1T', '2T', '3T', '4T'];
const CURRENT_YEAR = 2026;
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => String(CURRENT_YEAR - i));

function parsePeriod(p: string): { quarter: string; year: string } {
  const m = p.match(/^(\d)[Tt](\d{2,4})$/);
  if (!m) return { quarter: '', year: '' };
  return { quarter: `${m[1]}T`, year: m[2].length === 2 ? `20${m[2]}` : m[2] };
}

const MOCK: SpreadsheetRow[] = [
  { id: 's1', titulo: 'Planilha de Resultados 2T25', periodo: '2T25', ano: '2025', status: 'Publicado', arquivo: 'resultados-2t25.xlsx', tamanho: '1,2 MB', publicadoPor: 'Carlos Souza', dataUpload: '10/08/2025' },
  { id: 's2', titulo: 'Planilha de Resultados 1T25', periodo: '1T25', ano: '2025', status: 'Publicado', arquivo: 'resultados-1t25.xlsx', tamanho: '980 KB', publicadoPor: 'Ana Lima', dataUpload: '12/05/2025' },
  { id: 's3', titulo: 'Planilha de Resultados 4T24', periodo: '4T24', ano: '2024', status: 'Publicado', arquivo: 'resultados-4t24.xlsx', tamanho: '1,1 MB', publicadoPor: 'Carlos Souza', dataUpload: '14/02/2025' },
  { id: 's4', titulo: 'Planilha de Resultados 3T24', periodo: '3T24', ano: '2024', status: 'Rascunho',   arquivo: 'resultados-3t24-v2.xlsx', tamanho: '870 KB', publicadoPor: 'Ana Lima', dataUpload: '08/11/2024' },
];

interface UploadForm {
  titulo: string;
  quarter: string;
  ano: string;
  file: File | null;
  draft: boolean;
}

function emptyForm(): UploadForm {
  return { titulo: '', quarter: '2T', ano: String(CURRENT_YEAR), file: null, draft: false };
}

const PLD_FILTERS = [
  {
    key: 'trimestre',
    label: 'Trimestre',
    options: [
      { value: '', label: 'Todos os trimestres', shortLabel: 'Todos' },
      ...QUARTER_OPTIONS.map(q => ({ value: q, label: q })),
    ],
  },
  {
    key: 'ano',
    label: 'Ano',
    options: [
      { value: '', label: 'Todos os anos', shortLabel: 'Todos' },
      ...YEAR_OPTIONS.map(y => ({ value: y, label: y })),
    ],
  },
  {
    key: 'status',
    label: 'Status',
    options: [
      { value: '', label: 'Todos os status', shortLabel: 'Todos' },
      { value: 'Publicado', label: 'Publicado' },
      { value: 'Rascunho', label: 'Rascunho' },
    ],
  },
];

export default function PlanilhaDinamicaPage() {
  const [rows, setRows] = useState<SpreadsheetRow[]>(MOCK);
  const [filters, setFilters] = useState<Record<string, string>>({ trimestre: '', ano: '', status: '' });
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<UploadForm>(emptyForm());
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = rows.filter(r => {
    if (search && !r.titulo.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.trimestre && !r.periodo.startsWith(filters.trimestre)) return false;
    if (filters.ano && r.ano !== filters.ano) return false;
    if (filters.status && r.status !== filters.status) return false;
    return true;
  });

  function handleFile(file: File) {
    setForm(f => ({
      ...f,
      file,
      titulo: f.titulo || file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
    }));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleSave() {
    if (!form.titulo.trim() || !form.quarter || !form.ano) return;
    const periodo = `${form.quarter}${String(form.ano).slice(2)}`;
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const newRow: SpreadsheetRow = {
      id: Math.random().toString(36).slice(2),
      titulo: form.titulo,
      periodo,
      ano: form.ano,
      status: form.draft ? 'Rascunho' : 'Publicado',
      arquivo: form.file?.name ?? 'planilha.xlsx',
      tamanho: form.file ? `${(form.file.size / 1024).toFixed(0)} KB` : '—',
      publicadoPor: 'Usuário atual',
      dataUpload: dateStr,
    };
    setRows(prev => [newRow, ...prev]);
    setModalOpen(false);
    setForm(emptyForm());
  }

  function confirmDelete() {
    if (!deleteId) return;
    setRows(prev => prev.filter(r => r.id !== deleteId));
    setDeleteId(null);
  }

  // Group by year for accordion display
  const years = Array.from(new Set(filtered.map(r => r.ano))).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="page">
      <StickyPageHeader
        title="Planilha Dinâmica"
        description={<>Arquivos Excel por trimestre do portal <strong>{PORTAL_CONFIG.name}</strong>.</>}
        action={
          <button className="btn-primary" type="button" onClick={() => { setForm(emptyForm()); setModalOpen(true); }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
            Enviar planilha
          </button>
        }
      />

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar__filters">
          <div className="mat-search-wrap">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>search</span>
            <input className="mat-search" type="text" placeholder="Buscar planilha..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <FilterBar groups={PLD_FILTERS} value={filters} onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))} />
        </div>
        <div className="toolbar__actions">
          <span className="toolbar__count">{filtered.length} planilha{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Grouped by year */}
      {filtered.length === 0 ? (
        <div className="pld-empty">
          <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--color-gray-300)' }}>table_chart</span>
          <p>Nenhuma planilha encontrada.</p>
        </div>
      ) : (
        <div className="pld-groups">
          {years.map(year => (
            <div key={year} className="pld-group">
              <div className="pld-group__header">
                <span className="pld-group__year">{year}</span>
                <span className="pld-group__count">{filtered.filter(r => r.ano === year).length} arquivo{filtered.filter(r => r.ano === year).length !== 1 ? 's' : ''}</span>
              </div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Título</th>
                      <th>Período</th>
                      <th>Arquivo</th>
                      <th>Tamanho</th>
                      <th>Status</th>
                      <th>Enviado por</th>
                      <th>Data</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.filter(r => r.ano === year).map(r => {
                      const { quarter } = parsePeriod(r.periodo);
                      return (
                        <tr key={r.id}>
                          <td className="table-cell--bold">
                            <div className="pld-title-cell">
                              <span className="material-symbols-outlined pld-file-icon">table_chart</span>
                              {r.titulo}
                            </div>
                          </td>
                          <td>
                            <span className="pld-period-badge">{quarter}{year.slice(2)}</span>
                          </td>
                          <td className="table-cell--muted pld-filename">{r.arquivo}</td>
                          <td className="table-cell--muted">{r.tamanho}</td>
                          <td>
                            <span className={`badge ${r.status === 'Publicado' ? 'badge--success' : 'badge--gray'}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="table-cell--muted">{r.publicadoPor}</td>
                          <td className="table-cell--muted">{r.dataUpload}</td>
                          <td>
                            <div className="table-actions">
                              <button className="btn-action btn-action--enter" type="button">Baixar</button>
                              <button className="btn-action btn-action--enter" type="button">Substituir</button>
                              <button className="btn-action btn-action--danger" type="button" onClick={() => setDeleteId(r.id)}>Excluir</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Enviar planilha"
        description="Faça upload de um arquivo Excel para um período específico."
        size="md"
        footer={
          <div className="modal-footer">
            <button className="btn-outline" type="button" onClick={() => setModalOpen(false)}>Cancelar</button>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button className="btn-outline" type="button"
                disabled={!form.titulo.trim()}
                onClick={() => { setForm(f => ({ ...f, draft: true })); handleSave(); }}>
                Salvar rascunho
              </button>
              <button className="btn-primary" type="button"
                disabled={!form.titulo.trim() || !form.quarter || !form.ano}
                onClick={handleSave}>
                Publicar
              </button>
            </div>
          </div>
        }
      >
        {/* Upload zone */}
        <div
          className={`pld-upload${dragActive ? ' pld-upload--active' : ''}${form.file ? ' pld-upload--filled' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => !form.file && fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" style={{ display: 'none' }}
            accept=".xlsx,.xls,.csv"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {form.file ? (
            <div className="pld-upload__file">
              <span className="material-symbols-outlined pld-upload__file-icon">table_chart</span>
              <div className="pld-upload__file-info">
                <span className="pld-upload__file-name">{form.file.name}</span>
                <span className="pld-upload__file-size">{(form.file.size / 1024).toFixed(0)} KB</span>
              </div>
              <button type="button" className="pld-upload__file-remove"
                onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, file: null })); }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
              </button>
            </div>
          ) : (
            <>
              <span className="material-symbols-outlined pld-upload__icon">upload_file</span>
              <span className="pld-upload__label">Arraste ou clique para enviar</span>
              <span className="pld-upload__hint">XLSX, XLS, CSV</span>
            </>
          )}
        </div>

        {/* Título */}
        <div className="doc-field">
          <label className="doc-field__label">Título *</label>
          <input className="doc-field__input" type="text" placeholder="Ex: Planilha de Resultados 2T25"
            value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
        </div>

        {/* Período */}
        <div className="doc-field">
          <label className="doc-field__label">Período *</label>
          <div className="pld-period-row">
            <div className="filter-wrap pld-period-select">
              <select className="filter-select" value={form.quarter}
                onChange={e => setForm(f => ({ ...f, quarter: e.target.value }))}>
                {QUARTER_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
              <span className="material-symbols-outlined filter-wrap__icon">expand_more</span>
            </div>
            <div className="filter-wrap pld-period-select">
              <select className="filter-select" value={form.ano}
                onChange={e => setForm(f => ({ ...f, ano: e.target.value }))}>
                {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <span className="material-symbols-outlined filter-wrap__icon">expand_more</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Excluir planilha"
        size="sm"
        footer={
          <div className="modal-footer">
            <button className="btn-outline" type="button" onClick={() => setDeleteId(null)}>Cancelar</button>
            <button className="btn-outline btn-outline--danger" type="button" onClick={confirmDelete}>Excluir</button>
          </div>
        }
      >
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', lineHeight: '1.5' }}>
          Tem certeza que deseja excluir esta planilha? Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  );
}
