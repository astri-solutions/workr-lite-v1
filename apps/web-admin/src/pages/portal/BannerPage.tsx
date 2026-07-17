import { useState, useRef, useEffect } from 'react';
import { processImage } from '../../utils/imageProcessor';
import StickyPageHeader from '../../components/StickyPageHeader';
import LangTabs from '../../components/LangTabs';
import Modal from '../../components/Modal';
import UnsavedModal from '../../components/UnsavedModal';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import PORTAL_CONFIG, { LocaleCode } from '../../portalConfig';
import { usePortalName } from '../../hooks/usePortalName';
import { usePublish } from '../../contexts/PublishContext';
import '../admin/AdminPages.css';
import './PersonalizarPages.css';

interface SlideContent {
  titulo: string;
  subtitulo: string;
  cta: string;
}

interface BannerSlide {
  id: string;
  imagem: string | null;
  content: Partial<Record<LocaleCode, SlideContent>>;
}

function emptyContent(): SlideContent {
  return { titulo: 'Novo banner', subtitulo: '', cta: 'Saiba mais' };
}

const primaryLang = PORTAL_CONFIG.languages[0];

export const BANNER_KEY = 'portal_banner';

const INITIAL_SLIDES: BannerSlide[] = [
  {
    id: 'b1',
    imagem: null,
    content: {
      [primaryLang]: {
        titulo: 'Relações com Investidores',
        subtitulo: 'Transparência e geração de valor para nossos acionistas.',
        cta: 'Saiba mais',
      },
    },
  },
];

function loadSlides(): BannerSlide[] {
  try {
    const raw = localStorage.getItem(BANNER_KEY);
    return raw ? JSON.parse(raw) : INITIAL_SLIDES;
  } catch {
    return INITIAL_SLIDES;
  }
}

