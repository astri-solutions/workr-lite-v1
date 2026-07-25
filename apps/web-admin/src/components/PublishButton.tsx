import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePublish } from '../contexts/PublishContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface Props {
  disabled?: boolean;
  onClick?: () => void;
}

// Best-effort preview URL for the active portal's live site — mirrors the
// same `workr_portais` lookup PublishContext already uses to resolve
// repoName, so this stays in sync without a new data source.
function usePreviewBase(): { url: string; portalId: string } | null {
  const { user } = useAuth();
  try {
    const portais: Array<{ id: string; vercelUrl?: string; subdomain?: string }> =
      JSON.parse(localStorage.getItem('workr_portais') ?? '[]');
    const activeId = user?.activePortalId ?? user?.portais?.[0]?.id;
    if (!activeId) return null;
    const record = portais.find(p => p.id === activeId);
    if (!record) return null;
    const base = record.vercelUrl || (record.subdomain ? `https://workr-portal-${record.subdomain}.vercel.app` : null);
    return base ? { url: base.replace(/\/$/, ''), portalId: activeId } : null;
  } catch { return null; }
}

function PreviewLink() {
  const previewBase = usePreviewBase();
  const [loading, setLoading] = useState(false);

  if (!previewBase) return null;

  // Best-effort: mints a short-lived token so the preview can also show
  // draft matérias/documentos/resultados (not just config); if that call
  // fails for any reason, still open the plain ?preview=1 link — that
  // already covers cores/fontes/menu/footer/etc. on its own.
  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (loading || !previewBase) return;
    setLoading(true);
    // Open the tab synchronously (inside the click handler) so browsers
    // don't treat it as a blocked popup — its location is set once the
    // token (or the fallback URL) is ready below.
    const tab = window.open('', '_blank', 'noreferrer');
    let url = `${previewBase.url}/?preview=1`;
    try {
      if (isSupabaseConfigured && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (token) {
          const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mint-preview-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
            },
            body: JSON.stringify({ portalId: previewBase.portalId }),
          });
          if (res.ok) {
            const { token: previewToken } = await res.json();
            if (previewToken) url += `&token=${encodeURIComponent(previewToken)}`;
          }
        }
      }
    } catch { /* fall back to the plain preview link below */ }
    finally {
      setLoading(false);
      if (tab) tab.location.href = url;
      else window.open(url, '_blank', 'noreferrer');
    }
  }

  return (
    <button className="btn-outline" type="button" onClick={handleClick} disabled={loading}
      title="Ver o site ao vivo com as alterações ainda não publicadas">
      {loading ? 'Abrindo…' : 'Pré-visualizar'}
    </button>
  );
}

export default function PublishButton({ disabled, onClick }: Props) {
  const { publish, publishing, publishStatus } = usePublish();
  const handleClick = onClick ?? publish;

  if (publishStatus === 'ok') {
    return (
      <>
        <PreviewLink />
        <button className="btn-primary btn-primary--ok" type="button" disabled onClick={handleClick}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Publicado!
        </button>
      </>
    );
  }

  if (publishStatus === 'err') {
    return (
      <>
        <PreviewLink />
        <button className="btn-primary btn-primary--err" type="button" onClick={handleClick}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Tentar novamente
        </button>
      </>
    );
  }

  return (
    <>
      <PreviewLink />
      <button className="btn-primary" type="button" onClick={handleClick} disabled={publishing || disabled}>
        {publishing ? 'Publicando…' : 'Publicar'}
      </button>
    </>
  );
}
