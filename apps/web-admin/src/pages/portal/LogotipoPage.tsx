import { useState, useRef, useEffect } from 'react';
import StickyPageHeader from '../../components/StickyPageHeader';
import UnsavedModal from '../../components/UnsavedModal';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { usePortalName } from '../../hooks/usePortalName';
import { useActivePortalId } from '../../hooks/useActivePortalId';
import { processImageToDataUrl } from '../../utils/imageProcessor';
import { pKey } from '../../utils/portalStorage';
import { usePublish } from '../../contexts/PublishContext';
import PublishButton from '../../components/PublishButton';
import MediaPicker from '../../components/MediaPicker';
import { savePortalConfig, fetchPortalConfig } from '../../lib/portalConfigApi';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { resolvePortalId } from '../../lib/portalDb';
import '../admin/AdminPages.css';
import './PersonalizarPages.css';

export const LOGO_KEY = 'portal_logotipo';
export const LOGO_NEGATIVE_KEY = 'portal_logotipo_negativo';

export default function LogotipoPage() {
  const portalName = usePortalName();
  const portalId = useActivePortalId();

  const logoKey = pKey(LOGO_KEY, portalId);
  const logoNegativeKey = pKey(LOGO_NEGATIVE_KEY, portalId);

  // State holds data URLs (base64) which survive page reloads and are usable in <img src>
  const { publish, hasPendingDraft, notifyDraft } = usePublish();
  const [baseLogo, setBaseLogo] = useState<string | null>(() => localStorage.getItem(logoKey));
  const [baseNegative, setBaseNegative] = useState<string | null>(() => localStorage.getItem(logoNegativeKey));
  const [logo, setLogo] = useState<string | null>(baseLogo);
  const [logoNegative, setLogoNegative] = useState<string | null>(baseNegative);
  const [isDraft, setIsDraft] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputNegRef = useRef<HTMLInputElement>(null);
  const pendingLogoDataUrl = useRef<string | null>(null);
  const pendingLogoNegDataUrl = useRef<string | null>(null);
  const logoBlobUrlRef = useRef<string | null>(null);
  const logoNegBlobUrlRef = useRef<string | null>(null);

  const isDirty = logo !== baseLogo || logoNegative !== baseNegative;
  const blocker = useUnsavedChanges(isDirty);

  // localStorage only ever holds an unpublished draft — on a fresh session,
  // different browser, or cleared storage it's empty even though a logo is
  // live on the published site. The real source of truth is the copy
  // publish-config mirrors into the portal-media bucket at publish time, so
  // fall back to that whenever there's no local draft to show instead.
  const [portalDbId, setPortalDbId] = useState<string | null>(null);
  const [remoteLogoUrl, setRemoteLogoUrl] = useState<string | null>(null);
  const [remoteNegativeUrl, setRemoteNegativeUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!portalId) return;
    resolvePortalId(portalId).then(setPortalDbId).catch(() => {});
  }, [portalId]);

  useEffect(() => {
    if (!portalId || !portalDbId || !isSupabaseConfigured || !supabase) return;
    fetchPortalConfig(portalId).then(cfg => {
      if (!cfg) return;
      const logoExt = cfg.logo_ext as string | undefined;
      const negExt = cfg.logo_negativo_ext as string | undefined;
      if (logoExt) {
        const path = `${portalDbId}/system/logotipo-original.${logoExt}`;
        setRemoteLogoUrl(supabase!.storage.from('portal-media').getPublicUrl(path).data.publicUrl);
      }
      if (negExt) {
        const path = `${portalDbId}/system/logotipo-negativo.${negExt}`;
        setRemoteNegativeUrl(supabase!.storage.from('portal-media').getPublicUrl(path).data.publicUrl);
      }
    }).catch(() => {});
  }, [portalId, portalDbId]);

  async function handleFile(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string) => void,
    pendingRef: React.MutableRefObject<string | null>,
    blobUrlRef: React.MutableRefObject<string | null>,
    slot: 'logo',
  ) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const result = await processImageToDataUrl(file, slot);
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    blobUrlRef.current = result.objectUrl;
    pendingRef.current = result.dataUrl;
    setter(result.dataUrl);
  }

  async function handleNegativeFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const result = await processImageToDataUrl(file, 'logo');
    if (logoNegBlobUrlRef.current) URL.revokeObjectURL(logoNegBlobUrlRef.current);
    logoNegBlobUrlRef.current = result.objectUrl;
    pendingLogoNegDataUrl.current = result.dataUrl;
    setLogoNegative(result.dataUrl);
  }

  function saveDraft() {
    if (logo) localStorage.setItem(logoKey, logo);
    else localStorage.removeItem(logoKey);
    if (logoNegative) localStorage.setItem(logoNegativeKey, logoNegative);
    else localStorage.removeItem(logoNegativeKey);
    pendingLogoDataUrl.current = null;
    pendingLogoNegDataUrl.current = null;
    // Persist logo extension(s) to Supabase so publish-config uses the correct
    // file extension, and so the persistent preview above can resolve the
    // right path in portal-media before anything is republished.
    if (portalId) {
      const extOf = (dataUrl: string | null): string | undefined => {
        if (!dataUrl) return undefined;
        const m = dataUrl.match(/^data:([^;]+);base64,/);
        const extMap: Record<string, string> = {
          'image/svg+xml': 'svg', 'image/png': 'png',
          'image/jpeg': 'jpg', 'image/webp': 'webp',
          'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico',
        };
        return m ? (extMap[m[1]] ?? 'png') : undefined;
      };
      const logoExt = extOf(logo);
      const negExt = extOf(logoNegative);
      const patch: { logo_ext?: string; logo_negativo_ext?: string } = {};
      if (logoExt) patch.logo_ext = logoExt;
      if (negExt) patch.logo_negativo_ext = negExt;
      if (Object.keys(patch).length > 0) savePortalConfig(portalId, patch).catch(console.error);
    }
    setBaseLogo(logo);
    setBaseNegative(logoNegative);
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
            <PublishButton onClick={handlePublish} disabled={!isDirty && !isDraft && !hasPendingDraft} />
          </div>
        }
      />

      <div className="logo-grid">
        <UploadArea
          title="Logotipo principal"
          desc="Exibido no header do portal. Recomendado: SVG ou PNG transparente, 300×80px mínimo."
          value={logo ?? remoteLogoUrl}
          onChange={v => { setLogo(v); }}
          inputRef={inputRef}
          onPickFile={() => inputRef.current?.click()}
          onClear={() => { setLogo(null); }}
          portalDbId={portalDbId}
          inputEl={<input ref={inputRef} type="file" accept=".svg,.png,.jpg,.webp" style={{ display: 'none' }}
            onChange={e => handleFile(e, setLogo, pendingLogoDataUrl, logoBlobUrlRef, 'logo')} />}
        />
        <UploadArea
          title="Logotipo negativo (fundo escuro)"
          desc="Versão clara/branca usada sobre fundos escuros — topbar, footer e modo alto contraste. Recomendado: mesmo formato do logotipo principal."
          value={logoNegative ?? remoteNegativeUrl}
          onChange={v => { setLogoNegative(v); }}
          inputRef={inputNegRef}
          onPickFile={() => inputNegRef.current?.click()}
          onClear={() => { setLogoNegative(null); }}
          dark
          portalDbId={portalDbId}
          inputEl={<input ref={inputNegRef} type="file" accept=".svg,.png,.jpg,.webp" style={{ display: 'none' }}
            onChange={handleNegativeFile} />}
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

