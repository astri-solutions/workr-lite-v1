import { useEffect, useState } from 'react';
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
  // Starts as the plain link (still fully functional — cores/fontes/menu/
  // footer/etc. all preview without a token) and upgrades in place once the
  // token arrives. A real <a href> is used throughout: unlike
  // window.open() after an await, anchor navigation on click is never
  // treated as a blocked popup by the browser, so this can never open a
  // blank tab the way an async-then-window.open flow can.
  const [url, setUrl] = useState<string | null>(previewBase ? `${previewBase.url}/?preview=1` : null);

  useEffect(() => {
    if (!previewBase) { setUrl(null); return; }
    setUrl(`${previewBase.url}/?preview=1`);
    let cancelled = false;
    (async () => {
      if (!isSupabaseConfigured || !supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mint-preview-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        },
        body: JSON.stringify({ portalId: previewBase.portalId }),
      });
      if (!res.ok || cancelled) return;
      const { token: previewToken } = await res.json();
      if (previewToken && !cancelled) setUrl(`${previewBase.url}/?preview=1&token=${encodeURIComponent(previewToken)}`);
    })().catch(() => { /* keep the plain link on any failure */ });
    return () => { cancelled = true; };
  }, [previewBase?.url, previewBase?.portalId]);

  if (!url) return null;
  return (
    <a className="btn-outline" href={url} target="_blank" rel="noreferrer"
      title="Ver o site ao vivo com as alterações ainda não publicadas">
      Pré-visualizar
    </a>
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
