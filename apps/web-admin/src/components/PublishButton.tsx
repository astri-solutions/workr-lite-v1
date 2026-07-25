import { useAuth } from '../contexts/AuthContext';
import { usePublish } from '../contexts/PublishContext';

interface Props {
  disabled?: boolean;
  onClick?: () => void;
}

// Best-effort preview URL for the active portal's live site — mirrors the
// same `workr_portais` lookup PublishContext already uses to resolve
// repoName, so this stays in sync without a new data source.
function usePreviewUrl(): string | null {
  const { user } = useAuth();
  try {
    const portais: Array<{ id: string; vercelUrl?: string; subdomain?: string }> =
      JSON.parse(localStorage.getItem('workr_portais') ?? '[]');
    const activeId = user?.activePortalId ?? user?.portais?.[0]?.id;
    const record = portais.find(p => p.id === activeId);
    if (!record) return null;
    const base = record.vercelUrl || (record.subdomain ? `https://workr-portal-${record.subdomain}.vercel.app` : null);
    return base ? `${base.replace(/\/$/, '')}/?preview=1` : null;
  } catch { return null; }
}

function PreviewLink() {
  const previewUrl = usePreviewUrl();
  if (!previewUrl) return null;
  return (
    <a className="btn-outline" href={previewUrl} target="_blank" rel="noreferrer"
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
