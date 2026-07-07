import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { useSort } from '../../hooks/useSort';
import SortIcon from '../../components/SortIcon';
import type { AdminOutletContext } from '../../components/AdminLayout';
import './AdminPages.css';
import './DominiosPage.css';

const SITES_DB: Record<string, { cliente: string; domain: string }> = {
  s1: { cliente: 'Construtora Aurora', domain: 'aurora.workr.com.br' },
  s2: { cliente: 'International Meal Company', domain: 'imc.workr.com.br' },
  s3: { cliente: 'International Meal Company', domain: 'imc-en.workr.com.br' },
  s4: { cliente: 'Vetra Energia', domain: 'vetra.workr.com.br' },
};

interface Subdomain {
  id: string;
  sub: string;
  domain: string;
  folder: string;
  criadoEm: string;
}

interface Parked {
  id: string;
  domain: string;
  criadoEm: string;
}

interface Redirect {
  id: string;
  from: string;
  to: string;
  type: '301' | '302';
  criadoEm: string;
}

type Tab = 'subdominios' | 'estacionados' | 'redirecionamentos';

export default function DominiosPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const { setPortalCtx } = useOutletContext<AdminOutletContext>();

  const site = siteId ? SITES_DB[siteId] : undefined;

  useEffect(() => {
    if (site) setPortalCtx({ name: site.cliente, backTo: '/admin/portais' });
    return () => setPortalCtx(null);
  }, [siteId]);

  const [tab, setTab] = useState<Tab>('subdominios');

  // Subdomain form
  const [subInput, setSubInput] = useState('');
  const [subFolder, setSubFolder] = useState(false);
  const [subFolderPath, setSubFolderPath] = useState('');
  const [subdomains, setSubdomains] = useState<Subdomain[]>([
    { id: '1', sub: 'blog', domain: site?.domain ?? '', folder: '/blog', criadoEm: '2026-03-10' },
    { id: '2', sub: 'api', domain: site?.domain ?? '', folder: '/api', criadoEm: '2026-04-01' },
  ]);
  const [deleteSubId, setDeleteSubId] = useState<string | null>(null);

  // Parked domains form
  const [parkedInput, setParkedInput] = useState('');
  const [parked, setParked] = useState<Parked[]>([
    { id: '1', domain: 'aurora-ri.com.br', criadoEm: '2026-02-15' },
  ]);
  const [deleteParkedId, setDeleteParkedId] = useState<string | null>(null);

  // Redirects form
  const [redFrom, setRedFrom] = useState('');
  const [redTo, setRedTo] = useState('');
  const [redType, setRedType] = useState<'301' | '302'>('301');
  const [redirects, setRedirects] = useState<Redirect[]>([
    { id: '1', from: 'www.' + (site?.domain ?? ''), to: site?.domain ?? '', type: '301', criadoEm: '2026-01-20' },
  ]);
  const [deleteRedId, setDeleteRedId] = useState<string | null>(null);

  const { sorted: sortedSubs, col: subCol, dir: subDir, toggle: toggleSub } = useSort(subdomains);
  const { sorted: sortedParked, col: parkedCol, dir: parkedDir, toggle: toggleParked } = useSort(parked);
  const { sorted: sortedRedirects, col: redCol, dir: redDir, toggle: toggleRed } = useSort(redirects);

  if (!site) {
    return (
      <div className="page">
        <div className="page-placeholder">
          <h2>Site não encontrado</h2>
          <button className="btn-primary" type="button" onClick={() => navigate('/admin/portais')}>
            Voltar para Portais
          </button>
        </div>
      </div>
    );
  }

  function createSubdomain() {
    if (!subInput.trim()) return;
    setSubdomains(prev => [...prev, {
      id: Date.now().toString(),
      sub: subInput.trim(),
      domain: site!.domain,
      folder: subFolder && subFolderPath.trim() ? subFolderPath.trim() : `/${subInput.trim()}`,
      criadoEm: new Date().toISOString().slice(0, 10),
    }]);
    setSubInput('');
    setSubFolderPath('');
    setSubFolder(false);
  }

  function createParked() {
    if (!parkedInput.trim()) return;
    setParked(prev => [...prev, {
      id: Date.now().toString(),
      domain: parkedInput.trim(),
      criadoEm: new Date().toISOString().slice(0, 10),
    }]);
    setParkedInput('');
  }

  function createRedirect() {
    if (!redFrom.trim() || !redTo.trim()) return;
    setRedirects(prev => [...prev, {
      id: Date.now().toString(),
      from: redFrom.trim(),
      to: redTo.trim(),
      type: redType,
      criadoEm: new Date().toISOString().slice(0, 10),
    }]);
    setRedFrom('');
    setRedTo('');
    setRedType('301');
  }

  return (
    <div className="page dom-page">
      <div className="painel-breadcrumb">
        <button className="painel-breadcrumb__back" type="button" onClick={() => navigate(`/admin/portais/${siteId}/painel`)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Painel
        </button>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="painel-breadcrumb__sep">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="painel-breadcrumb__current">Domínios</span>
      </div>

      <div className="page-header">
        <div className="page-header__text">
          <h1 className="page-title">Domínios</h1>
          <p className="page-desc">Gerencie subdomínios, domínios estacionados e redirecionamentos de <strong>{site.domain}</strong>.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="dom-tabs">
        {(['subdominios', 'estacionados', 'redirecionamentos'] as Tab[]).map(t => (
          <button
            key={t}
            type="button"
            className={`dom-tab${tab === t ? ' dom-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'subdominios' ? 'Subdomínios' : t === 'estacionados' ? 'Domínios estacionados' : 'Redirecionamentos'}
          </button>
        ))}
      </div>

      {/* ── Subdomínios ── */}
      {tab === 'subdominios' && (
        <>
          <div className="dom-card">
            <h3 className="dom-card__title">Criar um novo subdomínio</h3>
            <div className="dom-form">
              <div className="dom-form__row">
                <div className="dom-field">
                  <label className="dom-label">Subdomínio</label>
                  <input
                    className="dom-input"
                    type="text"
                    placeholder="ex: blog"
                    value={subInput}
                    onChange={e => setSubInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && createSubdomain()}
                  />
                </div>
                <div className="dom-field">
                  <label className="dom-label">Domínio</label>
                  <div className="dom-domain-badge">.{site.domain}</div>
                </div>
              </div>
              <label className="dom-checkbox-label">
                <input type="checkbox" checked={subFolder} onChange={e => setSubFolder(e.target.checked)} />
                Pasta personalizada para subdomínio
              </label>
              {subFolder && (
                <div className="dom-field" style={{ maxWidth: 360 }}>
                  <label className="dom-label">Caminho da pasta</label>
                  <input
                    className="dom-input"
                    type="text"
                    placeholder="/pasta/personalizada"
                    value={subFolderPath}
                    onChange={e => setSubFolderPath(e.target.value)}
                  />
                </div>
              )}
              <div className="dom-form__footer">
                <button
                  className="btn-primary"
                  type="button"
                  onClick={createSubdomain}
                  disabled={!subInput.trim()}
                >
                  Criar
                </button>
              </div>
            </div>
          </div>

          {subdomains.length > 0 && (
            <div className="dom-card dom-card--table">
              <h3 className="dom-card__title">Subdomínios existentes</h3>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className={`th-sort${subCol === 'sub' ? ' th-sort--active' : ''}`} onClick={() => toggleSub('sub')}><span className="th-sort-inner">Subdomínio <SortIcon dir={subCol === 'sub' ? subDir : null} /></span></th>
                      <th className={`th-sort${subCol === 'folder' ? ' th-sort--active' : ''}`} onClick={() => toggleSub('folder')}><span className="th-sort-inner">Pasta <SortIcon dir={subCol === 'folder' ? subDir : null} /></span></th>
                      <th className={`th-sort${subCol === 'criadoEm' ? ' th-sort--active' : ''}`} onClick={() => toggleSub('criadoEm')}><span className="th-sort-inner">Criado em <SortIcon dir={subCol === 'criadoEm' ? subDir : null} /></span></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSubs.map(s => (
                      <tr key={s.id}>
                        <td><span className="dom-mono">{s.sub}.{s.domain}</span></td>
                        <td><span className="dom-mono dom-mono--muted">{s.folder}</span></td>
                        <td>{s.criadoEm}</td>
                        <td>
                          <div className="table-actions">
                            {deleteSubId === s.id ? (
                              <>
                                <span className="dom-confirm-text">Remover?</span>
                                <button className="btn-action btn-action--danger" type="button" onClick={() => { setSubdomains(p => p.filter(x => x.id !== s.id)); setDeleteSubId(null); }}>Sim</button>
                                <button className="btn-action btn-action--secondary" type="button" onClick={() => setDeleteSubId(null)}>Não</button>
                              </>
                            ) : (
                              <button className="btn-action btn-action--danger" type="button" onClick={() => setDeleteSubId(s.id)}>Remover</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Domínios estacionados ── */}
      {tab === 'estacionados' && (
        <>
          <div className="dom-card">
            <h3 className="dom-card__title">Adicionar domínio estacionado</h3>
            <p className="dom-card__desc">Um domínio estacionado aponta para o mesmo conteúdo do domínio principal.</p>
            <div className="dom-form">
              <div className="dom-field" style={{ maxWidth: 420 }}>
                <label className="dom-label">Domínio</label>
                <input
                  className="dom-input"
                  type="text"
                  placeholder="ex: meudominio.com.br"
                  value={parkedInput}
                  onChange={e => setParkedInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createParked()}
                />
              </div>
              <div className="dom-form__footer">
                <button
                  className="btn-primary"
                  type="button"
                  onClick={createParked}
                  disabled={!parkedInput.trim()}
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>

          {parked.length > 0 && (
            <div className="dom-card dom-card--table">
              <h3 className="dom-card__title">Domínios estacionados</h3>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className={`th-sort${parkedCol === 'domain' ? ' th-sort--active' : ''}`} onClick={() => toggleParked('domain')}><span className="th-sort-inner">Domínio <SortIcon dir={parkedCol === 'domain' ? parkedDir : null} /></span></th>
                      <th>Aponta para</th>
                      <th className={`th-sort${parkedCol === 'criadoEm' ? ' th-sort--active' : ''}`} onClick={() => toggleParked('criadoEm')}><span className="th-sort-inner">Criado em <SortIcon dir={parkedCol === 'criadoEm' ? parkedDir : null} /></span></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedParked.map(p => (
                      <tr key={p.id}>
                        <td><span className="dom-mono">{p.domain}</span></td>
                        <td><span className="dom-mono dom-mono--muted">{site.domain}</span></td>
                        <td>{p.criadoEm}</td>
                        <td>
                          <div className="table-actions">
                            {deleteParkedId === p.id ? (
                              <>
                                <span className="dom-confirm-text">Remover?</span>
                                <button className="btn-action btn-action--danger" type="button" onClick={() => { setParked(prev => prev.filter(x => x.id !== p.id)); setDeleteParkedId(null); }}>Sim</button>
                                <button className="btn-action btn-action--secondary" type="button" onClick={() => setDeleteParkedId(null)}>Não</button>
                              </>
                            ) : (
                              <button className="btn-action btn-action--danger" type="button" onClick={() => setDeleteParkedId(p.id)}>Remover</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Redirecionamentos ── */}
      {tab === 'redirecionamentos' && (
        <>
          <div className="dom-card">
            <h3 className="dom-card__title">Criar redirecionamento</h3>
            <p className="dom-card__desc">Redirecione um domínio ou URL para outro destino.</p>
            <div className="dom-form">
              <div className="dom-form__row">
                <div className="dom-field">
                  <label className="dom-label">De</label>
                  <input
                    className="dom-input"
                    type="text"
                    placeholder="ex: www.aurora.workr.com.br"
                    value={redFrom}
                    onChange={e => setRedFrom(e.target.value)}
                  />
                </div>
                <div className="dom-field">
                  <label className="dom-label">Para</label>
                  <input
                    className="dom-input"
                    type="text"
                    placeholder="ex: aurora.workr.com.br"
                    value={redTo}
                    onChange={e => setRedTo(e.target.value)}
                  />
                </div>
                <div className="dom-field dom-field--sm">
                  <label className="dom-label">Tipo</label>
                  <select className="dom-input dom-select filter-select" value={redType} onChange={e => setRedType(e.target.value as '301' | '302')}>
                    <option value="301">301 — Permanente</option>
                    <option value="302">302 — Temporário</option>
                  </select>
                </div>
              </div>
              <div className="dom-form__footer">
                <button
                  className="btn-primary"
                  type="button"
                  onClick={createRedirect}
                  disabled={!redFrom.trim() || !redTo.trim()}
                >
                  Criar
                </button>
              </div>
            </div>
          </div>

          {redirects.length > 0 && (
            <div className="dom-card dom-card--table">
              <h3 className="dom-card__title">Redirecionamentos ativos</h3>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className={`th-sort${redCol === 'from' ? ' th-sort--active' : ''}`} onClick={() => toggleRed('from')}><span className="th-sort-inner">De <SortIcon dir={redCol === 'from' ? redDir : null} /></span></th>
                      <th className={`th-sort${redCol === 'to' ? ' th-sort--active' : ''}`} onClick={() => toggleRed('to')}><span className="th-sort-inner">Para <SortIcon dir={redCol === 'to' ? redDir : null} /></span></th>
                      <th className={`th-sort${redCol === 'type' ? ' th-sort--active' : ''}`} onClick={() => toggleRed('type')}><span className="th-sort-inner">Tipo <SortIcon dir={redCol === 'type' ? redDir : null} /></span></th>
                      <th className={`th-sort${redCol === 'criadoEm' ? ' th-sort--active' : ''}`} onClick={() => toggleRed('criadoEm')}><span className="th-sort-inner">Criado em <SortIcon dir={redCol === 'criadoEm' ? redDir : null} /></span></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRedirects.map(r => (
                      <tr key={r.id}>
                        <td><span className="dom-mono">{r.from}</span></td>
                        <td><span className="dom-mono dom-mono--muted">{r.to}</span></td>
                        <td><span className="dom-badge">{r.type}</span></td>
                        <td>{r.criadoEm}</td>
                        <td>
                          <div className="table-actions">
                            {deleteRedId === r.id ? (
                              <>
                                <span className="dom-confirm-text">Remover?</span>
                                <button className="btn-action btn-action--danger" type="button" onClick={() => { setRedirects(p => p.filter(x => x.id !== r.id)); setDeleteRedId(null); }}>Sim</button>
                                <button className="btn-action btn-action--secondary" type="button" onClick={() => setDeleteRedId(null)}>Não</button>
                              </>
                            ) : (
                              <button className="btn-action btn-action--danger" type="button" onClick={() => setDeleteRedId(r.id)}>Remover</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
