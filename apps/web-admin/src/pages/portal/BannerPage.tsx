import { useState, useRef, useEffect } from 'react';
import StickyPageHeader from '../../components/StickyPageHeader';
import LangTabs from '../../components/LangTabs';
import ImageCropModal from '../../components/ImageCropModal';
import PublishSuccessModal from '../../components/PublishSuccessModal';
import UnsavedModal from '../../components/UnsavedModal';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import PORTAL_CONFIG, { LocaleCode } from '../../portalConfig';
import { usePortalName } from '../../hooks/usePortalName';
import { usePortalState } from '../../hooks/usePortalState';
import { usePublish } from '../../contexts/PublishContext';
import PublishButton from '../../components/PublishButton';
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

// A locale the user hasn't touched yet must start genuinely blank — not a
// copy of the primary locale's text. Falling back to primaryLang here (as
// this used to) meant editing just the título for a new locale silently
// carried the primary locale's subtítulo/CTA into that locale's own saved
// content, permanently freezing them in the untranslated language even
// though nothing about them looked unedited. The site (carousel.js) is what
// falls back per-field to the primary locale for anything left blank.
function blankContent(): SlideContent {
  return { titulo: '', subtitulo: '', cta: '' };
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

export default function BannerPage() {
  const portalName = usePortalName();
  const [persisted, setPersisted, { hydrated }] = usePortalState<BannerSlide[]>(
    BANNER_KEY, 'banner_slides', INITIAL_SLIDES,
  );
  const [slides, setSlides] = useState<BannerSlide[]>(persisted);
  const [activeId, setActiveId] = useState('b1');

  // Sync draft once the authoritative Supabase value arrives
  useEffect(() => {
    if (!hydrated) return;
    const next = persisted.length > 0 ? persisted : INITIAL_SLIDES;
    setSlides(next);
    setActiveId(prev => (next.some(s => s.id === prev) ? prev : next[0].id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);
  const [locale, setLocale] = useState<LocaleCode>(primaryLang);
  const { publish, hasPendingDraft, notifyDraft } = usePublish();
  const [dirty, setDirty] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const blocker = useUnsavedChanges(dirty);

  // Auto-close the success modal after 2.5s
  useEffect(() => {
    if (!publishSuccess) return;
    const t = setTimeout(() => setPublishSuccess(false), 2500);
    return () => clearTimeout(t);
  }, [publishSuccess]);

  const active = slides.find(s => s.id === activeId) ?? slides[0];
  const activeContent: SlideContent = active.content[locale] ?? blankContent();
  const primaryContent: SlideContent = active.content[primaryLang] ?? blankContent();

  function updateContent(field: keyof SlideContent, value: string) {
    setSlides(prev => prev.map(s => {
      if (s.id !== activeId) return s;
      const existing = s.content[locale] ?? blankContent();
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

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCropFile(file);
  }

  function handleCropConfirm(dataUrl: string) {
    updateImage(dataUrl);
    setCropFile(null);
  }

  function handleDraft() {
    setPersisted(slides);
    setDirty(false);
    notifyDraft();
  }

  async function handlePublish() {
    // publish() reads portal_config back from Supabase immediately after —
    // an unawaited save here would race it and the site could publish the
    // previous banner (this is exactly how a just-added slide image failed
    // to reach the site: the image write hadn't landed yet when publish()
    // re-fetched banner_slides).
    await setPersisted(slides);
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
            <PublishButton onClick={handlePublish} disabled={!dirty && !hasPendingDraft} />
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

          {locale !== primaryLang && (
            <p className="banner-field__hint" style={{ margin: '0 0 4px' }}>
              Campos deixados em branco exibem o texto do idioma padrão ({primaryLang}) no site.
            </p>
          )}
          <div className="banner-fields">
            <label className="banner-field">
              <span>Título</span>
              <input className="banner-input" type="text" value={activeContent.titulo}
                onChange={e => updateContent('titulo', e.target.value)}
                placeholder={locale === primaryLang ? 'Ex: Relações com Investidores' : primaryContent.titulo} />
            </label>
            <label className="banner-field">
              <span>Subtítulo</span>
              <textarea className="banner-input banner-textarea" value={activeContent.subtitulo}
                onChange={e => updateContent('subtitulo', e.target.value)}
                placeholder={locale === primaryLang ? 'Texto descritivo exibido abaixo do título...' : primaryContent.subtitulo} rows={3} />
            </label>
            <label className="banner-field">
              <span>Texto do botão (CTA)</span>
              <input className="banner-input" type="text" value={activeContent.cta}
                onChange={e => updateContent('cta', e.target.value)}
                placeholder={locale === primaryLang ? 'Ex: Saiba mais' : primaryContent.cta} />
            </label>
          </div>
        </div>
      </div>

      <UnsavedModal
        open={blocker.state === 'blocked'}
        onStay={() => blocker.reset?.()}
        onLeave={() => blocker.proceed?.()}
      />

      {cropFile && (
        <ImageCropModal
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onConfirm={handleCropConfirm}
          title="Recortar imagem do banner"
          hint="Ajuste a área que será usada — o banner ocupa toda a largura da tela, então enquadre o que deve ficar visível também nas bordas."
          frameWidth={480}
          frameHeight={180}
          outputWidth={1920}
          outputHeight={720}
        />
      )}

      <PublishSuccessModal
        open={publishSuccess}
        onClose={() => setPublishSuccess(false)}
        title="Banner publicado!"
      />
    </div>
  );
}
