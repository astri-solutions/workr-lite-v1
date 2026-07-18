import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { pKey } from '../utils/portalStorage';
import { fetchPortalConfig } from '../lib/portalConfigApi';

interface PublishContextValue {
  publish: () => Promise<boolean>;
  publishing: boolean;
  publishStatus: 'idle' | 'ok' | 'err';
  hasPendingDraft: boolean;
  notifyDraft: () => void;
}

const PublishContext = createContext<PublishContextValue>({
  publish: async () => false,
  publishing: false,
  publishStatus: 'idle',
  hasPendingDraft: false,
  notifyDraft: () => {},
});

export function usePublish() {
  return useContext(PublishContext);
}

const DRAFT_PENDING_KEY = 'portal_draft_pending';

export function PublishProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const activePortal = (user?.portais ?? []).find(p => p.id === user?.activePortalId) ?? user?.portais?.[0];
  const pid = activePortal?.id;
  const draftKey = pid ? pKey(DRAFT_PENDING_KEY, pid) : null;

  const [publishing, setPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [hasPendingDraft, setHasPendingDraft] = useState(false);

  // Sync hasPendingDraft from localStorage when the active portal becomes known
  useEffect(() => {
    if (!draftKey) return;
    setHasPendingDraft(localStorage.getItem(draftKey) === 'true');
  }, [draftKey]);

  function notifyDraft() {
    if (draftKey) localStorage.setItem(draftKey, 'true');
    setHasPendingDraft(true);
  }

  async function publish(): Promise<boolean> {
    setPublishing(true);
    setPublishStatus('idle');
    try {
      const activePortal = (user?.portais ?? []).find(p => p.id === user?.activePortalId) ?? user?.portais?.[0];
      const pid = activePortal?.id;

      const ls = (key: string) => { try { return JSON.parse(localStorage.getItem(pKey(key, pid)) ?? 'null'); } catch { return null; } };

      // Fetch from Supabase as authoritative source; fall back to localStorage
      // so any user's publish reflects the last saved state, not their own browser's cache.
      let remoteConfig: Record<string, unknown> | null = null;
      try { remoteConfig = pid ? await fetchPortalConfig(pid) : null; } catch { /* use localStorage */ }

      // Empty {} / [] in portal_config means "never configured" (column defaults) —
      // fall through to localStorage instead of publishing empty values.
      const nonEmpty = (v: unknown) => {
        if (v === null || v === undefined) return null;
        if (Array.isArray(v)) return v.length > 0 ? v : null;
        if (typeof v === 'object') return Object.keys(v as object).length > 0 ? v : null;
        return v;
      };

      const cores      = nonEmpty(remoteConfig?.cores)      ?? ls('portal_cores');
      const fontes     = nonEmpty(remoteConfig?.fontes)     ?? ls('portal_fontes');
      const footer     = nonEmpty(remoteConfig?.footer)     ?? ls('portal_footer');
      const ticker     = nonEmpty(remoteConfig?.ticker)     ?? ls('portal_ticker');
      const canais     = nonEmpty(remoteConfig?.canais)     ?? ls('portal_canais');
      const splash     = nonEmpty(remoteConfig?.splash)     ?? ls('portal_splash');
      const cookies    = nonEmpty(remoteConfig?.cookies)    ?? ls('portal_cookies');
      const errorPages = nonEmpty(remoteConfig?.error_pages) ?? ls('portal_error_pages');
      const bannerRaw  = nonEmpty(remoteConfig?.banner_slides) ?? ls('portal_banner');

      const empresasRaw: Array<{ id: string; nome: string; ativo: boolean }> | null =
        (nonEmpty(remoteConfig?.empresas) as Array<{ id: string; nome: string; ativo: boolean }> | null) ??
        (() => { try { return JSON.parse(localStorage.getItem(`portal_empresas_${pid ?? 'default'}`) ?? 'null'); } catch { return null; } })();
      const empresas = (empresasRaw ?? [])
        .filter(e => e.ativo)
        .map(e => ({ id: e.id, label: e.nome, short: e.nome.split(' ').filter((w: string) => w.length > 2).map((w: string) => w[0]).join('').toUpperCase() || e.nome.slice(0, 3).toUpperCase() }));

      const banner = Array.isArray(bannerRaw)
        ? bannerRaw.map((s: Record<string, unknown>) => ({ ...s, imagem: null }))
        : null;

      function extractAsset(dataUrl: string | null): { base64: string; ext: string } | null {
        if (!dataUrl?.startsWith('data:')) return null;
        const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!m) return null;
        const extMap: Record<string, string> = {
          'image/svg+xml': 'svg', 'image/png': 'png',
          'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif',
          'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico',
        };
        return { base64: m[2], ext: extMap[m[1]] ?? 'png' };
      }
      const logo    = extractAsset(localStorage.getItem(pKey('portal_logotipo', pid)));
      const favicon = extractAsset(localStorage.getItem(pKey('portal_favicon', pid)));

      const portaisRaw = localStorage.getItem('workr_portais');
      const portaisArr = portaisRaw ? JSON.parse(portaisRaw) : [];
      const portalRecord = portaisArr.find((p: { id: string }) => p.id === activePortal?.id);
      const repoName: string | undefined = portalRecord?.githubRepo;

      if (!isSupabaseConfigured || !supabase) {
        setPublishStatus('ok');
        setTimeout(() => setPublishStatus('idle'), 3000);
        return true;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setPublishStatus('err'); return false; }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/publish-config`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
          },
          body: JSON.stringify({
            repoName: repoName ?? (portalRecord?.subdomain ? `portal-${portalRecord.subdomain}` : undefined),
            portalId: activePortal?.id,
            portalNome: activePortal?.nome ?? '',
            layout: (remoteConfig?.layout as string | undefined) ?? localStorage.getItem(pKey('portal_layout', pid)) ?? 'sidebar',
            colors: cores ?? { primary: '#0B5B68', secondary: '#00D865', tertiary: '#F4A261' },
            fonts: fontes ? { display: fontes.heading ?? fontes.display, body: fontes.body } : { display: 'Plus Jakarta Sans', body: 'Inter' },
            footer: footer ?? null,
            ticker: ticker ?? null,
            canais: canais ?? [],
            empresas,
            splash:     splash ?? null,
            cookies:    cookies ?? null,
            errorPages: errorPages ?? null,
            banner:     banner ?? null,
            logo:       logo ?? null,
            favicon:    favicon ?? null,
          }),
        }
      );

      if (res.ok) {
        // Clear the global pending draft flag on successful publish
        if (draftKey) localStorage.removeItem(draftKey);
        setHasPendingDraft(false);
        setPublishStatus('ok');
        setTimeout(() => setPublishStatus('idle'), 4000);
        return true;
      } else {
        setPublishStatus('err');
        setTimeout(() => setPublishStatus('idle'), 4000);
        return false;
      }
    } catch {
      setPublishStatus('err');
      setTimeout(() => setPublishStatus('idle'), 4000);
      return false;
    } finally {
      setPublishing(false);
    }
  }

  return (
    <PublishContext.Provider value={{ publish, publishing, publishStatus, hasPendingDraft, notifyDraft }}>
      {children}
    </PublishContext.Provider>
  );
}
