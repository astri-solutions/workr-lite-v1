import { usePublish } from '../contexts/PublishContext';

interface Props {
  disabled?: boolean;
  onClick?: () => void;
}

export default function PublishButton({ disabled, onClick }: Props) {
  const { publish, publishing, publishStatus } = usePublish();
  const handleClick = onClick ?? publish;

  if (publishStatus === 'ok') {
    return (
      <button className="btn-primary btn-primary--ok" type="button" disabled onClick={handleClick}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Publicado!
      </button>
    );
  }

  if (publishStatus === 'err') {
    return (
      <button className="btn-primary btn-primary--err" type="button" onClick={handleClick}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        Tentar novamente
      </button>
    );
  }

  return (
    <button className="btn-primary" type="button" onClick={handleClick} disabled={publishing || disabled}>
      {publishing ? 'Publicando…' : 'Publicar'}
    </button>
  );
}
