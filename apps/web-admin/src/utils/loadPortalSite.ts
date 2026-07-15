export interface PortalSiteInfo {
  siteId: string;
  portalId: string;
  cliente: string;
  link: string;
  ip: string;
  status: 'Ativo' | 'Suspenso';
  criadoEm: string;
  githubRepo?: string;
  vercelUrl?: string;
  subdomain?: string;
}

export function loadPortalSite(siteId: string): PortalSiteInfo | undefined {
  try {
    const raw = localStorage.getItem('workr_portais');
    const portals: Array<{
      id: string; cliente: string; criadoEm: string;
      githubRepo?: string; vercelUrl?: string; subdomain?: string;
      sites: Array<{ id: string; link: string; status: string; ip?: string }>;
    }> = raw ? JSON.parse(raw) : [];
    for (const portal of portals) {
      const s = portal.sites?.find(s => s.id === siteId);
      if (s) {
        return {
          siteId: s.id,
          portalId: portal.id,
          cliente: portal.cliente,
          link: s.link,
          ip: s.ip || '—',
          status: (s.status as 'Ativo' | 'Suspenso') ?? 'Ativo',
          criadoEm: portal.criadoEm,
          githubRepo: portal.githubRepo,
          vercelUrl: portal.vercelUrl,
          subdomain: portal.subdomain,
        };
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}
