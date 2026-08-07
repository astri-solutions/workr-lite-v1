import { useState, useEffect, useRef } from 'react';
import { processImageToDataUrl } from '../../utils/imageProcessor';
import StickyPageHeader from '../../components/StickyPageHeader';
import LangTabs from '../../components/LangTabs';
import UnsavedModal from '../../components/UnsavedModal';
import Modal from '../../components/Modal';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import PORTAL_CONFIG, { LocaleCode } from '../../portalConfig';
import { usePortalName } from '../../hooks/usePortalName';
import { usePortalState } from '../../hooks/usePortalState';
import { savePortalConfig } from '../../lib/portalConfigApi';
import { useActivePortalId } from '../../hooks/useActivePortalId';
import { resolvePortalId } from '../../lib/portalDb';
import { usePublish } from '../../contexts/PublishContext';
import PublishButton from '../../components/PublishButton';
import MediaPicker from '../../components/MediaPicker';
import '../admin/AdminPages.css';
import './SplashPage.css';
import './PersonalizarPages.css';

export const SPLASH_KEY = 'portal_splash';

export type SplashSize = 'sm' | 'md' | 'lg';

export interface SplashBtn {
  label: string;
  url: string;
  variant: 'primary' | 'outline';
}

// Title/intro/body/caption AND the header image are all per-locale — each
// site language shows genuinely different content, same pattern as Footer's
// address/copyright/etc and NovaMateriaPage's per-locale section images.
// `string` legacy shape below (reviveSplash) is every splash saved before
// this existed, when LangTabs was purely cosmetic — content stayed the same
// no matter which language tab was active. `imageUrl` too: only one header
// image existed for every language.
export interface SplashTexts {
  titulo: string;
  texto: string;
  conteudo: string;
  legenda: string;
  imageUrl: string | null;
}

export interface SplashConfig {
  enabled: boolean;
  size: SplashSize;
  buttons: SplashBtn[];
  content: Partial<Record<string, SplashTexts>>;
}

export interface SplashTemplate {
  id: string;
  nome: string;
  // Everything but `enabled` — a saved template is reusable text/button
  // content, not "turn the splash on". Per-locale text, but never an image
  // (a template is text you reapply across portals/announcements, not
  // someone else's specific header photo).
  config: {
    size: SplashSize;
    buttons: SplashBtn[];
    content: Partial<Record<string, Omit<SplashTexts, 'imageUrl'>>>;
  };
}

// sessionStorage handoff from SplashTemplatesPage → SplashPage: "apply this
// template's content to whatever I'm editing now." A query param would work
// too, but this avoids threading template data through the URL/router for
// what's a one-shot, same-tab action.
export const SPLASH_APPLY_TEMPLATE_KEY = 'workr_splash_apply_template';

