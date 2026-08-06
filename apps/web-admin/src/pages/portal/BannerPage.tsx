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
import { useAuth } from '../../contexts/AuthContext';
import { useCanaisDestinos } from '../../hooks/useCanaisDestinos';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { resolvePortalId } from '../../lib/portalDb';
import PublishButton from '../../components/PublishButton';
import MediaPicker from '../../components/MediaPicker';
import '../admin/AdminPages.css';
import './PersonalizarPages.css';

interface BannerShortcut {
  id: string;
  pageId: string;
  label: string; // custom override; empty = use the destination page's own label
}

const MAX_SHORTCUTS = 4;
export const BANNER_SHORTCUTS_KEY = 'portal_banner_shortcuts';

interface SlideContent {
  titulo: string;
  subtitulo: string;
  cta: string;
}

interface BannerSlide {
  id: string;
  imagem: string | null;
  content: Partial<Record<LocaleCode, SlideContent>>;
  // Link/visibility aren't per-language, so they live on the slide itself,
  // not inside `content`. Undefined ctaEnabled means "on" — keeps existing
  // saved slides (from before this field existed) showing their button.
  ctaLink?: string;
  ctaEnabled?: boolean;
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
  const { user } = useAuth();
  const [persisted, setPersisted, { hydrated, saveError }] = usePortalState<BannerSlide[]>(
    BANNER_KEY, 'banner_slides', INITIAL_SLIDES,
  );
  const [slides, setSlides] = useState<BannerSlide[]>(persisted);
  const [activeId, setActiveId] = useState('b1');