export default function BannerPage() {
  const portalName = usePortalName();
  const [slides, setSlides] = useState<BannerSlide[]>(loadSlides);
  const [activeId, setActiveId] = useState('b1');
  const [locale, setLocale] = useState<LocaleCode>(primaryLang);
  const { publish, publishing, hasPendingDraft, notifyDraft } = usePublish();
  const [dirty, setDirty] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const blocker = useUnsavedChanges(dirty);

  // Auto-close the success modal after 2.5s
  useEffect(() => {
    if (!publishSuccess) return;
    const t = setTimeout(() => setPublishSuccess(false), 2500);
    return () => clearTimeout(t);
  }, [publishSuccess]);

  const active = slides.find(s => s.id === activeId) ?? slides[0];
  const activeContent: SlideContent = active.content[locale] ?? active.content[primaryLang] ?? emptyContent();

  function updateContent(field: keyof SlideContent, value: string) {
    setSlides(prev => prev.map(s => {
      if (s.id !== activeId) return s;
      const existing = s.content[locale] ?? s.content[primaryLang] ?? emptyContent();
      return { ...s, content: { ...s.content, [locale]: { ...existing, [field]: value } } };
    }));
    setDirty(true);
    
  }

  function updateImage(value: string | null) {
    setSlides(prev => prev.map(s => s.id === activeId ? { ...s, imagem: value } : s));
    setDirty(true);
    
  }

  function addSlide() {
    const id = 'b' + Math.random().toString(36).slice(2);
    const novo: BannerSlide = { id, imagem: null, content: { [primaryLang]: emptyContent() } };
    setSlides(prev => [...prev, novo]);
    setActiveId(id);
    setDirty(true);
    
  }

  function removeSlide(id: string) {
    if (slides.length === 1) return;
    setSlides(prev => prev.filter(s => s.id !== id));
    if (activeId === id) setActiveId(slides.find(s => s.id !== id)?.id ?? '');
    setDirty(true);
    
  }

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await processImage(file, 'banner');
    updateImage(result.objectUrl);
  }

  function handleDraft() {
    localStorage.setItem(BANNER_KEY, JSON.stringify(slides));
    setDirty(false);
    notifyDraft();
  }

  async function handlePublish() {
    localStorage.setItem(BANNER_KEY, JSON.stringify(slides));
    setDirty(false);
    const ok = await publish();
    if (ok) setPublishSuccess(true);
  }

  return (
    <div className="page">
      <StickyPageHeader
        title="Banner"
        description={<>Banner hero do portal <strong>{portalName}</strong>.</>}
        action={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button className="btn-outline" type="button" disabled={!dirty} onClick={handleDraft}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>draft</span>
              Salvar rascunho
            </button>
            <button className="btn-primary" type="button" disabled={!dirty && !hasPendingDraft} onClick={handlePublish}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>public</span>
              {publishing ? 'Publicando…' : 'Publicar'}
            </button>
          </div>
        }
      />

      <div className="banner-layout">
        {/* Slide list */}
        <div className="pers-section banner-slides-panel">
          <div className="banner-slides-header">
            <h2 className="pers-section__title" style={{ margin: 0 }}>Slides</h2>
            <button type="button" className="banner-add-btn" onClick={addSlide}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Adicionar
            </button>
          </div>
          <div className="banner-slides-list">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={`banner-slide-item${activeId === s.id ? ' banner-slide-item--active' : ''}`}
                onClick={() => setActiveId(s.id)}
              >
                <span className="banner-slide-item__num">{i + 1}</span>
                <span className="banner-slide-item__title">{s.content[primaryLang]?.titulo || 'Sem título'}</span>
                {slides.length > 1 && (
                  <button type="button" className="banner-slide-item__remove"
                    onClick={ev => { ev.stopPropagation(); removeSlide(s.id); }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="pers-section banner-editor">
          <div className="banner-editor__header">
            <h2 className="pers-section__title" style={{ margin: 0 }}>Editar slide</h2>
            <LangTabs active={locale} onChange={setLocale} />
          </div>

          <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" style={{ display: 'none' }} onChange={handleImage} />
          {active.imagem ? (
            <div className="banner-img-preview">
              <img src={active.imagem} alt="Banner" className="banner-img-preview__img" />
              <button type="button" className="banner-img-preview__remove" onClick={() => updateImage(null)}>Remover imagem</button>
            </div>
          ) : (
            <button type="button" className="logo-dropzone" onClick={() => fileRef.current?.click()}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="logo-dropzone__text">Enviar imagem do banner</span>
              <span className="logo-dropzone__hint">JPG, PNG ou WebP — 1920×600px recomendado</span>
            </button>
          )}

          <div className="banner-fields">
            <label className="banner-field">
              <span>Título</span>
              <input className="banner-input" type="text" value={activeContent.titulo}
                onChange={e => updateContent('titulo', e.target.value)} placeholder="Ex: Relações com Investidores" />
            </label>
            <label className="banner-field">
              <span>Subtítulo</span>
              <textarea className="banner-input banner-textarea" value={activeContent.subtitulo}
                onChange={e => updateContent('subtitulo', e.target.value)}
                placeholder="Texto descritivo exibido abaixo do título..." rows={3} />
            </label>
            <label className="banner-field">
              <span>Texto do botão (CTA)</span>
              <input className="banner-input" type="text" value={activeContent.cta}
                onChange={e => updateContent('cta', e.target.value)} placeholder="Ex: Saiba mais" />
            </label>
          </div>
        </div>
      </div>

      <UnsavedModal
        open={blocker.state === 'blocked'}
        onStay={() => blocker.reset?.()}
        onLeave={() => blocker.proceed?.()}
      />

      {/* ── Publish success modal ── */}
      <Modal
        open={publishSuccess}
        onClose={() => setPublishSuccess(false)}
        title=""
        size="sm"
        footer={
          <div className="modal-footer" style={{ justifyContent: 'center' }}>
            <button type="button" className="btn-primary" onClick={() => setPublishSuccess(false)}>
              Fechar
            </button>
          </div>
        }
      >
        <div className="banner-publish-success">
          <div className="banner-success-icon">
            <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle className="banner-success-circle" cx="28" cy="28" r="26" stroke="#00D865" strokeWidth="3" />
              <polyline className="banner-success-check" points="16,28 24,36 40,20" stroke="#00D865" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="banner-success-title">Banner publicado!</p>
          <p className="banner-success-desc">As alterações já estão visíveis no portal.</p>
        </div>
      </Modal>
    </div>
  );
}