const SIZE_OPTIONS: { id: SplashSize; label: string; desc: string; thumb: React.ReactNode }[] = [
  {
    id: 'sm',
    label: 'Pequeno',
    desc: 'Comunicados curtos e alertas rápidos.',
    thumb: (
      <svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg" className="splash-thumb-svg">
        <rect width="160" height="100" fill="#e5e7eb" rx="4" />
        {/* backdrop */}
        <rect width="160" height="100" fill="#141414" opacity="0.55" rx="4" />
        {/* small modal */}
        <rect x="48" y="22" width="64" height="56" rx="5" fill="#fff" />
        <rect x="48" y="22" width="64" height="18" rx="5" fill="#d1d5db" />
        <rect x="48" y="35" width="64" height="5" rx="2" fill="#d1d5db" />
        <rect x="54" y="46" width="52" height="4" rx="2" fill="#e5e7eb" />
        <rect x="54" y="54" width="44" height="4" rx="2" fill="#e5e7eb" />
        <rect x="54" y="62" width="36" height="4" rx="2" fill="#e5e7eb" />
        <rect x="62" y="70" width="36" height="6" rx="3" fill="#0B5B68" />
      </svg>
    ),
  },
  {
    id: 'md',
    label: 'Médio',
    desc: 'Formato padrão para comunicados completos.',
    thumb: (
      <svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg" className="splash-thumb-svg">
        <rect width="160" height="100" fill="#e5e7eb" rx="4" />
        <rect width="160" height="100" fill="#141414" opacity="0.55" rx="4" />
        {/* medium modal */}
        <rect x="24" y="14" width="112" height="72" rx="5" fill="#fff" />
        <rect x="24" y="14" width="112" height="22" rx="5" fill="#d1d5db" />
        <rect x="24" y="29" width="112" height="7" rx="2" fill="#d1d5db" />
        <rect x="32" y="44" width="96" height="4" rx="2" fill="#e5e7eb" />
        <rect x="32" y="52" width="80" height="4" rx="2" fill="#e5e7eb" />
        <rect x="32" y="60" width="88" height="4" rx="2" fill="#e5e7eb" />
        <rect x="40" y="70" width="36" height="6" rx="3" fill="#0B5B68" />
        <rect x="82" y="70" width="36" height="6" rx="3" fill="#fff" stroke="#d1d5db" strokeWidth="1" />
      </svg>
    ),
  },
  {
    id: 'lg',
    label: 'Largo',
    desc: 'Conteúdo extenso com muito espaço para texto.',
    thumb: (
      <svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg" className="splash-thumb-svg">
        <rect width="160" height="100" fill="#e5e7eb" rx="4" />
        <rect width="160" height="100" fill="#141414" opacity="0.55" rx="4" />
        {/* large modal */}
        <rect x="8" y="10" width="144" height="80" rx="5" fill="#fff" />
        <rect x="8" y="10" width="144" height="24" rx="5" fill="#d1d5db" />
        <rect x="8" y="27" width="144" height="7" rx="2" fill="#d1d5db" />
        <rect x="18" y="42" width="124" height="4" rx="2" fill="#e5e7eb" />
        <rect x="18" y="50" width="110" height="4" rx="2" fill="#e5e7eb" />
        <rect x="18" y="58" width="116" height="4" rx="2" fill="#e5e7eb" />
        <rect x="18" y="66" width="100" height="4" rx="2" fill="#e5e7eb" />
        <rect x="36" y="76" width="36" height="6" rx="3" fill="#0B5B68" />
        <rect x="80" y="76" width="36" height="6" rx="3" fill="#fff" stroke="#d1d5db" strokeWidth="1" />
      </svg>
    ),
  },
];

const SIZE_PX: Record<SplashSize, number> = { sm: 360, md: 540, lg: 740 };

function emptyBtn(): SplashBtn {
  return { label: '', url: '', variant: 'primary' };
}

function emptySplashTexts(): SplashTexts {
  return { titulo: '', texto: '', conteudo: '', legenda: '', imageUrl: null };
}

const splashPrimaryLang = PORTAL_CONFIG.languages[0];

function textsOf(cfg: SplashConfig, lang: string): SplashTexts {
  return cfg.content[lang] ?? cfg.content[splashPrimaryLang] ?? emptySplashTexts();
}

export const DEFAULT_SPLASH: SplashConfig = {
  enabled: false,
  size: 'md',
  buttons: [],
  content: {},
};

// Same legacy shape as reviveSplash below, but for a saved/built-in
// template's `config` (no `enabled`, no `imageUrl`). Templates persisted
// before content became per-locale crash every reader that assumes
// `config.content` exists (SplashTemplatesPage's card preview, "Usar este
// modelo") without this.
export function reviveTemplateConfig(stored: unknown): SplashTemplate['config'] {
  const s = (stored ?? {}) as Partial<SplashTemplate['config']> & Partial<Omit<SplashTexts, 'imageUrl'>>;
  if (s.content) {
    return { size: s.size ?? 'md', buttons: s.buttons ?? [], content: s.content };
  }
  const hasLegacyText = s.titulo != null || s.texto != null || s.conteudo != null || s.legenda != null;
  return {
    size: s.size ?? 'md',
    buttons: s.buttons ?? [],
    content: hasLegacyText
      ? { [splashPrimaryLang]: { titulo: s.titulo ?? '', texto: s.texto ?? '', conteudo: s.conteudo ?? '', legenda: s.legenda ?? '' } }
      : {},
  };
}

