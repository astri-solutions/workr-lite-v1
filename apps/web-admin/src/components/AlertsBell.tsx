import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cvmService } from '../services/cvm.service';
import { listPendingReactivationAlerts } from '../services/portalAlerts.service';
import { useAuth } from '../contexts/AuthContext';
import { resolvePortalId } from '../lib/portalDb';
import { fetchPortalConfig } from '../lib/portalConfigApi';
import './AlertsBell.css';

// One shared bell for both roles, each reading its own alert source:
// super_admin sees Auto CVM categories with no destination page yet
// (cvm_alerts, system-wide); a portal (client_user) editor sees their own
// portal's content flagged pending_reactivation (a canal page that was
// deleted and needs to be reactivated) — there was previously no signal
// at all for that second case outside of noticing it by chance in Central
// de Resultados. A third, role-agnostic source nudges toward setting a
// recovery email once someone has actually used the app a few times
// (asking on the very first login reads as friction, not a safety net).
const POLL_INTERVAL_MS = 5 * 60 * 1000;
const ACCESS_COUNT_KEY = 'workr_access_count';
const RECOVERY_EMAIL_NUDGE_AFTER = 3;

interface GenericAlert { id: string; title: string; sub: string; to?: string }

// Counts app loads for the signed-in user (not page navigations — this
// module only runs once per AlertsBell mount, which is once per app load
// since the topbar persists across routes) and returns the ever-updated
// total. Best-effort: a localStorage failure just means the nudge never
// fires, which is harmless.
function bumpAccessCount(userId: string): number {
  try {
    const raw = localStorage.getItem(ACCESS_COUNT_KEY);
    const counts: Record<string, number> = raw ? JSON.parse(raw) : {};
    const next = (counts[userId] ?? 0) + 1;
    counts[userId] = next;
    localStorage.setItem(ACCESS_COUNT_KEY, JSON.stringify(counts));
    return next;
  } catch {
    return 0;
  }
}

async function checkRecoveryEmailNudge(user: { email: string; role: string; activePortalId?: string }): Promise<GenericAlert | null> {
  const accessCount = bumpAccessCount(user.email);
  if (accessCount < RECOVERY_EMAIL_NUDGE_AFTER) return null;

  let hasRecoveryEmail = false;
  if (user.role === 'super_admin') {
    try {
      const raw = localStorage.getItem('admin_informacoes');
      hasRecoveryEmail = !!(raw && JSON.parse(raw)?.emailRecup);
    } catch { /* treat as missing */ }
  } else if (user.activePortalId) {
    const config = await fetchPortalConfig(user.activePortalId);
    const informacoes = config?.informacoes as { emailRecup?: string } | undefined;
    hasRecoveryEmail = !!informacoes?.emailRecup;
  }
  if (hasRecoveryEmail) return null;

  return {
    id: 'recovery-email-nudge',
    title: 'Cadastre um e-mail de recuperação',
    sub: 'Protege sua conta caso você perca acesso ao e-mail principal.',
    to: user.role === 'super_admin' ? '/admin/informacoes' : '/portal/informacoes',
  };
}

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
      const nudge = user ? await checkRecoveryEmailNudge(user) : null;
      if (isSuperAdmin) {
        const rows = await cvmService.listAlerts();
        if (!cancelled) setAlerts([
          ...(nudge ? [nudge] : []),
          ...rows.map(a => ({
            id: a.id,
            title: `${a.cvmCategoryLabel} sem página de destino`,
            sub: `${a.empresaNome} · ${a.portalNome}`,
          })),
        ]);
        return;
      }
      const portalDbId = user?.activePortalId ? await resolvePortalId(user.activePortalId) : null;
      const rows = await listPendingReactivationAlerts(portalDbId);
      if (!cancelled) setAlerts([...(nudge ? [nudge] : []), ...rows]);
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

  function goToDestination(alert?: GenericAlert) {
    setOpen(false);
    navigate(alert?.to ?? (isSuperAdmin ? '/admin/auto-cvm' : '/portal/central-de-resultados'));
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
                  <li key={a.id} className="alerts-bell__item" onClick={() => goToDestination(a)}>
                    <span className="material-symbols-outlined alerts-bell__item-icon">report</span>
                    <span className="alerts-bell__item-text">
                      <strong>{a.title}</strong>
                      <span className="alerts-bell__item-sub">{a.sub}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <button type="button" className="alerts-bell__cta" onClick={() => goToDestination(alerts[0])}>
                {alerts[0].to ? 'Ver alerta' : (isSuperAdmin ? 'Configurar em Auto CVM' : 'Ver em Central de Resultados')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
