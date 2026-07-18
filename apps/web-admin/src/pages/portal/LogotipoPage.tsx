import { useState, useRef } from 'react';
import StickyPageHeader from '../../components/StickyPageHeader';
import UnsavedModal from '../../components/UnsavedModal';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { usePortalName } from '../../hooks/usePortalName';
import { useActivePortalId } from '../../hooks/useActivePortalId';
import { processImageToDataUrl } from '../../utils/imageProcessor';
import { pKey } from '../../utils/portalStorage';
import { usePublish } from '../../contexts/PublishContext';
import { savePortalConfig } from '../../lib/portalConfigApi';
import '../admin/AdminPages.css';
import './PersonalizarPages.css';

export const LOGO_KEY = 'portal_logotipo';
export const LOGO_COMPACT_KEY = 'portal_logotipo_compact';

export default function LogotipoPage() {
  const portalName = usePortalName();
  const portalId = useActivePortalId();

  const logoKey = pKey(LOGO_KEY, portalId);
  const logoCompactKey = pKey(LOGO_COMPACT_KEY, portalId);

  // State holds data URLs (base64) which survive page reloads and are usable in <img src>
  const { publish, publishing, hasPendingDraft, notifyDraft } = usePublish();
  const [baseLogo] = useState<string | null>(() => localStorage.getItem(logoKey));
  const [baseCollapsed] = useState<string | null>(() => localStorage.getItem(logoCompactKey));
  const [logo, setLogo] = useState<string | null>(baseLogo);
  const [logoCollapsed, setLogoCollapsed] = useState<string | null>(baseCollapsed);
  const [isDraft, setIsDraft] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputCollRef = useRef<HTMLInputElement>(null);
  const pendingLogoDataUrl = useRef<string | null>(null);
  const pendingLogoCollDataUrl = useRef<string | null>(null);
  const logoBlobUrlRef = useRef<string | null>(null);
  const logoCollBlobUrlRef = useRef<string | null>(null);

  const isDirty = logo !== baseLogo || logoCollapsed !== baseCollapsed;
  const blocker = useUnsavedChanges(isDirty);

  async function handleFile(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string) => void,
    pendingRef: React.MutableRefObject<string | null>,
    blobUrlRef: React.MutableRefObject<string | null>,
    slot: 'logo' | 'logo-compact',
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await processImageToDataUrl(file, slot);
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    blobUrlRef.current = result.objectUrl;
    pendingRef.current = result.dataUrl;
    setter(result.dataUrl); // use data URL so preview also works after reload
  }

  function saveDraft() {
    if (logo) localStorage.setItem(logoKey, logo);
    else localStorage.removeItem(logoKey);
    if (logoCollapsed) localStorage.setItem(logoCompactKey, logoCollapsed);
    else localStorage.removeItem(logoCompactKey);
    pendingLogoDataUrl.current = null;
    pendingLogoCollDataUrl.current = null;
    // Persist logo extension to Supabase so publish-config uses the correct file extension
    if (portalId && logo) {
      const m = logo.match(/^data:([^;]+);base64,/);
      const extMap: Record<string, string> = {
        'image/svg+xml': 'svg', 'image/png': 'png',
        'image/jpeg': 'jpg', 'image/webp': 'webp',
        'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico',
      };
      const ext = m ? (extMap[m[1]] ?? 'png') : undefined;
      if (ext) savePortalConfig(portalId, { logo_ext: ext }).catch(console.error);
    }
    setIsDraft(true);
    notifyDraft();
  }

  async function handlePublish() {
    if (isDirty) saveDraft();
    const ok = await publish();
    if (ok) setIsDraft(false);
  }

  return (
    <div className="page">
      <StickyPageHeader
        title="Logotipo"
        description={<>Logotipos exibidos no portal <strong>{portalName}</strong>.</>}
        action={
          <div className="publish-actions">
            <button className="btn-outline" type="button" onClick={saveDraft} disabled={!isDirty}>
              Salvar rascunho
            </button>
            <button className="btn-primary" type="button" onClick={handlePublish} disabled={!isDirty && !isDraft && !hasPendingDraft}>
              {publishing ? 'Publicando…' : 'Publicar'}
            </button>
          </div>
        }
      />

      <div className="logo-grid">
        <UploadArea
          title="Logotipo principal"
          desc="Exibido no header do portal. Recomendado: SVG ou PNG transparente, 300×80px mínimo."
          value={logo}
          onChange={v => { setLogo(v); }}
          inputRef={inputRef}
          onPickFile={() => inputRef.current?.click()}
          onClear={() => { setLogo(null); }}
          inputEl={<input ref={inputRef} type="file" accept=".svg,.png,.jpg,.webp" style={{ display: 'none' }}
            onChange={e => handleFile(e, setLogo, pendingLogoDataUrl, logoBlobUrlRef, 'logo')} />}
        />
        <UploadArea
          title="Logo compacto (sidebar/favicon nav)"
          desc="Versão reduzida usada quando a sidebar está recolhida. Recomendado: ícone quadrado 80×80px."
          value={logoCollapsed}
          onChange={v => { setLogoCollapsed(v); }}
          inputRef={inputCollRef}
          onPickFile={() => inputCollRef.current?.click()}
          onClear={() => { setLogoCollapsed(null); }}
          inputEl={<input ref={inputCollRef} type="file" accept=".svg,.png,.jpg,.webp" style={{ display: 'none' }}
            onChange={e => handleFile(e, setLogoCollapsed, pendingLogoCollDataUrl, logoCollBlobUrlRef, 'logo-compact')} />}
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
