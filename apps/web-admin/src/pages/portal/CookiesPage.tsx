import { useState } from 'react';
import StickyPageHeader from '../../components/StickyPageHeader';
import PORTAL_CONFIG from '../../portalConfig';
import '../admin/AdminPages.css';
import './SplashPage.css';
import './CookiesPage.css';

/* ─── Types ──────────────────────────────────────────── */
type CkLayout  = 'left' | 'right' | 'center' | 'full';
type CkTheme   = 'light' | 'dark';
type BtnVariant = 'primary' | 'outline';

interface CkBtn {
  label: string;
  url: string;
  variant: BtnVariant;
}

interface CookieConfig {
  enabled: boolean;
  layout: CkLayout;
  theme: CkTheme;
  title: string;
  description: string;
  linkText: string;
  linkUrl: string;
  acceptLabel: string;
  rejectLabel: string;
  showReject: boolean;
  showCustomize: boolean;
  customizeLabel: string;
  buttons: CkBtn[];
}

const DEFAULT: CookieConfig = {
  enabled: true,
  layout: 'full',
  theme: 'light',
  title: 'Utilizamos cookies',
  description: 'Usamos cookies para melhorar sua experiência, personalizar conteúdos e analisar o tráfego do nosso site.',
  linkText: 'Política de Privacidade',
  linkUrl: '/politica-de-privacidade',
  acceptLabel: 'Aceitar todos',
  rejectLabel: 'Rejeitar',
  showReject: true,
  showCustomize: true,
  customizeLabel: 'Personalizar',
  buttons: [],
};

/* ─── Layout options ─────────────────────────────────── */
const LAYOUTS: { id: CkLayout; label: string; desc: string; thumb: React.ReactNode }[] = [
  {
    id: 'left',
    label: 'Bloco à esquerda',
    desc: 'Card fixo no canto inferior esquerdo',
    thumb: (
      <svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg" className="splash-thumb-svg">
        <rect width="160" height="100" fill="#e5e7eb" rx="4" />
        <rect x="6" y="54" width="62" height="40" rx="4" fill="#fff" stroke="#d1d5db" strokeWidth="1" />
        <rect x="12" y="60" width="40" height="5" rx="2" fill="#0B5B68" opacity="0.7" />
        <rect x="12" y="69" width="50" height="3" rx="2" fill="#d1d5db" />
        <rect x="12" y="75" width="44" height="3" rx="2" fill="#d1d5db" />
        <rect x="12" y="83" width="24" height="7" rx="3" fill="#0B5B68" />
        <rect x="40" y="83" width="20" height="7" rx="3" fill="#e5e7eb" />
      </svg>
    ),
  },
  {
    id: 'right',
    label: 'Bloco à direita',
    desc: 'Card fixo no canto inferior direito',
    thumb: (
      <svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg" className="splash-thumb-svg">
        <rect width="160" height="100" fill="#e5e7eb" rx="4" />
        <rect x="92" y="54" width="62" height="40" rx="4" fill="#fff" stroke="#d1d5db" strokeWidth="1" />
        <rect x="98" y="60" width="40" height="5" rx="2" fill="#0B5B68" opacity="0.7" />
        <rect x="98" y="69" width="50" height="3" rx="2" fill="#d1d5db" />
        <rect x="98" y="75" width="44" height="3" rx="2" fill="#d1d5db" />
        <rect x="98" y="83" width="24" height="7" rx="3" fill="#0B5B68" />
        <rect x="126" y="83" width="20" height="7" rx="3" fill="#e5e7eb" />
      </svg>
    ),
  },
  {
    id: 'center',
    label: 'Bloco centralizado',
    desc: 'Card compacto centralizado na base',
    thumb: (
      <svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg" className="splash-thumb-svg">
        <rect width="160" height="100" fill="#e5e7eb" rx="4" />
        <rect x="40" y="54" width="80" height="40" rx="4" fill="#fff" stroke="#d1d5db" strokeWidth="1" />
        <rect x="48" y="60" width="44" height="5" rx="2" fill="#0B5B68" opacity="0.7" />
        <rect x="48" y="69" width="64" height="3" rx="2" fill="#d1d5db" />
        <rect x="48" y="75" width="56" height="3" rx="2" fill="#d1d5db" />
        <rect x="52" y="83" width="28" height="7" rx="3" fill="#0B5B68" />
        <rect x="84" y="83" width="24" height="7" rx="3" fill="#e5e7eb" />
      </svg>
    ),
  },
  {
    id: 'full',
    label: 'Largura completa',
    desc: 'Faixa que preenche toda a largura da tela',
    thumb: (
      <svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg" className="splash-thumb-svg">
        <rect width="160" height="100" fill="#e5e7eb" rx="4" />
        <rect x="0" y="72" width="160" height="28" rx="0" fill="#fff" stroke="#d1d5db" strokeWidth="1" />
        <rect x="10" y="78" width="50" height="5" rx="2" fill="#0B5B68" opacity="0.7" />
        <rect x="10" y="87" width="70" height="3" rx="2" fill="#d1d5db" />
        <rect x="110" y="78" width="30" height="8" rx="3" fill="#0B5B68" />
        <rect x="144" y="78" width="8" height="8" rx="2" fill="#e5e7eb" />
      </svg>
    ),
  },
];

