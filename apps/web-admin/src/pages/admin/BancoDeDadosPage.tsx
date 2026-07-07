import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSort } from '../../hooks/useSort';
import SortIcon from '../../components/SortIcon';
import './AdminPages.css';
import './BancoDeDadosPage.css';

interface SiteData { id: string; link: string; cliente: string; }

const SITES_DB: SiteData[] = [
  { id: 's1', link: 'aurora.workr.com.br',   cliente: 'Construtora Aurora' },
  { id: 's2', link: 'imc.workr.com.br',      cliente: 'International Meal Company' },
  { id: 's3', link: 'imc-en.workr.com.br',   cliente: 'International Meal Company' },
  { id: 's4', link: 'vetra.workr.com.br',     cliente: 'Vetra Energia' },
];

interface DbTable {
  name: string;
  rows: number;
  size: string;
  engine: string;
  updatedAt: string;
}

const TABLES_DB: Record<string, DbTable[]> = {
  s1: [
    { name: 'portais',          rows: 1,     size: '16 KB',   engine: 'InnoDB', updatedAt: '2026-03-03' },
    { name: 'empresas',         rows: 3,     size: '32 KB',   engine: 'InnoDB', updatedAt: '2026-06-10' },
    { name: 'documentos',       rows: 148,   size: '2.1 MB',  engine: 'InnoDB', updatedAt: '2026-07-01' },
    { name: 'resultados',       rows: 36,    size: '512 KB',  engine: 'InnoDB', updatedAt: '2026-06-28' },
    { name: 'materias',         rows: 22,    size: '840 KB',  engine: 'InnoDB', updatedAt: '2026-07-04' },
    { name: 'canais',           rows: 14,    size: '48 KB',   engine: 'InnoDB', updatedAt: '2026-03-10' },
    { name: 'usuarios',         rows: 5,     size: '24 KB',   engine: 'InnoDB', updatedAt: '2026-05-15' },
    { name: 'interacoes',       rows: 87,    size: '320 KB',  engine: 'InnoDB', updatedAt: '2026-07-05' },
    { name: 'calendario',       rows: 12,    size: '96 KB',   engine: 'InnoDB', updatedAt: '2026-06-20' },
    { name: 'mailing_contatos', rows: 1240,  size: '4.8 MB',  engine: 'InnoDB', updatedAt: '2026-07-03' },
    { name: 'sessions',         rows: 3410,  size: '8.2 MB',  engine: 'InnoDB', updatedAt: '2026-07-05' },
    { name: 'logs',             rows: 28400, size: '42.6 MB', engine: 'InnoDB', updatedAt: '2026-07-05' },
  ],
  s2: [
    { name: 'portais',    rows: 1,    size: '16 KB',   engine: 'InnoDB', updatedAt: '2026-02-12' },
    { name: 'documentos', rows: 410,  size: '6.4 MB',  engine: 'InnoDB', updatedAt: '2026-07-04' },
    { name: 'resultados', rows: 96,   size: '1.2 MB',  engine: 'InnoDB', updatedAt: '2026-06-30' },
    { name: 'logs',       rows: 61200,size: '98.1 MB', engine: 'InnoDB', updatedAt: '2026-07-05' },
  ],
  s3: [
    { name: 'portais',    rows: 1,    size: '16 KB',  engine: 'InnoDB', updatedAt: '2026-02-12' },
    { name: 'documentos', rows: 312,  size: '4.8 MB', engine: 'InnoDB', updatedAt: '2026-07-02' },
    { name: 'logs',       rows: 44800,size: '71.5 MB',engine: 'InnoDB', updatedAt: '2026-07-05' },
  ],
  s4: [
    { name: 'portais',    rows: 1,   size: '16 KB',  engine: 'InnoDB', updatedAt: '2026-01-21' },
    { name: 'documentos', rows: 62,  size: '840 KB', engine: 'InnoDB', updatedAt: '2026-05-18' },
    { name: 'logs',       rows: 9800,size: '16.2 MB',engine: 'InnoDB', updatedAt: '2026-07-05' },
  ],
};

