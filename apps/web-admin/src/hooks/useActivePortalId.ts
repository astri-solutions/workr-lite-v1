import { useAuth } from '../contexts/AuthContext';

/** Returns the active portal ID from the auth session. */
export function useActivePortalId(): string | undefined {
  const { user } = useAuth();
  return user?.activePortalId ?? user?.portais?.[0]?.id;
}
