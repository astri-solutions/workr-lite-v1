import { useAuth } from '../contexts/AuthContext';
import PORTAL_CONFIG from '../portalConfig';

function nameFromStorage(id: string | undefined): string | undefined {
  if (!id) return undefined;
  try {
    const portais = JSON.parse(localStorage.getItem('workr_portais') ?? '[]') as Array<{ id: string; cliente?: string }>;
    return portais.find(p => p.id === id)?.cliente;
  } catch {
    return undefined;
  }
}

/** Returns the active portal's display name. Checks auth session first, then workr_portais localStorage. */
export function usePortalName(): string {
  const { user } = useAuth();
  const activeId = user?.activePortalId;

  const fromSession =
    user?.portais?.find(p => p.id === activeId)?.nome ??
    user?.portais?.[0]?.nome;

  return fromSession ?? nameFromStorage(activeId) ?? PORTAL_CONFIG.name;
}
