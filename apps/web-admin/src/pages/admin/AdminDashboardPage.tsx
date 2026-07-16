import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import StickyPageHeader from '../../components/StickyPageHeader';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import './AdminPages.css';
import './AdminDashboardPage.css';

interface PortalRow {
  id: string;
  portal_key: string;
  cliente: string;
  empresa_status: string | null;
  subdomain: string | null;
  vercel_url: string | null;
}


export default function AdminDashboardPage() {
  const { user, enterPortal } = useAuth();
  const navigate = useNavigate();
  const [portais, setPortais] = useState<PortalRow[]>([]);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured || !supabase) { setLoading(false); return; }

      const { data: rows } = await supabase
        .from('portals')
        .select('id, portal_key, cliente, empresa_status, subdomain, vercel_url')
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
        <h2 className="dashboard-section-title">Seus Portais</h2>
        {loading ? (
          <p className="dashboard-empty">Carregando…</p>
        ) : portais.length === 0 ? (
          <p className="dashboard-empty">Nenhum portal encontrado.</p>
        ) : (
          <div className="dashboard-portais-grid">
            {portais.map((portal) => (
              <div key={portal.id} className="dashboard-portal-card">
                <div className="dashboard-portal-card__header">
                  <span className="dashboard-portal-card__name">{portal.cliente}</span>
                  <span className={`badge ${(portal.empresa_status ?? 'Ativo') === 'Ativo' ? 'badge--success' : 'badge--error'}`}>
                    {portal.empresa_status ?? 'Ativo'}
                  </span>
                </div>
                <div className="dashboard-portal-card__meta">
                  <span className="dashboard-portal-card__empresa">
                    {portal.vercel_url ?? portal.subdomain ?? portal.portal_key}
                  </span>
                  <span className="dashboard-portal-card__sites">
                    {userCounts[portal.id] ?? 0} usuário{(userCounts[portal.id] ?? 0) !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="dashboard-portal-card__actions">
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
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