export default function BancoDeDadosPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const site = SITES_DB.find(s => s.id === siteId) ?? SITES_DB[0];
  const tables = TABLES_DB[site.id] ?? [];
  const [search, setSearch] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const [optimized, setOptimized] = useState(false);

  const _filtered = tables.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
  const { sorted: filtered, col, dir, toggle } = useSort(_filtered);
  const totalSize = tables.reduce((acc, t) => acc + parseFloat(t.size), 0).toFixed(1);
  const totalRows = tables.reduce((acc, t) => acc + t.rows, 0);

  function handleOptimize() {
    setOptimizing(true);
    setTimeout(() => { setOptimizing(false); setOptimized(true); setTimeout(() => setOptimized(false), 3000); }, 2200);
  }

  return (
    <div className="page db-page">
      <div className="painel-breadcrumb">
        <button className="painel-breadcrumb__back" type="button" onClick={() => navigate(`/admin/portais/${siteId}/painel`)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Painel de controle
        </button>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="painel-breadcrumb__sep">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <span className="painel-breadcrumb__current">Banco de dados</span>
      </div>

      <div className="db-header">
        <div>
          <h1 className="db-header__title">Banco de dados</h1>
          <p className="db-header__sub">{site.link} · {site.cliente}</p>
        </div>
        <div className="db-header__actions">
          <button
            className={`btn-outline${optimizing ? ' db-btn--loading' : ''}`}
            type="button"
            onClick={handleOptimize}
            disabled={optimizing}
          >
            {optimizing ? (
              <><span className="painel-spin"/> Otimizando…</>
            ) : optimized ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Otimizado
              </>
            ) : 'Otimizar tabelas'}
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="db-stats">
        <div className="db-stat">
          <span className="db-stat__value">{tables.length}</span>
          <span className="db-stat__label">Tabelas</span>
        </div>
        <div className="db-stat">
          <span className="db-stat__value">{totalRows.toLocaleString('pt-BR')}</span>
          <span className="db-stat__label">Total de linhas</span>
        </div>
        <div className="db-stat">
          <span className="db-stat__value">{totalSize} MB</span>
          <span className="db-stat__label">Tamanho total</span>
        </div>
        <div className="db-stat">
          <span className="db-stat__value">MySQL 8.0</span>
          <span className="db-stat__label">Versão</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="db-toolbar">
        <div className="db-search-wrap">
          <svg className="db-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="db-search"
            type="text"
            placeholder="Buscar tabela…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table list */}
      <div className="db-card">
        <table className="db-table">
          <thead>
            <tr>
              <th className={`th-sort${col === 'name' ? ' th-sort--active' : ''}`} onClick={() => toggle('name')}><span className="th-sort-inner">Tabela <SortIcon dir={col === 'name' ? dir : null} /></span></th>
              <th className={`th-sort db-th--num${col === 'rows' ? ' th-sort--active' : ''}`} onClick={() => toggle('rows')}><span className="th-sort-inner">Linhas <SortIcon dir={col === 'rows' ? dir : null} /></span></th>
              <th className={`th-sort db-th--num${col === 'size' ? ' th-sort--active' : ''}`} onClick={() => toggle('size')}><span className="th-sort-inner">Tamanho <SortIcon dir={col === 'size' ? dir : null} /></span></th>
              <th className={`th-sort${col === 'engine' ? ' th-sort--active' : ''}`} onClick={() => toggle('engine')}><span className="th-sort-inner">Engine <SortIcon dir={col === 'engine' ? dir : null} /></span></th>
              <th className={`th-sort${col === 'updatedAt' ? ' th-sort--active' : ''}`} onClick={() => toggle('updatedAt')}><span className="th-sort-inner">Última alteração <SortIcon dir={col === 'updatedAt' ? dir : null} /></span></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.name} className="db-row">
                <td className="db-cell-name">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="db-table-icon">
                    <ellipse cx="12" cy="5" rx="9" ry="3"/>
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                  </svg>
                  <code className="db-table-name">{t.name}</code>
                </td>
                <td className="db-cell-num">{t.rows.toLocaleString('pt-BR')}</td>
                <td className="db-cell-num">{t.size}</td>
                <td><span className="db-badge-engine">{t.engine}</span></td>
                <td className="db-cell-muted">{t.updatedAt}</td>
                <td className="db-cell-actions">
                  <button className="db-row-btn" type="button" title="Exportar SQL">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="db-empty">Nenhuma tabela encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
