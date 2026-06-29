import { useState } from 'react';
import ChannelEditor, { Canal, DEFAULT_CANAIS } from '../../components/ChannelEditor';
import '../admin/AdminPages.css';
import './CanaisPage.css';

export default function CanaisPage() {
  const [canais, setCanais] = useState<Canal[]>(DEFAULT_CANAIS);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="page canais-page">
      <div className="cp-header">
        <div>
          <h1 className="cp-title">Árvore de canais</h1>
          <p className="cp-subtitle">Configure a navegação do portal — ative, renomeie e reorganize seções e páginas.</p>
        </div>
        <button className="btn-primary" type="button" onClick={handleSave}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Salvar
        </button>
      </div>

      {saved && (
        <div className="cp-toast">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Estrutura de canais salva com sucesso.
        </div>
      )}

      <div className="cp-body">
        <ChannelEditor value={canais} onChange={setCanais} />
      </div>
    </div>
  );
}
