import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cvmService } from '../services/cvm.service';
import { listPendingReactivationAlerts } from '../services/portalAlerts.service';
import { useAuth } from '../contexts/AuthContext';
import { resolvePortalId } from '../lib/portalDb';
import './AlertsBell.css';

// One shared bell for both roles, each reading its own alert source:
// super_admin sees Auto CVM categories with no destination page yet
// (cvm_alerts, system-wide); a portal (client_user) editor sees their own
// portal's content flagged pending_reactivation (a canal page that was
// deleted and needs to be reactivated) — there was previously no signal
// at all for that second case outside of noticing it by chance in Central
// de Resultados.
const POLL_INTERVAL_MS = 5 * 60 * 1000;

interface GenericAlert { id: string; title: string; sub: string }

export default function AlertsBell() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const [alerts, setAlerts] = useState<GenericAlert[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (isSuperAdmin) {
        const rows = await cvmService.listAlerts();
        if (!cancelled) setAlerts(rows.map(a => ({
          id: a.id,
          title: `${a.cvmCategoryLabel} sem página de destino`,
          sub: `${a.empresaNome} · ${a.portalNome}`,
        })));
        return;
      }
      const portalDbId = user?.activePortalId ? await resolvePortalId(user.activePortalId) : null;
      const rows = await listPendingReactivationAlerts(portalDbId);
      if (!cancelled) setAlerts(rows);
    }
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isSuperAdmin, user?.activePortalId]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  function goToDestination() {
    setOpen(false);
    navigate(isSuperAdmin ? '/admin/auto-cvm' : '/portal/central-de-resultados');
  }

  return (
    <div className="alerts-bell" ref={wrapRef}>
      <button
        className="admin-topbar__alert-btn"
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>notifications</span>
        <span>Alertas</span>
        {alerts.length > 0 && <span className="alerts-bell__badge">{alerts.length > 9 ? '9+' : alerts.length}</span>}
      </button>

      {open && (
        <div className="alerts-bell__dropdown" role="menu">
          <div className="alerts-bell__header">Alertas</div>
          {alerts.length === 0 ? (
            <p className="alerts-bell__empty">Nenhum alerta pendente.</p>
          ) : (
            <>
              <ul className="alerts-bell__list">
                {alerts.map(a => (
                  <li key={a.id} className="alerts-bell__item" onClick={goToDestination}>
                    <span className="material-symbols-outlined alerts-bell__item-icon">report</span>
                    <span className="alerts-bell__item-text">
                      <strong>{a.title}</strong>
                      <span className="alerts-bell__item-sub">{a.sub}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <button type="button" className="alerts-bell__cta" onClick={goToDestination}>
                {isSuperAdmin ? 'Configurar em Auto CVM' : 'Ver em Central de Resultados'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
