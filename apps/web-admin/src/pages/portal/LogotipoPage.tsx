import { useState, useRef } from 'react';
import StickyPageHeader from '../../components/StickyPageHeader';
import UnsavedModal from '../../components/UnsavedModal';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import PORTAL_CONFIG from '../../portalConfig';
import '../admin/AdminPages.css';
import './PersonalizarPages.css';

export default function LogotipoPage() {
  const [logo, setLogo] = useState<string | null>(null);
  const [logoCollapsed, setLogoCollapsed] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputCollRef = useRef<HTMLInputElement>(null);

  const isDirty = !saved && (logo !== null || logoCollapsed !== null);
  const blocker = useUnsavedChanges(isDirty);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setter(ev.target?.result as string); setSaved(false); };
    reader.readAsDataURL(file);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="page">
      <StickyPageHeader
        title="Logotipo"
        description={<>Logotipos exibidos no portal <strong>{PORTAL_CONFIG.name}</strong>.</>}
        action={
          <button className="btn-primary" type="button" onClick={handleSave}>
            {saved ? 'Salvo!' : 'Salvar alterações'}
          </button>
        }
      />

      <div className="logo-grid">
        <UploadArea
          title="Logotipo principal"
          desc="Exibido no header do portal. Recomendado: SVG ou PNG transparente, 300×80px mínimo."
          value={logo}
          onChange={v => { setLogo(v); setSaved(false); }}
          inputRef={inputRef}
          onPickFile={() => inputRef.current?.click()}
          onClear={() => { setLogo(null); setSaved(false); }}
          inputEl={<input ref={inputRef} type="file" accept=".svg,.png,.jpg,.webp" style={{ display: 'none' }}
            onChange={e => handleFile(e, setLogo)} />}
        />
        <UploadArea
          title="Logo compacto (sidebar/favicon nav)"
          desc="Versão reduzida usada quando a sidebar está recolhida. Recomendado: ícone quadrado 80×80px."
          value={logoCollapsed}
          onChange={v => { setLogoCollapsed(v); setSaved(false); }}
          inputRef={inputCollRef}
          onPickFile={() => inputCollRef.current?.click()}
          onClear={() => { setLogoCollapsed(null); setSaved(false); }}
          inputEl={<input ref={inputCollRef} type="file" accept=".svg,.png,.jpg,.webp" style={{ display: 'none' }}
            onChange={e => handleFile(e, setLogoCollapsed)} />}
        />
      </div>

      <UnsavedModal
        open={blocker.state === 'blocked'}
        onStay={() => blocker.reset?.()}
        onLeave={() => blocker.proceed?.()}
      />
    </div>
  );
}

function UploadArea({ title, desc, value, onPickFile, onClear, inputEl }: {
  title: string; desc: string; value: string | null;
  onChange: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  onPickFile: () => void; onClear: () => void; inputEl: React.ReactNode;
}) {
  return (
    <div className="pers-section">
      <h2 className="pers-section__title">{title}</h2>
      <p className="pers-section__desc">{desc}</p>
      {inputEl}
      {value ? (
        <div className="logo-preview">
          <img src={value} alt="Logo preview" className="logo-preview__img" />
          <div className="logo-preview__actions">
            <button type="button" className="logo-btn logo-btn--replace" onClick={onPickFile}>Substituir</button>
            <button type="button" className="logo-btn logo-btn--remove" onClick={onClear}>Remover</button>
          </div>
        </div>
      ) : (
        <button type="button" className="logo-dropzone" onClick={onPickFile}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span className="logo-dropzone__text">Clique para enviar arquivo</span>
          <span className="logo-dropzone__hint">SVG, PNG ou JPG — máx. 2MB</span>
        </button>
      )}
    </div>
  );
}
