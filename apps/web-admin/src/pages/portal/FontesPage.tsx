import { useState, useRef } from 'react';
import StickyPageHeader from '../../components/StickyPageHeader';
import UnsavedModal from '../../components/UnsavedModal';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { usePortalName } from '../../hooks/usePortalName';
import { useActivePortalId } from '../../hooks/useActivePortalId';
import { pKey } from '../../utils/portalStorage';
import { savePortalConfig } from '../../lib/portalConfigApi';
import { usePublish } from '../../contexts/PublishContext';
import '../admin/AdminPages.css';
import './PersonalizarPages.css';

interface FontDef {
  id: string;
  label: string;
  family: string;
  category: string;
  custom?: true;
}

const BUILTIN_FONTS: FontDef[] = [
  { id: 'inter', label: 'Inter', family: "'Inter', sans-serif", category: 'Sans-serif' },
  { id: 'plus-jakarta', label: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans', sans-serif", category: 'Sans-serif' },
  { id: 'montserrat', label: 'Montserrat', family: "'Montserrat', sans-serif", category: 'Sans-serif' },
  { id: 'poppins', label: 'Poppins', family: "'Poppins', sans-serif", category: 'Sans-serif' },
  { id: 'raleway', label: 'Raleway', family: "'Raleway', sans-serif", category: 'Sans-serif' },
  { id: 'lato', label: 'Lato', family: "'Lato', sans-serif", category: 'Sans-serif' },
  { id: 'source-sans', label: 'Source Sans 3', family: "'Source Sans 3', sans-serif", category: 'Sans-serif' },
  { id: 'nunito', label: 'Nunito', family: "'Nunito', sans-serif", category: 'Sans-serif' },
  { id: 'playfair', label: 'Playfair Display', family: "'Playfair Display', serif", category: 'Serif' },
  { id: 'merriweather', label: 'Merriweather', family: "'Merriweather', serif", category: 'Serif' },
  { id: 'lora', label: 'Lora', family: "'Lora', serif", category: 'Serif' },
  { id: 'eb-garamond', label: 'EB Garamond', family: "'EB Garamond', serif", category: 'Serif' },
  { id: 'libre-baskerville', label: 'Libre Baskerville', family: "'Libre Baskerville', serif", category: 'Serif' },
  { id: 'cormorant', label: 'Cormorant Garamond', family: "'Cormorant Garamond', serif", category: 'Serif' },
];

const INITIAL_HEADING = 'plus-jakarta';
const INITIAL_BODY = 'inter';

export const FONTES_KEY = 'portal_fontes';

function loadFontes(key: string) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { heading: INITIAL_HEADING, body: INITIAL_BODY };
    return { heading: INITIAL_HEADING, body: INITIAL_BODY, ...JSON.parse(raw) };
  } catch { return { heading: INITIAL_HEADING, body: INITIAL_BODY }; }
}

