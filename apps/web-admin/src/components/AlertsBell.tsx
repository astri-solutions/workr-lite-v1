import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cvmService } from '../services/cvm.service';
import type { CvmAlert } from '../services/cvm.types';
import './AlertsBell.css';

// Auto CVM categories with no valid routing page yet — polled from
// cvm_alerts so a super_admin finds out without opening Auto CVM and
// scrolling through "Destinos de importação" on their own. Portal client
// users never see this feature, so nothing is fetched for them.
const POLL_INTERVAL_MS = 5 * 60 * 1000;

export default function AlertsBell() {
  const [alerts, setAlerts] = useState<CvmAlert[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const rows = await cvmService.listAlerts();
      if (!cancelled) setAlerts(rows);
    }
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  function goToAutoCvm() {
    setOpen(false);
    navigate('/admin/auto-cvm');
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
                  <li key={a.id} className="alerts-bell__item" onClick={goToAutoCvm}>
                    <span className="material-symbols-outlined alerts-bell__item-icon">report</span>
                    <span className="alerts-bell__item-text">
                      <strong>{a.cvmCategoryLabel}</strong> sem página de destino
                      <span className="alerts-bell__item-sub">{a.empresaNome} · {a.portalNome}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <button type="button" className="alerts-bell__cta" onClick={goToAutoCvm}>
                Configurar em Auto CVM
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