  const [persistedShortcuts, setPersistedShortcuts, { hydrated: shortcutsHydrated }] = usePortalState<BannerShortcut[]>(
    BANNER_SHORTCUTS_KEY, 'banner_shortcuts', [],
  );
  const [shortcuts, setShortcuts] = useState<BannerShortcut[]>(persistedShortcuts);
  useEffect(() => {
    if (!shortcutsHydrated) return;
    setShortcuts(persistedShortcuts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortcutsHydrated]);

  const { destinos } = useCanaisDestinos(user?.activePortalId ?? undefined);

  // Necessário para montar o caminho da prévia no bucket portal-media.
  const [portalDbId, setPortalDbId] = useState<string | null>(null);
  useEffect(() => {
    const portalKey = user?.activePortalId;
    if (!portalKey) return;
    resolvePortalId(portalKey).then(setPortalDbId).catch(() => {});
  }, [user?.activePortalId]);

  function addShortcut() {
    if (shortcuts.length >= MAX_SHORTCUTS) return;
    setShortcuts(prev => [...prev, { id: Math.random().toString(36).slice(2), pageId: '', label: '' }]);
    setDirty(true);
  }

  function updateShortcut(id: string, patch: Partial<BannerShortcut>) {
    setShortcuts(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
    setDirty(true);
  }

  function removeShortcut(id: string) {
    setShortcuts(prev => prev.filter(s => s.id !== id));
    setDirty(true);
  }

  // Sync draft once the authoritative Supabase value arrives
  useEffect(() => {
    if (!hydrated) return;
    const next = persisted.length > 0 ? persisted : INITIAL_SLIDES;
    setSlides(next);
    setActiveId(prev => (next.some(s => s.id === prev) ? prev : next[0].id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  /**
   * Depois de publicar, `imagem` deixa de ser um data: URL e vira um caminho
   * do site do cliente (ex.: /assets/banner/b1-abc.webp). Renderizado direto
   * aqui, o navegador resolveria esse caminho contra o domínio do admin e
   * daria 404 — a imagem "quebrada" ao voltar para a aba Banner.
   *
   * O publish-config espelha cada imagem no bucket portal-media (slot
   * `banner-<id>`), então é de lá que vem a prévia: não depende do deploy
   * do portal ter terminado nem de vercel_url estar preenchido.
   */
  function previewSrc(slide: BannerSlide): string | null {
    const img = slide.imagem;
    if (!img) return null;
    if (img.startsWith('data:') || img.startsWith('http')) return img;
    if (!portalDbId || !isSupabaseConfigured || !supabase) return null;
    const ext = img.split('.').pop()?.toLowerCase() || 'webp';
    const path = `${portalDbId}/system/banner-${slide.id}.${ext}`;
    return supabase.storage.from('portal-media').getPublicUrl(path).data.publicUrl;
  }
  const [locale, setLocale] = useState<LocaleCode>(primaryLang);
  const { publish, hasPendingDraft, notifyDraft } = usePublish();
  const [dirty, setDirty] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
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

  function updateSlide(patch: Partial<Pick<BannerSlide, 'ctaLink' | 'ctaEnabled'>>) {
    setSlides(prev => prev.map(s => s.id === activeId ? { ...s, ...patch } : s));
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
    setPersistedShortcuts(shortcuts);
    setDirty(false);
    notifyDraft();
  }

  async function handlePublish() {
    // publish() reads portal_config back from Supabase immediately after —
    // an unawaited save here would race it and the site could publish the
    // previous banner (this is exactly how a just-added slide image failed
    // to reach the site: the image write hadn't landed yet when publish()
    // re-fetched banner_slides).
    await Promise.all([setPersisted(slides), setPersistedShortcuts(shortcuts)]);
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
          <div className="publish-actions">
            <button className="btn-outline" type="button" disabled={!dirty} onClick={handleDraft}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>draft</span>
              Salvar rascunho
            </button>
            <PublishButton onClick={handlePublish} disabled={!dirty && !hasPendingDraft} />
          </div>
        }
      />

      {saveError && (
        <div className="save-error-banner" role="alert">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
          <span>Alteração não foi salva no banco. Se você acabou de receber acesso a este portal, saia e entre novamente para renovar a sessão.</span>
        </div>
      )}

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
              <img src={previewSrc(active) ?? ''} alt="Banner" className="banner-img-preview__img" />
              <div className="banner-img-preview__actions">
                <button type="button" className="banner-img-preview__replace" onClick={() => fileRef.current?.click()}>Substituir imagem</button>
                <button type="button" className="banner-img-preview__replace" onClick={() => setPickerOpen(true)}>Escolher da Biblioteca</button>
                <button type="button" className="banner-img-preview__remove" onClick={() => updateImage(null)}>Remover imagem</button>
              </div>
            </div>
          ) : (
            <>
              <button type="button" className="logo-dropzone" onClick={() => fileRef.current?.click()}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span className="logo-dropzone__text">Enviar imagem do banner</span>
                <span className="logo-dropzone__hint">JPG, PNG ou WebP — 1920×1080px recomendado</span>
              </button>
              <button type="button" className="media-picker-trigger" onClick={() => setPickerOpen(true)}>
                ou escolher da Biblioteca
              </button>
            </>
          )}
          <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={updateImage} portalDbId={portalDbId} />

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
                disabled={active.ctaEnabled === false}
                placeholder={locale === primaryLang ? 'Ex: Saiba mais' : primaryContent.cta} />
            </label>
            <label className="banner-field">
              <span>Link do botão</span>
              <input className="banner-input" type="text" value={active.ctaLink ?? ''}
                onChange={e => updateSlide({ ctaLink: e.target.value })}
                disabled={active.ctaEnabled === false}
                placeholder="Ex: /central-de-resultados.html ou https://..." />
              <p className="banner-field__hint" style={{ margin: '4px 0 0' }}>
                Deixe em branco para usar automaticamente o primeiro item do menu.
              </p>
            </label>
            <label className="banner-field banner-field--checkbox">
              <input type="checkbox" checked={active.ctaEnabled === false}
                onChange={e => updateSlide({ ctaEnabled: !e.target.checked })} />
              <span>Ocultar botão no site</span>
            </label>
          </div>
        </div>
      </div>

      {/* Atalhos no hero só existem no template Banner + Navbar (header nav +
          hero banner) — sidebar/tabmenu usam home-side-bar.html/home-v2.html,
          que não têm essa faixa de atalhos abaixo do banner. */}
      {PORTAL_CONFIG.model === 'banner' && (
        <div className="pers-section banner-shortcuts">
          <div className="banner-shortcuts__header">
            <div>
              <h2 className="pers-section__title" style={{ margin: 0 }}>Atalhos</h2>
              <p className="banner-field__hint" style={{ margin: '4px 0 0' }}>
                Escolha até {MAX_SHORTCUTS} páginas para exibir como atalhos no banner da home. Deixe vazio para usar o menu completo do portal.
              </p>
            </div>
            <button type="button" className="banner-add-btn" onClick={addShortcut} disabled={shortcuts.length >= MAX_SHORTCUTS}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Adicionar atalho
            </button>
          </div>

          {shortcuts.length === 0 ? (
            <p className="banner-shortcuts__empty">Nenhum atalho configurado — o site usará o menu completo.</p>
          ) : (
            <div className="banner-shortcuts__list">
              {shortcuts.map((s, i) => (
                <div key={s.id} className="banner-shortcut-row">
                  <span className="banner-shortcut-row__num">{i + 1}</span>
                  <select
                    className="filter-select banner-shortcut-row__select"
                    value={s.pageId}
                    onChange={e => updateShortcut(s.id, { pageId: e.target.value })}
                  >
                    <option value="">Selecionar página...</option>
                    {destinos.map(d => (
                      <option key={d.id} value={d.id}>{d.parentLabel ? `${d.parentLabel} › ${d.label}` : d.label}</option>
                    ))}
                  </select>
                  <input
                    className="nm-field--sm banner-shortcut-row__label"
                    type="text"
                    placeholder="Rótulo (opcional)"
                    value={s.label}
                    onChange={e => updateShortcut(s.id, { label: e.target.value })}
                  />
                  <button type="button" className="banner-slide-item__remove" onClick={() => removeShortcut(s.id)} title="Remover atalho">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
          frameHeight={270}
          outputWidth={1920}
          outputHeight={1080}
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
