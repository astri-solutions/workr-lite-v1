import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import StickyPageHeader from '../../components/StickyPageHeader';
import SearchInput from '../../components/SearchInput';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useSort } from '../../hooks/useSort';
import SortIcon from '../../components/SortIcon';
import './AdminPages.css';
import './AdminDashboardPage.css';

interface PortalRow {
  id: string;
  portal_key: string;
  cliente: string;
  empresa_status: string | null;
  subdomain: string | null;
  cloudflare_url: string | null;
}


export default function AdminDashboardPage() {
  const { user, enterPortal } = useAuth();
  const navigate = useNavigate();
  const [portais, setPortais] = useState<PortalRow[]>([]);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured || !supabase) { setLoading(false); return; }

      const { data: rows } = await supabase
        .from('portals')
        .select('id, portal_key, cliente, empresa_status, subdomain, cloudflare_url')
        .order('created_at', { ascending: false });

      if (rows) {
        setPortais(rows as PortalRow[]);

        // Count users per portal
        const { data: counts } = await supabase
          .from('portal_users')
          .select('portal_id');
        if (counts) {
          const map: Record<string, number> = {};
          (counts as { portal_id: string }[]).forEach(r => {
            map[r.portal_id] = (map[r.portal_id] ?? 0) + 1;
          });
          setUserCounts(map);
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  const totalAtivos = portais.filter(p => (p.empresa_status ?? 'Ativo') === 'Ativo').length;
  const totalUsuarios = Object.values(userCounts).reduce((a, b) => a + b, 0);

  const filteredPortais = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return portais;
    return portais.filter(p => p.cliente.toLowerCase().includes(q));
  }, [portais, search]);

  const { sorted: sortedPortais, col, dir, toggle } = useSort(filteredPortais);

  function handleAdminSite(portal: PortalRow) {
    enterPortal(portal.portal_key, portal.cliente);
    navigate('/portal/empresas');
  }

  return (
    <div className="page">
      <StickyPageHeader
        title="Dashboard"
        description={`Bem-vindo, ${user?.name ?? ''}.`}
      />

      <div className="dashboard-stats">
        <div className="stat-card">
          <span className="stat-card__value">{portais.length}</span>
          <span className="stat-card__label">Total Portais</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{totalAtivos}</span>
          <span className="stat-card__label">Portais Ativos</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{portais.length}</span>
          <span className="stat-card__label">Total Sites</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{totalUsuarios}</span>
          <span className="stat-card__label">Total Usuários</span>
        </div>
      </div>

      <section className="dashboard-portais-section">
        <div className="toolbar">
          <div className="toolbar__filters">
            <h2 className="dashboard-section-title">Seus Portais</h2>
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome da empresa…" />
          </div>
          <div className="toolbar__actions">
            <span className="toolbar__count">
              {filteredPortais.length} portal{filteredPortais.length !== 1 ? 'is' : ''}
            </span>
          </div>
        </div>
        {loading ? (
          <p className="dashboard-empty">Carregando…</p>
        ) : filteredPortais.length === 0 ? (
          <p className="dashboard-empty">
            {portais.length === 0 ? 'Nenhum portal encontrado.' : 'Nenhum portal encontrado para essa busca.'}
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th className={`th-sort${col === 'cliente' ? ' th-sort--active' : ''}`} onClick={() => toggle('cliente')}><span className="th-sort-inner">Empresa <SortIcon dir={col === 'cliente' ? dir : null} /></span></th>
                  <th className={`th-sort${col === 'empresa_status' ? ' th-sort--active' : ''}`} onClick={() => toggle('empresa_status')}><span className="th-sort-inner">Status <SortIcon dir={col === 'empresa_status' ? dir : null} /></span></th>
                  <th className={`th-sort${col === 'cloudflare_url' ? ' th-sort--active' : ''}`} onClick={() => toggle('cloudflare_url')}><span className="th-sort-inner">URL <SortIcon dir={col === 'cloudflare_url' ? dir : null} /></span></th>
                  <th>Usuários</th>
                  <th style={{ width: 220 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedPortais.map((portal) => (
                  <tr key={portal.id}>
                    <td className="dashboard-portal-row__name">{portal.cliente}</td>
                    <td>
                      <span className={`badge ${(portal.empresa_status ?? 'Ativo') === 'Ativo' ? 'badge--success' : 'badge--error'}`}>
                        {portal.empresa_status ?? 'Ativo'}
                      </span>
                    </td>
                    <td>{portal.cloudflare_url ?? portal.subdomain ?? portal.portal_key}</td>
                    <td>{userCounts[portal.id] ?? 0} usuário{(userCounts[portal.id] ?? 0) !== 1 ? 's' : ''}</td>
                    <td>
                      <div className="dashboard-portal-row__actions">
                        <button
                          className="btn-action btn-action--enter"
                          onClick={() => navigate('/admin/portais')}
                        >
                          Ver portais
                        </button>
                        <button
                          className="btn-action btn-action--publish"
                          onClick={() => handleAdminSite(portal)}
                        >
                          Admin Site
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
