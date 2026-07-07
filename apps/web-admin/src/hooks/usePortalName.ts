import { useAuth } from '../contexts/AuthContext';
import PORTAL_CONFIG from '../portalConfig';

/** Returns the active portal's display name from the auth session.
 *  Falls back to PORTAL_CONFIG.name when no session portal is set (e.g. super_admin). */
export function usePortalName(): string {
  const { user } = useAuth();
  if (!user?.portais?.length) return PORTAL_CONFIG.name;
  return (
    user.portais.find(p => p.id === user.activePortalId)?.nome ??
    user.portais[0].nome ??
    PORTAL_CONFIG.name
  );
}
