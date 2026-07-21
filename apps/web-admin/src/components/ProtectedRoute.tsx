import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Modal from './Modal';

type RouteAccess = 'super_admin' | 'client_user';

interface ProtectedRouteProps {
  children: JSX.Element;
  requiredRole: RouteAccess;
}

// Security: auto-logout after IDLE_MS of no interaction, warning WARNING_MS
// before it happens — an unattended/forgotten open tab shouldn't keep a
// session valid indefinitely (Supabase's own token expiry is much longer).
const IDLE_MS = 30 * 60 * 1000;   // 30 min total inactivity
const WARNING_MS = 60 * 1000;     // warn 1 min before logging out
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;

function useIdleLogout(active: boolean, onIdle: () => void) {
  const [showWarning, setShowWarning] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) return;

    function resetTimers() {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (warnTimer.current) clearTimeout(warnTimer.current);
      setShowWarning(false);
      warnTimer.current = setTimeout(() => setShowWarning(true), IDLE_MS - WARNING_MS);
      idleTimer.current = setTimeout(onIdle, IDLE_MS);
    }

    // Any activity — including moving the mouse while the warning is up —
    // resets the cycle and dismisses the warning, matching the usual
    // "still there?" pattern (Gmail, AWS console, etc).
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, resetTimers));
    resetTimers();

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (warnTimer.current) clearTimeout(warnTimer.current);
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetTimers));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function stayLoggedIn() {
    setShowWarning(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (warnTimer.current) clearTimeout(warnTimer.current);
    warnTimer.current = setTimeout(() => setShowWarning(true), IDLE_MS - WARNING_MS);
    idleTimer.current = setTimeout(onIdle, IDLE_MS);
  }

  return { showWarning, stayLoggedIn };
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, logout } = useAuth();
  const { showWarning, stayLoggedIn } = useIdleLogout(!!user, () => { logout(); });

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdminRole = user.role === 'super_admin' || user.role === 'admin';
  const isClientRole = user.role === 'client_user' || user.role === 'editor' || user.role === 'viewer';
  const hasPortais = (user.portais?.length ?? 0) > 0;

  const idleModal = (
    <Modal
      open={showWarning}
      onClose={stayLoggedIn}
      title="Sua sessão está prestes a expirar"
      size="sm"
      footer={
        <div className="modal-footer">
          <button className="btn-outline" type="button" onClick={() => logout()}>Sair agora</button>
          <button className="btn-primary" type="button" onClick={stayLoggedIn}>Continuar conectado</button>
        </div>
      }
    >
      <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', lineHeight: 1.6 }}>
        Por inatividade, você será desconectado em instantes. Clique em "Continuar conectado" para permanecer na sessão.
      </p>
    </Modal>
  );

  if (requiredRole === 'super_admin') {
    // /admin route: allow super_admin and admin
    if (isAdminRole) return <>{children}{idleModal}</>;
    // client roles: redirect to portal
    return <Navigate to="/portal" replace />;
  }

  if (requiredRole === 'client_user') {
    // /portal route: allow client roles
    if (isClientRole) return <>{children}{idleModal}</>;
    // admin roles with portais can enter portal (to admin a site)
    if (isAdminRole && hasPortais) return <>{children}{idleModal}</>;
    // admin roles without portais: back to admin
    if (isAdminRole) return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return <Navigate to="/login" replace />;
}
