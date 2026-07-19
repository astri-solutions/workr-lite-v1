import { useState, useEffect, useRef } from 'react';
import { processImage } from '../../utils/imageProcessor';
import StickyPageHeader from '../../components/StickyPageHeader';
import LangTabs from '../../components/LangTabs';
import UnsavedModal from '../../components/UnsavedModal';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import PORTAL_CONFIG, { LocaleCode } from '../../portalConfig';
import { usePortalName } from '../../hooks/usePortalName';
import { usePortalState } from '../../hooks/usePortalState';
import { savePortalConfig } from '../../lib/portalConfigApi';
import { useActivePortalId } from '../../hooks/useActivePortalId';
import { usePublish } from '../../contexts/PublishContext';
import PublishButton from '../../components/PublishButton';
import '../admin/AdminPages.css';
import './SplashPage.css';

export const SPLASH_KEY = 'portal_splash';

type SplashSize = 'sm' | 'md' | 'lg';

interface SplashBtn {
  label: string;
  url: string;
  variant: 'primary' | 'outline';
}

interface SplashConfig {
  enabled: boolean;
  size: SplashSize;
  imageUrl: string | null;
  titulo: string;
  texto: string;
  conteudo: string;
  legenda: string;
  buttons: SplashBtn[];
}

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

const DEFAULT_SPLASH: SplashConfig = {
  enabled: true,
  size: 'md',
  imageUrl: null,
  titulo: '',
  texto: '',
  conteudo: '',
  legenda: '',
  buttons: [],
};

export default function SplashPage() {
  const portalName = usePortalName();
  const activePortalId = useActivePortalId();
  const { publish } = usePublish();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [persisted, setPersisted, { hydrated }] = usePortalState<SplashConfig>(SPLASH_KEY, 'splash', DEFAULT_SPLASH);
  const [config, setConfig] = useState<SplashConfig>(persisted);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeLang, setActiveLang] = useState<LocaleCode>(PORTAL_CONFIG.languages[0]);

  // Sync draft once the authoritative Supabase value arrives
  useEffect(() => {
    if (hydrated) setConfig({ ...DEFAULT_SPLASH, ...persisted });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const isDirty = !saved && JSON.stringify(config) !== JSON.stringify(persisted);
  const blocker = useUnsavedChanges(isDirty);

  function patch<K extends keyof SplashConfig>(key: K, val: SplashConfig[K]) {
    setConfig(c => ({ ...c, [key]: val }));
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

  const selectedSize = SIZE_OPTIONS.find(s => s.id === config.size)!;

  return (
    <div className="page">
      <StickyPageHeader
        title="Splash"
        description={<>Splash de entrada do portal <strong>{portalName}</strong>. Exibido automaticamente ao acessar o site.</>}
        action={
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <button type="button" className="btn-outline" onClick={() => setPreviewOpen(true)}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>visibility</span>
              Pré-visualizar
            </button>
            <button type="button" className="btn-outline" onClick={handleSave} disabled={!isDirty && saved}>
              {saved ? 'Salvo!' : 'Salvar rascunho'}
            </button>
            <PublishButton onClick={handlePublish} />
          </div>
        }
      />

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
                className={`splash-img-zone${config.imageUrl ? ' splash-img-zone--filled' : ''}`}
                onClick={() => imageInputRef.current?.click()}
              >
                <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={async e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const result = await processImage(f, 'splash-header');
                    patch('imageUrl', result.objectUrl);
                  }} />
                {config.imageUrl ? (
                  <>
                    <img src={config.imageUrl} alt="" className="splash-img-zone__img" />
                    <button type="button" className="splash-img-zone__remove"
                      onClick={e => { e.stopPropagation(); patch('imageUrl', null); }}>
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
            </div>

            {/* Título */}
            <div className="splash-field">
              <label className="splash-field__label">Título</label>
              <input className="splash-field__input" type="text"
                placeholder="Ex: Nota Importante ao Mercado"
                value={config.titulo} onChange={e => patch('titulo', e.target.value)} />
            </div>

            {/* Texto intro */}
            <div className="splash-field">
              <label className="splash-field__label">Texto introdutório</label>
              <textarea className="splash-field__input splash-field__textarea" rows={3}
                placeholder="Breve descrição ou lead do comunicado..."
                value={config.texto} onChange={e => patch('texto', e.target.value)} />
            </div>

            {/* Conteúdo */}
            <div className="splash-field">
              <label className="splash-field__label">Conteúdo</label>
              <textarea className="splash-field__input splash-field__textarea" rows={5}
                placeholder="Corpo do comunicado, instruções ou informações detalhadas..."
                value={config.conteudo} onChange={e => patch('conteudo', e.target.value)} />
            </div>

            {/* Legenda */}
            <div className="splash-field">
              <label className="splash-field__label">Legenda <span style={{ fontWeight: 400, color: 'var(--color-gray-400)' }}>(opcional)</span></label>
              <input className="splash-field__input" type="text"
                placeholder="Ex: contato@empresa.com.br · Av. Paulista, 1000 — São Paulo"
                value={config.legenda} onChange={e => patch('legenda', e.target.value)} />
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
                {config.imageUrl && (
                  <img src={config.imageUrl} alt="" className="splash-mini-preview__img" />
                )}
                {!config.imageUrl && (
                  <div className="splash-mini-preview__img-placeholder">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>image</span>
                  </div>
                )}
                <div className="splash-mini-preview__body">
                  <p className="splash-mini-preview__title">{config.titulo || 'Título do comunicado'}</p>
                  <p className="splash-mini-preview__text">{config.texto || 'Texto introdutório do splash aparecerá aqui.'}</p>
                  {config.conteudo && (
                    <p className="splash-mini-preview__content">{config.conteudo.slice(0, 120)}{config.conteudo.length > 120 ? '…' : ''}</p>
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
            {config.imageUrl ? (
              <img src={config.imageUrl} alt="" className="splash-fullpreview__img" />
            ) : (
              <div className="splash-fullpreview__img-placeholder">
                <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>image</span>
                <span>Imagem de header</span>
              </div>
            )}
            <div className="splash-fullpreview__body">
              <h2 className="splash-fullpreview__title">{config.titulo || 'Título do comunicado'}</h2>
              {config.texto && <p className="splash-fullpreview__lead">{config.texto}</p>}
              {config.conteudo && <p className="splash-fullpreview__content">{config.conteudo}</p>}
              {config.legenda && <p className="splash-fullpreview__legenda">{config.legenda}</p>}
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
    </div>
  );
}