function labelFromFilename(filename: string): string {
  return filename
    .replace(/\.(ttf|woff2?|otf)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim() || filename;
}

async function registerFont(label: string, url: string): Promise<boolean> {
  try {
    const face = new FontFace(label, `url(${url})`);
    await face.load();
    document.fonts.add(face);
    return true;
  } catch {
    return false;
  }
}

function FontList({ active, onSelect, allFonts, uploading, uploadRef, onUpload, onRemove, onMarkDirty }: {
  active: string;
  onSelect: (id: string) => void;
  allFonts: FontDef[];
  uploading: boolean;
  uploadRef: React.RefObject<HTMLInputElement>;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (id: string) => void;
  onMarkDirty: () => void;
}) {
  return (
    <div className="fontes-list">
      <div className="fontes-upload">
        <div className="fontes-upload__info">
          <span className="fontes-upload__title">Fonte personalizada</span>
          <span className="fontes-upload__hint">Faça upload de uma fonte nos formatos TTF, WOFF ou WOFF2.</span>
        </div>
        <input ref={uploadRef} type="file" accept=".ttf,.woff,.woff2,.otf" style={{ display: 'none' }} onChange={onUpload} />
        <button
          type="button"
          className="btn-outline fontes-upload__btn"
          disabled={uploading}
          onClick={() => uploadRef.current?.click()}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          {uploading ? 'Carregando…' : 'Fazer upload de fonte'}
        </button>
      </div>
      {allFonts.map(f => (
        <button
          key={f.id}
          type="button"
          className={`fontes-option${active === f.id ? ' fontes-option--active' : ''}`}
          onClick={() => { onSelect(f.id); onMarkDirty(); }}
        >
          <span className="fontes-option__sample" style={{ fontFamily: f.family }}>Aa</span>
          <span className="fontes-option__label" style={f.custom ? { fontFamily: f.family } : undefined}>{f.label}</span>
          <span className="fontes-option__cat">{f.category}</span>
          {f.custom && (
            <button
              type="button"
              className="fontes-option__remove"
              title="Remover fonte"
              onClick={ev => { ev.stopPropagation(); onRemove(f.id); }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
            </button>
          )}
        </button>
      ))}
    </div>
  );
}

export default function FontesPage() {
  const portalName = usePortalName();
  const portalId = useActivePortalId();
  const fontesKey = pKey(FONTES_KEY, portalId);
  const { publish, publishing, hasPendingDraft, notifyDraft } = usePublish();
  const [baseHeading, setBaseHeading] = useState(() => loadFontes(fontesKey).heading);
  const [baseBody, setBaseBody] = useState(() => loadFontes(fontesKey).body);
  const [customFonts, setCustomFonts] = useState<FontDef[]>([]);
  const [headingFont, setHeadingFont] = useState(baseHeading);
  const [bodyFont, setBodyFont] = useState(baseBody);
  const [isDraft, setIsDraft] = useState(false);
  const [uploading, setUploading] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  const allFonts = [...BUILTIN_FONTS, ...customFonts];
  const heading = allFonts.find(f => f.id === headingFont);
  const body = allFonts.find(f => f.id === bodyFont);

  const isDirty = headingFont !== baseHeading || bodyFont !== baseBody;
  const blocker = useUnsavedChanges(isDirty);

  function extractName(family: string) {
    return family.replace(/^['"](.+?)['"].*$/, '$1').trim();
  }

  function saveDraft() {
    const value = {
      heading: extractName(heading?.family ?? headingFont),
      body: extractName(body?.family ?? bodyFont),
    };
    localStorage.setItem(fontesKey, JSON.stringify(value));
    if (portalId) savePortalConfig(portalId, { fontes: value }).catch(console.error);
    setBaseHeading(headingFont);
    setBaseBody(bodyFont);
    setIsDraft(true);
    notifyDraft();
  }

  async function handlePublish() {
    if (isDirty) saveDraft();
    const ok = await publish();
    if (ok) setIsDraft(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    const url = URL.createObjectURL(file);
    const label = labelFromFilename(file.name);
    const ok = await registerFont(label, url);
    if (ok) {
      const id = 'custom-' + label.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
      const font: FontDef = {
        id,
        label,
        family: `'${label}', sans-serif`,
        category: 'Personalizada',
        custom: true,
      };
      setCustomFonts(prev => [...prev, font]);
    }
    setUploading(false);
    if (e.target) e.target.value = '';
  }

  function removeCustomFont(id: string) {
    setCustomFonts(prev => prev.filter(f => f.id !== id));
    if (headingFont === id) setHeadingFont(INITIAL_HEADING);
    if (bodyFont === id) setBodyFont(INITIAL_BODY);
  }

  return (
    <div className="page">
      <StickyPageHeader
        title="Fontes"
        description={<>Tipografia do portal <strong>{portalName}</strong>.</>}
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

      {/* Preview */}
      <div className="pers-section">
        <h2 className="pers-section__title">Pré-visualização</h2>
        <div className="fontes-preview">
          <p className="fontes-preview__heading" style={{ fontFamily: heading?.family }}>
            Relações com Investidores
          </p>
          <p className="fontes-preview__body" style={{ fontFamily: body?.family }}>
            Apresentamos os resultados do segundo trimestre de 2025, demonstrando crescimento sustentável e geração de valor para nossos acionistas e stakeholders.
          </p>
        </div>
      </div>

      <div className="fontes-grid">
        <div className="pers-section">
          <h2 className="pers-section__title">Fonte de títulos</h2>
          <p className="pers-section__desc">Usada em headings, destaques e navegação.</p>
          <FontList active={headingFont} onSelect={setHeadingFont} allFonts={allFonts} uploading={uploading} uploadRef={uploadRef} onUpload={handleUpload} onRemove={removeCustomFont} onMarkDirty={() => {}} />
        </div>

        <div className="pers-section">
          <h2 className="pers-section__title">Fonte de corpo</h2>
          <p className="pers-section__desc">Usada em textos, parágrafos e tabelas.</p>
          <FontList active={bodyFont} onSelect={setBodyFont} allFonts={allFonts} uploading={uploading} uploadRef={uploadRef} onUpload={handleUpload} onRemove={removeCustomFont} onMarkDirty={() => {}} />
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