function UploadArea({ title, desc, value, onChange, onPickFile, onClear, inputEl, dark, portalDbId }: {
  title: string; desc: string; value: string | null;
  onChange: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  onPickFile: () => void; onClear: () => void; inputEl: React.ReactNode;
  // Logo negativo is white/light-colored by design — previewing it on the
  // same light gray box as the other logos makes it all but invisible.
  dark?: boolean;
  portalDbId: string | null;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div className="pers-section">
      <h2 className="pers-section__title">{title}</h2>
      <p className="pers-section__desc">{desc}</p>
      {inputEl}
      {value ? (
        <div className="logo-preview">
          <img src={value} alt="Logo preview" className={`logo-preview__img${dark ? ' logo-preview__img--dark' : ''}`} />
          <div className="logo-preview__actions">
            <button type="button" className="logo-btn logo-btn--replace" onClick={onPickFile}>Substituir</button>
            <button type="button" className="logo-btn logo-btn--replace" onClick={() => setPickerOpen(true)}>Biblioteca</button>
            <button type="button" className="logo-btn logo-btn--remove" onClick={onClear}>Remover</button>
          </div>
        </div>
      ) : (
        <>
          <button type="button" className="logo-dropzone" onClick={onPickFile}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="logo-dropzone__text">Clique para enviar arquivo</span>
            <span className="logo-dropzone__hint">SVG, PNG ou JPG — máx. 2MB</span>
          </button>
          <button type="button" className="media-picker-trigger" onClick={() => setPickerOpen(true)}>
            ou escolher da Biblioteca
          </button>
        </>
      )}
      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={onChange} portalDbId={portalDbId} />
    </div>
  );
}