/* ─── Mini preview ───────────────────────────────────── */
function CookieMiniPreview({ cfg }: { cfg: CookieConfig }) {
  const isDark = cfg.theme === 'dark';
  const bg = isDark ? '#141414' : '#ffffff';
  const text = isDark ? '#ffffff' : '#374151';
  const acceptBg = '#0B5B68';
  const rejectBg = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)';
  const rejectText = isDark ? '#fff' : '#0B5B68';
  const isCompact = cfg.layout !== 'full';

  const bannerStyle: React.CSSProperties = {
    background: bg,
    color: text,
    borderRadius: isCompact ? 8 : 0,
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    padding: isCompact ? '10px 12px' : '8px 12px',
    display: 'flex',
    flexDirection: isCompact ? 'column' : 'row',
    alignItems: isCompact ? 'flex-start' : 'center',
    gap: 8,
    width: isCompact ? 130 : '100%',
    boxSizing: 'border-box' as const,
  };

  const content = (
    <div style={bannerStyle}>
      {/* For full-width: wrap title+desc together so buttons stay on the opposite side */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: isCompact ? undefined : 1, minWidth: 0 }}>
        {cfg.title && (
          <strong style={{ fontSize: 8, display: 'block', lineHeight: 1.3, color: isDark ? '#fff' : '#111' }}>
            {cfg.title}
          </strong>
        )}
        <span style={{ fontSize: 7, lineHeight: 1.4, opacity: 0.75 }}>
          {cfg.description.slice(0, isCompact ? 60 : 100)}…
        </span>
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0 }}>
        {cfg.showCustomize && (
          <span style={{ fontSize: 7, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: rejectBg, color: rejectText }}>
            {cfg.customizeLabel}
          </span>
        )}
        {cfg.showReject && (
          <span style={{ fontSize: 7, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: rejectBg, color: rejectText }}>
            {cfg.rejectLabel}
          </span>
        )}
        <span style={{ fontSize: 7, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: acceptBg, color: '#fff' }}>
          {cfg.acceptLabel}
        </span>
      </div>
    </div>
  );

  return (
    <div className="ck-mini-preview">
      <div className="ck-mini-preview__page">
        <div className="ck-mini-preview__lines">
          {[60, 80, 50, 70, 40].map((w, i) => (
            <div key={i} className="ck-mini-preview__line" style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className={`ck-mini-preview__banner ck-mini-preview__banner--${cfg.layout}`}>
          {content}
        </div>
      </div>
      <p className="splash-mini-preview__badge" style={{ textAlign: 'center', marginTop: 8 }}>
        {LAYOUTS.find(l => l.id === cfg.layout)?.label}
      </p>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────── */
export default function CookiesPage() {
  const [cfg, setCfg] = useState<CookieConfig>(DEFAULT);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof CookieConfig>(key: K, value: CookieConfig[K]) {
    setCfg(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function addBtn() {
    if (cfg.buttons.length >= 2) return;
    set('buttons', [...cfg.buttons, { label: '', url: '', variant: 'primary' }]);
  }

  function removeBtn(i: number) {
    set('buttons', cfg.buttons.filter((_, idx) => idx !== i));
  }

  function patchBtn(i: number, field: keyof CkBtn, val: string) {
    set('buttons', cfg.buttons.map((b, idx) => idx === i ? { ...b, [field]: val } : b));
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="page">
      <StickyPageHeader
        title="Cookies"
        description={<>Configure o banner de consentimento de cookies do portal <strong>{PORTAL_CONFIG.name}</strong>.</>}
        action={
          <button className="btn-primary" type="button" onClick={handleSave}>
            {saved ? 'Salvo!' : 'Salvar alterações'}
          </button>
        }
      />

      <div className="splash-layout">
        {/* ── Editor ── */}
        <div className="splash-editor">

          {/* Ativação */}
          <div className="splash-card">
            <div className="splash-card__head">
              <span className="material-symbols-outlined splash-card__icon">cookie</span>
              <div>
                <p className="splash-card__title">Ativação</p>
                <p className="splash-card__desc">Quando desativado, nenhum banner de cookies será exibido no portal.</p>
              </div>
              <label className="splash-switch">
                <input type="checkbox" checked={cfg.enabled} onChange={e => set('enabled', e.target.checked)} />
                <span className="splash-switch__track" />
              </label>
            </div>
          </div>

          {/* Layout */}
          <div className="splash-card">
            <p className="splash-section-label">Modelo de exibição</p>
            <div className="splash-sizes">
              {LAYOUTS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  className={`splash-size-card${cfg.layout === opt.id ? ' splash-size-card--active' : ''}`}
                  onClick={() => set('layout', opt.id)}
                >
                  <div className="splash-size-card__thumb">{opt.thumb}</div>
                  <div className="splash-size-card__info">
                    <span className="splash-size-card__label">{opt.label}</span>
                    <span className="splash-size-card__desc">{opt.desc}</span>
                  </div>
                  {cfg.layout === opt.id && (
                    <span className="splash-size-card__check">
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>check</span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tema */}
          <div className="splash-card">
            <p className="splash-section-label">Tema</p>
            <div className="ck-theme-grid">
              {([
                { id: 'light' as CkTheme, label: 'Claro', desc: 'Fundo branco com texto escuro' },
                { id: 'dark' as CkTheme,  label: 'Escuro', desc: 'Fundo escuro com texto claro' },
              ]).map(t => (
                <button
                  key={t.id}
                  type="button"
                  className={`ck-theme-card${cfg.theme === t.id ? ' ck-theme-card--active' : ''}`}
                  onClick={() => set('theme', t.id)}
                >
                  <div className={`ck-theme-card__swatch ck-theme-card__swatch--${t.id}`} />
                  <div>
                    <span className="ck-theme-card__label">{t.label}</span>
                    <span className="ck-theme-card__desc">{t.desc}</span>
                  </div>
                  {cfg.theme === t.id && (
                    <span className="splash-size-card__check">
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>check</span>
                    </span>
                  )}
                </button>
              ))}
            </div>

          </div>

          {/* Textos */}
          <div className="splash-card">
            <p className="splash-section-label">Textos</p>

            <div className="splash-field">
              <label className="splash-field__label">Título</label>
              <input className="splash-field__input" type="text"
                placeholder="Ex: Utilizamos cookies"
                value={cfg.title} onChange={e => set('title', e.target.value)} />
            </div>

            <div className="splash-field">
              <label className="splash-field__label">Descrição</label>
              <textarea className="splash-field__input splash-field__textarea" rows={3}
                value={cfg.description} onChange={e => set('description', e.target.value)} />
            </div>

            <div className="ck-two-col">
              <div className="splash-field">
                <label className="splash-field__label">Texto do link de política</label>
                <input className="splash-field__input" type="text"
                  value={cfg.linkText} onChange={e => set('linkText', e.target.value)} />
              </div>
              <div className="splash-field">
                <label className="splash-field__label">URL da política</label>
                <input className="splash-field__input" type="text"
                  placeholder="/politica-de-privacidade"
                  value={cfg.linkUrl} onChange={e => set('linkUrl', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Botões de consentimento */}
          <div className="splash-card">
            <p className="splash-section-label">Botões de consentimento</p>

            <div className="splash-field">
              <label className="splash-field__label">Rótulo do botão Aceitar</label>
              <input className="splash-field__input" type="text"
                value={cfg.acceptLabel} onChange={e => set('acceptLabel', e.target.value)} />
            </div>

            <div className="ck-consent-btn-row">
              <div className="ck-consent-toggle">
                <div>
                  <p className="splash-card__title" style={{ fontSize: 'var(--text-sm)' }}>Mostrar botão Rejeitar</p>
                </div>
                <label className="splash-switch">
                  <input type="checkbox" checked={cfg.showReject} onChange={e => set('showReject', e.target.checked)} />
                  <span className="splash-switch__track" />
                </label>
              </div>
              {cfg.showReject && (
                <div className="splash-field">
                  <label className="splash-field__label">Rótulo do botão Rejeitar</label>
                  <input className="splash-field__input" type="text"
                    value={cfg.rejectLabel} onChange={e => set('rejectLabel', e.target.value)} />
                </div>
              )}
            </div>

            <div className="ck-consent-btn-row">
              <div className="ck-consent-toggle">
                <div>
                  <p className="splash-card__title" style={{ fontSize: 'var(--text-sm)' }}>Mostrar botão Personalizar</p>
                </div>
                <label className="splash-switch">
                  <input type="checkbox" checked={cfg.showCustomize} onChange={e => set('showCustomize', e.target.checked)} />
                  <span className="splash-switch__track" />
                </label>
              </div>
              {cfg.showCustomize && (
                <div className="splash-field">
                  <label className="splash-field__label">Rótulo do botão Personalizar</label>
                  <input className="splash-field__input" type="text"
                    value={cfg.customizeLabel} onChange={e => set('customizeLabel', e.target.value)} />
                </div>
              )}
            </div>
          </div>

          {/* Botões de ação extras (estilo SplashPage) */}
          <div className="splash-card">
            <div className="splash-btns-head">
              <div>
                <p className="splash-section-label" style={{ margin: 0 }}>Botões de ação</p>
                <p className="splash-card__desc" style={{ marginTop: 4 }}>Adicione até 2 botões para direcionar o visitante.</p>
              </div>
              {cfg.buttons.length < 2 && (
                <button type="button" className="btn-action btn-action--enter" onClick={addBtn}>
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>add</span>
                  Adicionar botão
                </button>
              )}
            </div>

            {cfg.buttons.length === 0 && (
              <p className="splash-no-btns">Nenhum botão de ação adicionado.</p>
            )}

            {cfg.buttons.map((btn, i) => (
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

        {/* ── Preview sidebar ── */}
        <aside className="splash-preview-aside">
          <p className="splash-section-label">Pré-visualização</p>
          <CookieMiniPreview cfg={cfg} />
        </aside>
      </div>
    </div>
  );
}
