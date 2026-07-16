/** Returns a portal-scoped localStorage key. Falls back to the base key when portalId is absent. */
export function pKey(base: string, portalId: string | undefined): string {
  return portalId ? `${base}_${portalId}` : base;
}