// Every splash saved before content became per-locale had these 5 fields
// flat at the top level — normalize that legacy shape into
// `content[primaryLang]` once, on load, instead of teaching every read site
// to understand both shapes.
function reviveSplash(stored: unknown): SplashConfig {
  const s = (stored ?? {}) as Partial<SplashConfig> & Partial<SplashTexts>;
  if (s.content) {
    return { enabled: s.enabled ?? false, size: s.size ?? 'md', buttons: s.buttons ?? [], content: s.content };
  }
  const hasLegacyText = s.titulo != null || s.texto != null || s.conteudo != null || s.legenda != null || s.imageUrl != null;
  return {
    enabled: s.enabled ?? false,
    size: s.size ?? 'md',
    buttons: s.buttons ?? [],
    content: hasLegacyText
      ? { [splashPrimaryLang]: { titulo: s.titulo ?? '', texto: s.texto ?? '', conteudo: s.conteudo ?? '', legenda: s.legenda ?? '', imageUrl: s.imageUrl ?? null } }
      : {},
  };
}

export default function SplashPage() {
  const portalName = usePortalName();
  const activePortalId = useActivePortalId();
  const { publish } = usePublish();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [portalDbId, setPortalDbId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  useEffect(() => {
    if (!activePortalId) return;
    resolvePortalId(activePortalId).then(setPortalDbId).catch(() => {});
  }, [activePortalId]);
  const [persisted, setPersisted, { hydrated, saveError }] = usePortalState<SplashConfig>(SPLASH_KEY, 'splash', DEFAULT_SPLASH);
  const [config, setConfig] = useState<SplashConfig>(() => reviveSplash(persisted));
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeLang, setActiveLang] = useState<LocaleCode>(PORTAL_CONFIG.languages[0]);

  // Sync draft once the authoritative Supabase value arrives
  useEffect(() => {
    if (hydrated) setConfig(reviveSplash(persisted));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // "Usar este modelo" in Templates stashes the chosen content here and
  // navigates here — applied once, after hydration (so it isn't immediately
  // clobbered by the persisted-value sync above), then cleared so a normal
  // page reload doesn't reapply it. Merged per-locale (not spread wholesale)
  // so applying a template doesn't wipe out an already-uploaded header image
  // for any language — templates never carry one.
  useEffect(() => {
    if (!hydrated) return;
    const raw = sessionStorage.getItem(SPLASH_APPLY_TEMPLATE_KEY);
    if (!raw) return;
    sessionStorage.removeItem(SPLASH_APPLY_TEMPLATE_KEY);
    try {
      const tplConfig = reviveTemplateConfig(JSON.parse(raw));
      setConfig(c => {
        const mergedContent = { ...c.content };
        for (const [lang, t] of Object.entries(tplConfig.content ?? {})) {
          mergedContent[lang] = { ...emptySplashTexts(), ...c.content[lang], ...t };
        }
        return { ...c, size: tplConfig.size, buttons: tplConfig.buttons, content: mergedContent, enabled: true };
      });
    } catch { /* ignore malformed handoff */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const [templates, setTemplates] = usePortalState<SplashTemplate[]>('portal_splash_templates', 'splash_templates', []);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');

  function saveAsTemplate() {
    const nome = saveTemplateName.trim();
    if (!nome) return;
    const content: Partial<Record<string, Omit<SplashTexts, 'imageUrl'>>> = {};
    for (const [lang, t] of Object.entries(config.content)) {
      if (!t) continue;
      content[lang] = { titulo: t.titulo, texto: t.texto, conteudo: t.conteudo, legenda: t.legenda };
    }
    const tpl: SplashTemplate = {
      id: Math.random().toString(36).slice(2),
      nome,
      config: { size: config.size, buttons: config.buttons, content },
    };
    setTemplates([...templates, tpl]);
    setSaveTemplateOpen(false);
    setSaveTemplateName('');
  }

  // Compared against the SAME reviveSplash(persisted) shape config was
  // seeded with — comparing straight to `persisted` falsely flagged the page
  // as dirty on load whenever the raw saved record's key order/shape didn't
  // exactly match (legacy flat shape vs. current content-keyed shape, or
  // just JSON.stringify's key-order sensitivity).
  const isDirty = !saved && JSON.stringify(config) !== JSON.stringify(reviveSplash(persisted));
  const blocker = useUnsavedChanges(isDirty);

  function patch<K extends keyof SplashConfig>(key: K, val: SplashConfig[K]) {
    setConfig(c => ({ ...c, [key]: val }));
  }

  const texts = textsOf(config, activeLang);

  function setText<K extends keyof SplashTexts>(key: K, val: SplashTexts[K]) {
    setConfig(c => {
      const current = textsOf(c, activeLang);
      return { ...c, content: { ...c.content, [activeLang]: { ...current, [key]: val } } };
    });
  }

  function addBtn() {
    if (config.buttons.length >= 2) return;
    patch('buttons', [...config.buttons, emptyBtn()]);
  }

  function removeBtn(i: number) {
    patch('buttons', config.buttons.filter((_, idx) => idx !== i));
  }

  function patchBtn(i: number, field: keyof SplashBtn, val: string) {
    patch('buttons', config.buttons.map((b, idx) => idx === i ? { ...b, [field]: val } : b));
  }

  function handleSave() {
    setPersisted(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handlePublish() {
    setPersisted(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    if (activePortalId) {
      try { await savePortalConfig(activePortalId, { splash: config }); } catch (e) { console.error(e); }
    }
    await publish();
  }

  const selectedSize = SIZE_OPTIONS.find(s => s.id === config.size) ?? SIZE_OPTIONS[0];

  return (
    <div className="page">
      <StickyPageHeader
        title="Splash"
        description={<>Splash de entrada do portal <strong>{portalName}</strong>. Exibido automaticamente ao acessar o site.</>}
        action={
          <div className="publish-actions publish-actions--wrap">
            <button type="button" className="btn-outline" onClick={() => setPreviewOpen(true)}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>visibility</span>
              Pré-visualizar
            </button>
            <button type="button" className="btn-outline" onClick={() => setSaveTemplateOpen(true)}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>bookmark_add</span>
              Salvar como modelo
            </button>
            <button type="button" className="btn-outline" onClick={handleSave} disabled={!isDirty && saved}>
              {saved ? 'Salvo!' : 'Salvar rascunho'}
            </button>
            <PublishButton onClick={handlePublish} disabled={!isDirty} />
          </div>
        }
      />

      {saveError && (
        <div className="save-error-banner" role="alert">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
          <span>Alteração não foi salva no banco. Se você acabou de receber acesso a este portal, saia e entre novamente para renovar a sessão.</span>
        </div>
      )}

      <LangTabs active={activeLang} onChange={setActiveLang} />

      <div className="splash-layout">
        {/* Left: editor */}
        <div key={activeLang} className="splash-editor lang-fade">

          {/* Enable toggle */}
          <div className="splash-card">
            <div className="splash-card__head">
              <span className="material-symbols-outlined splash-card__icon">campaign</span>
              <div>
                <p className="splash-card__title">Ativação</p>
                <p className="splash-card__desc">O splash será exibido automaticamente ao acessar o site.</p>
              </div>
              <label className="splash-switch">
                <input type="checkbox" checked={config.enabled}
                  onChange={e => patch('enabled', e.target.checked)} />
                <span className="splash-switch__track" />
              </label>
            </div>
          </div>

          {/* Size picker */}
          <div className="splash-card">
            <p className="splash-section-label">Largura do modal</p>
            <div className="splash-sizes">
              {SIZE_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  className={`splash-size-card${config.size === opt.id ? ' splash-size-card--active' : ''}`}
                  onClick={() => patch('size', opt.id)}
                >
                  <div className="splash-size-card__thumb">{opt.thumb}</div>
                  <div className="splash-size-card__info">
                    <span className="splash-size-card__label">{opt.label}</span>
                    <span className="splash-size-card__desc">{opt.desc}</span>
                  </div>
                  {config.size === opt.id && (
                    <span className="splash-size-card__check">
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>check</span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="splash-card">
            <p className="splash-section-label">Conteúdo</p>

            {/* Header image */}
            <div className="splash-field">
              <label className="splash-field__label">Imagem de header</label>
              <div
                className={`splash-img-zone${texts.imageUrl ? ' splash-img-zone--filled' : ''}`}
                onClick={() => imageInputRef.current?.click()}
              >
                <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={async e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const result = await processImageToDataUrl(f, 'splash-header');
                    setText('imageUrl', result.dataUrl);
                  }} />
                {texts.imageUrl ? (
                  <>
                    <img src={texts.imageUrl} alt="" className="splash-img-zone__img" />
                    <button type="button" className="splash-img-zone__remove"
                      onClick={e => { e.stopPropagation(); setText('imageUrl', null); }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                    </button>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--color-gray-400)' }}>image</span>
                    <span className="splash-img-zone__label">Clique para adicionar imagem de header</span>
                    <span className="splash-img-zone__hint">Proporção recomendada 16:5 · PNG, JPG, WebP</span>
                  </>
                )}
              </div>
              <button type="button" className="media-picker-trigger" onClick={() => setPickerOpen(true)}>
                ou escolher da Biblioteca
              </button>
              <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={url => setText('imageUrl', url)} portalDbId={portalDbId} />
            </div>

            {/* Título */}
            <div className="splash-field">
              <label className="splash-field__label">Título</label>
              <input className="splash-field__input" type="text"
                placeholder="Ex: Nota Importante ao Mercado"
                value={texts.titulo} onChange={e => setText('titulo', e.target.value)} />
            </div>

            {/* Texto intro */}
            <div className="splash-field">
              <label className="splash-field__label">Texto introdutório</label>
              <textarea className="splash-field__input splash-field__textarea" rows={3}
                placeholder="Breve descrição ou lead do comunicado..."
                value={texts.texto} onChange={e => setText('texto', e.target.value)} />
            </div>

            {/* Conteúdo */}
            <div className="splash-field">
              <label className="splash-field__label">Conteúdo</label>
              <textarea className="splash-field__input splash-field__textarea" rows={5}
                placeholder="Corpo do comunicado, instruções ou informações detalhadas..."
                value={texts.conteudo} onChange={e => setText('conteudo', e.target.value)} />
            </div>

            {/* Legenda */}
            <div className="splash-field">
              <label className="splash-field__label">Legenda <span style={{ fontWeight: 400, color: 'var(--color-gray-400)' }}>(opcional)</span></label>
              <input className="splash-field__input" type="text"
                placeholder="Ex: contato@empresa.com.br · Av. Paulista, 1000 — São Paulo"
                value={texts.legenda} onChange={e => setText('legenda', e.target.value)} />
            </div>
          </div>

          {/* Buttons */}
          <div className="splash-card">
            <div className="splash-btns-head">
              <div>
                <p className="splash-section-label" style={{ margin: 0 }}>Botões de ação</p>
                <p className="splash-card__desc" style={{ marginTop: 4 }}>Adicione até 2 botões para direcionar o visitante.</p>
              </div>
              {config.buttons.length < 2 && (
                <button type="button" className="btn-action btn-action--enter" onClick={addBtn}>
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>add</span>
                  Adicionar botão
                </button>
              )}
            </div>

            {config.buttons.length === 0 && (
              <p className="splash-no-btns">Nenhum botão adicionado. O splash exibirá apenas um botão de fechar.</p>
            )}

            {config.buttons.map((btn, i) => (
              <div key={i} className="splash-btn-editor">
                <div className="splash-btn-editor__head">
                  <span className="splash-btn-editor__num">Botão {i + 1}</span>
                  <button type="button" className="btn-action btn-action--danger" style={{ padding: '4px 8px' }}
                    onClick={() => removeBtn(i)}>
                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>delete</span>
                  </button>
                </div>
                <div className="splash-btn-editor__fields">
                  <div className="splash-field">
                    <label className="splash-field__label">Texto do botão</label>
                    <input className="splash-field__input" type="text" placeholder="Ex: Saiba mais"
                      value={btn.label} onChange={e => patchBtn(i, 'label', e.target.value)} />
                  </div>
                  <div className="splash-field">
                    <label className="splash-field__label">URL de destino</label>
                    <input className="splash-field__input" type="text" placeholder="/pagina ou https://..."
                      value={btn.url} onChange={e => patchBtn(i, 'url', e.target.value)} />
                  </div>
                  <div className="splash-field">
                    <label className="splash-field__label">Estilo</label>
                    <div className="splash-variant-pick">
                      {(['primary', 'outline'] as const).map(v => (
                        <button key={v} type="button"
                          className={`splash-variant-chip${btn.variant === v ? ' splash-variant-chip--active' : ''}`}
                          onClick={() => patchBtn(i, 'variant', v)}>
                          {v === 'primary' ? 'Preenchido' : 'Contorno'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: mini-preview */}
        <aside className="splash-preview-aside">
          <p className="splash-section-label">Pré-visualização</p>
          <div className="splash-mini-preview">
            <div className="splash-mini-preview__overlay">
              <div
                className="splash-mini-preview__modal"
                style={{ width: `${Math.round(SIZE_PX[config.size] * 0.45)}px` }}
              >
                {texts.imageUrl && (
                  <img src={texts.imageUrl} alt="" className="splash-mini-preview__img" />
                )}
                {!texts.imageUrl && (
                  <div className="splash-mini-preview__img-placeholder">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>image</span>
                  </div>
                )}
                <div className="splash-mini-preview__body">
                  <p className="splash-mini-preview__title">{texts.titulo || 'Título do comunicado'}</p>
                  <p className="splash-mini-preview__text">{texts.texto || 'Texto introdutório do splash aparecerá aqui.'}</p>
                  {texts.conteudo && (
                    <p className="splash-mini-preview__content">{texts.conteudo.slice(0, 120)}{texts.conteudo.length > 120 ? '…' : ''}</p>
                  )}
                  {config.buttons.length > 0 && (
                    <div className="splash-mini-preview__btns">
                      {config.buttons.map((b, i) => (
                        <div key={i} className={`splash-mini-preview__btn splash-mini-preview__btn--${b.variant}`}>
                          {b.label || `Botão ${i + 1}`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="splash-mini-preview__close">✕</div>
              </div>
            </div>
            <p className="splash-mini-preview__badge">{selectedSize.label} — {SIZE_PX[config.size]}px</p>
          </div>
        </aside>
      </div>

      {/* Full preview modal */}
      {previewOpen && (
        <div className="splash-fullpreview" onClick={() => setPreviewOpen(false)}>
          <div
            className="splash-fullpreview__modal"
            style={{ maxWidth: `${SIZE_PX[config.size]}px` }}
            onClick={e => e.stopPropagation()}
          >
            {texts.imageUrl ? (
              <img src={texts.imageUrl} alt="" className="splash-fullpreview__img" />
            ) : (
              <div className="splash-fullpreview__img-placeholder">
                <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>image</span>
                <span>Imagem de header</span>
              </div>
            )}
            <div className="splash-fullpreview__body">
              <h2 className="splash-fullpreview__title">{texts.titulo || 'Título do comunicado'}</h2>
              {texts.texto && <p className="splash-fullpreview__lead">{texts.texto}</p>}
              {texts.conteudo && <p className="splash-fullpreview__content">{texts.conteudo}</p>}
              {texts.legenda && <p className="splash-fullpreview__legenda">{texts.legenda}</p>}
              {config.buttons.length > 0 && (
                <div className="splash-fullpreview__btns">
                  {config.buttons.map((b, i) => (
                    <button key={i} type="button"
                      className={`splash-fullpreview__btn splash-fullpreview__btn--${b.variant}`}>
                      {b.label || `Botão ${i + 1}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" className="splash-fullpreview__close" onClick={() => setPreviewOpen(false)}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
            </button>
          </div>
        </div>
      )}
      <UnsavedModal open={blocker.state === 'blocked'} onStay={() => blocker.reset?.()} onLeave={() => blocker.proceed?.()} />

      {saveTemplateOpen && (
        <Modal open onClose={() => setSaveTemplateOpen(false)} title="Salvar como modelo" size="sm"
          footer={
            <div className="modal-footer">
              <button type="button" className="btn-outline" onClick={() => setSaveTemplateOpen(false)}>Cancelar</button>
              <button type="button" className="btn-primary" disabled={!saveTemplateName.trim()} onClick={saveAsTemplate}>Salvar</button>
            </div>
          }
        >
          <div className="cdr-modal-form">
            <p className="doc-field__hint" style={{ margin: 0 }}>
              Salva o título, textos e botões atuais como um modelo reutilizável em Splash → Templates. Ativação e imagem de header não são salvas no modelo.
            </p>
            <label className="doc-field">
              <span className="doc-field__label">Nome do modelo</span>
              <input className="doc-field__input" type="text" placeholder="Ex: Fato Relevante"
                value={saveTemplateName} onChange={e => setSaveTemplateName(e.target.value)} autoFocus />
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
}
