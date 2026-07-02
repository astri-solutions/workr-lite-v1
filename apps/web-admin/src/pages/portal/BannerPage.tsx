import { useState, useRef } from 'react';
import StickyPageHeader from '../../components/StickyPageHeader';
import LangTabs from '../../components/LangTabs';
import UnsavedModal from '../../components/UnsavedModal';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import PORTAL_CONFIG, { LocaleCode } from '../../portalConfig';
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
  const [slides, setSlides] = useState<BannerSlide[]>(INITIAL_SLIDES);
  const [activeId, setActiveId] = useState('b1');
  const [locale, setLocale] = useState<LocaleCode>(primaryLang);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const blocker = useUnsavedChanges(dirty && !saved);

  const active = slides.find(s => s.id === activeId) ?? slides[0];
  const activeContent: SlideContent = active.content[locale] ?? active.content[primaryLang] ?? emptyContent();

  function updateContent(field: keyof SlideContent, value: string) {
    setSlides(prev => prev.map(s => {
      if (s.id !== activeId) return s;
      const existing = s.content[locale] ?? s.content[primaryLang] ?? emptyContent();
      return { ...s, content: { ...s.content, [locale]: { ...existing, [field]: value } } };
    }));
    setDirty(true);
    setSaved(false);
  }

  function updateImage(value: string | null) {
    setSlides(prev => prev.map(s => s.id === activeId ? { ...s, imagem: value } : s));
    setDirty(true);
    setSaved(false);
  }

  function addSlide() {
    const id = 'b' + Math.random().toString(36).slice(2);
    const novo: BannerSlide = { id, imagem: null, content: { [primaryLang]: emptyContent() } };
    setSlides(prev => [...prev, novo]);
    setActiveId(id);
    setDirty(true);
    setSaved(false);
  }

  function removeSlide(id: string) {
    if (slides.length === 1) return;
    setSlides(prev => prev.filter(s => s.id !== id));
    if (activeId === id) setActiveId(slides.find(s => s.id !== id)?.id ?? '');
    setDirty(true);
    setSaved(false);
  }

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => updateImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleSave() {
    setSaved(true);
    setDirty(false);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="page">
      <StickyPageHeader
        title="Banner"
        description={<>Banner hero do portal <strong>{PORTAL_CONFIG.name}</strong>.</>}
        action={
          <button className="btn-primary" type="button" onClick={handleSave}>
            {saved ? 'Salvo!' : 'Salvar alterações'}
          </button>
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
    </div>
  );
}
