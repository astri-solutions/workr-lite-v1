import { useState, useRef } from 'react';
import PageHeader from '../../components/PageHeader';
import UnsavedModal from '../../components/UnsavedModal';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import PORTAL_CONFIG from '../../portalConfig';
import '../admin/AdminPages.css';
import './PersonalizarPages.css';

export default function FaviconPage() {
  const [favicon, setFavicon] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDirty = !saved && favicon !== null;
  const blocker = useUnsavedChanges(isDirty);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setFavicon(ev.target?.result as string); setSaved(false); };
    reader.readAsDataURL(file);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="page">
      <PageHeader
        title="Favicon"
        description={<>Ícone do portal <strong>{PORTAL_CONFIG.name}</strong> exibido nas abas do navegador.</>}
        action={
          <button className="btn-primary" type="button" onClick={handleSave}>
            {saved ? 'Salvo!' : 'Salvar alterações'}
          </button>
        }
      />

      <div className="pers-section">
        <h2 className="pers-section__title">Arquivo do favicon</h2>
        <p className="pers-section__desc">Recomendado: ICO ou PNG quadrado, 32×32px ou 64×64px. O arquivo será convertido automaticamente para .ico.</p>

        <input ref={inputRef} type="file" accept=".ico,.png,.svg" style={{ display: 'none' }} onChange={handleFile} />

        {favicon ? (
          <div className="fav-preview">
            <div className="fav-preview__browser">
              <div className="fav-preview__tab">
                <img src={favicon} alt="favicon" className="fav-preview__icon" />
                <span className="fav-preview__tab-label">Meu Portal RI</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
            </div>
            <div className="fav-preview__actions">
              <button type="button" className="logo-btn logo-btn--replace" onClick={() => inputRef.current?.click()}>Substituir</button>
              <button type="button" className="logo-btn logo-btn--remove" onClick={() => { setFavicon(null); setSaved(false); }}>Remover</button>
            </div>
          </div>
        ) : (
          <button type="button" className="logo-dropzone" onClick={() => inputRef.current?.click()}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="logo-dropzone__text">Clique para enviar favicon</span>
            <span className="logo-dropzone__hint">ICO, PNG ou SVG — máx. 512KB</span>
          </button>
        )}
      </div>

      <div className="pers-section">
        <h2 className="pers-section__title">Onde o favicon aparece</h2>
        <div className="fav-examples">
          <div className="fav-example">
            <div className="fav-example__icon">{favicon ? <img src={favicon} alt="" width="16" height="16" /> : <div className="fav-example__placeholder" />}</div>
            <span>Aba do navegador</span>
          </div>
          <div className="fav-example">
            <div className="fav-example__icon">{favicon ? <img src={favicon} alt="" width="20" height="20" /> : <div className="fav-example__placeholder" style={{ width: 20, height: 20 }} />}</div>
            <span>Bookmark / favorito</span>
          </div>
          <div className="fav-example">
            <div className="fav-example__icon">{favicon ? <img src={favicon} alt="" width="24" height="24" /> : <div className="fav-example__placeholder" style={{ width: 24, height: 24 }} />}</div>
            <span>Ícone mobile</span>
          </div>
        </div>
      </div>

      <UnsavedModal
        open={blocker.state === 'blocked'}
        onStay={() => blocker.reset?.()}
        onLeave={() => blocker.proceed?.()}
      />
    </div>
  );
}
