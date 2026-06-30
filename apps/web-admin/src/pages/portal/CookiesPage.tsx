import { useState } from 'react';
import StickyPageHeader from '../../components/StickyPageHeader';
import PORTAL_CONFIG from '../../portalConfig';
import '../admin/AdminPages.css';
import './PersonalizarPages.css';
import './CookiesPage.css';

/* ─── Types ──────────────────────────────────────────── */
type Position = 'bottom' | 'top' | 'left' | 'right' | 'center';
type Layout   = 'bar' | 'box' | 'floating';

interface CookieConfig {
  enabled: boolean;
  position: Position;
  layout: Layout;
  // Texts
  title: string;
  description: string;
  linkText: string;
  linkUrl: string;
  // Buttons
  acceptLabel: string;
  rejectLabel: string;
  customizeLabel: string;
  showReject: boolean;
  showCustomize: boolean;
  // Colors
  bgColor: string;
  textColor: string;
  acceptBg: string;
  acceptText: string;
  rejectBg: string;
  rejectText: string;
  // Border radius
  radius: number;
}

const DEFAULT: CookieConfig = {
  enabled: true,
  position: 'bottom' as Position,
  layout: 'bar',
  title: 'Utilizamos cookies',
  description: 'Usamos cookies para melhorar sua experiência, personalizar conteúdos e analisar o tráfego do nosso site. Ao continuar navegando, você concorda com nossa política de privacidade.',
  linkText: 'Política de Privacidade',
  linkUrl: '/politica-de-privacidade',
  acceptLabel: 'Aceitar todos',
  rejectLabel: 'Rejeitar',
  customizeLabel: 'Personalizar',
  showReject: true,
  showCustomize: true,
  acceptBg: '#0B5B68',
  acceptText: '#ffffff',
  rejectBg: 'transparent',
  rejectText: '#0B5B68',
  bgColor: '#ffffff',
  textColor: '#374151',
  radius: 8,
};

const POSITIONS: { value: Position; label: string }[] = [
  { value: 'bottom', label: 'Inferior (largura total)' },
  { value: 'top', label: 'Superior (largura total)' },
  { value: 'left', label: 'Compacto à esquerda' },
  { value: 'right', label: 'Compacto à direita' },
  { value: 'center', label: 'Compacto centralizado' },
];

const LAYOUTS: { value: Layout; label: string; desc: string }[] = [
  { value: 'bar', label: 'Barra', desc: 'Faixa horizontal completa' },
  { value: 'box', label: 'Caixa', desc: 'Card com modal centralizado' },
  { value: 'floating', label: 'Flutuante', desc: 'Card compacto posicionado' },
];

/* ─── Live preview ───────────────────────────────────── */
function CookiePreview({ cfg }: { cfg: CookieConfig }) {
  const isCompact = cfg.layout === 'floating' || cfg.position === 'left' || cfg.position === 'right' || cfg.position === 'center';

  function bannerClass() {
    if (cfg.layout === 'floating' || cfg.position === 'left') return 'left';
    if (cfg.position === 'right') return 'right';
    if (cfg.position === 'center') return 'center';
    if (cfg.position === 'top') return 'top';
    return 'bottom';
  }

  return (
    <div className="ck-preview">
      {/* Simulated browser window */}
      <div className="ck-preview__browser">
        <div className="ck-preview__bar">
          <span className="ck-preview__dot" style={{ background: '#ff5f57' }}/>
          <span className="ck-preview__dot" style={{ background: '#febc2e' }}/>
          <span className="ck-preview__dot" style={{ background: '#28c840' }}/>
          <span className="ck-preview__url">workr.com.br</span>
        </div>
        <div className="ck-preview__page">
          {/* Page content placeholder */}
          <div className="ck-preview__content">
            <div className="ck-preview__line" style={{ width: '60%' }} />
            <div className="ck-preview__line" style={{ width: '80%' }} />
            <div className="ck-preview__line" style={{ width: '45%' }} />
            <div className="ck-preview__line" style={{ width: '70%' }} />
            <div className="ck-preview__line" style={{ width: '55%' }} />
          </div>

          {/* Cookie bar */}
          {cfg.enabled && (
            <div
              className={`ck-preview__banner ck-preview__banner--${bannerClass()}`}
              style={{
                background: cfg.bgColor,
                color: cfg.textColor,
                borderRadius: isCompact ? cfg.radius : cfg.layout === 'bar' ? 0 : cfg.radius,
                boxShadow: '0 4px 24px rgba(0,0,0,0.14)',
                flexDirection: isCompact || cfg.layout !== 'bar' ? 'column' : 'row',
              }}
            >
              <div className="ck-preview__text">
                {cfg.title && <strong className="ck-preview__title">{cfg.title}</strong>}
                <span className="ck-preview__desc">{cfg.description.slice(0, 80)}…</span>
              </div>
              <div className="ck-preview__btns">
                {cfg.showCustomize && (
                  <button className="ck-preview__btn" style={{ background: cfg.rejectBg === 'transparent' ? 'rgba(0,0,0,0.06)' : cfg.rejectBg, color: cfg.rejectText, borderRadius: cfg.radius / 2 }}>
                    {cfg.customizeLabel}
                  </button>
                )}
                {cfg.showReject && (
                  <button className="ck-preview__btn" style={{ background: cfg.rejectBg === 'transparent' ? 'rgba(0,0,0,0.06)' : cfg.rejectBg, color: cfg.rejectText, borderRadius: cfg.radius / 2 }}>
                    {cfg.rejectLabel}
                  </button>
                )}
                <button className="ck-preview__btn ck-preview__btn--accept" style={{ background: cfg.acceptBg, color: cfg.acceptText, borderRadius: cfg.radius / 2 }}>
                  {cfg.acceptLabel}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Section wrapper ────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pers-section">
      <h2 className="pers-section__title">{title}</h2>
      {children}
    </div>
  );
}

/* ─── Color field ────────────────────────────────────── */
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="ck-color-field">
      <span className="ck-color-field__label">{label}</span>
      <div className="ck-color-field__row">
        <input type="color" className="ck-color-input" value={value === 'transparent' ? '#ffffff' : value} onChange={e => onChange(e.target.value)} />
        <input type="text" className="ck-text-input" value={value} onChange={e => onChange(e.target.value)} />
      </div>
    </label>
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

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="page">
      <StickyPageHeader
        title="Cookies"
        description={<>Configure a barra de consentimento de cookies do portal <strong>{PORTAL_CONFIG.name}</strong>.</>}
        action={
          <button className="btn-primary" type="button" onClick={handleSave}>
            {saved ? 'Salvo!' : 'Salvar alterações'}
          </button>
        }
      />

      {/* Preview */}
      <Section title="Pré-visualização">
        <CookiePreview cfg={cfg} />
      </Section>

      {/* Enable toggle */}
      <Section title="Ativação">
        <div className="ck-card">
          <div className="ck-toggle-row">
            <div>
              <p className="ck-toggle-row__label">Exibir banner de cookies</p>
              <p className="ck-toggle-row__hint">Quando desativado, nenhum banner será exibido no portal.</p>
            </div>
            <button
              type="button"
              className={`ck-toggle${cfg.enabled ? ' ck-toggle--on' : ''}`}
              onClick={() => set('enabled', !cfg.enabled)}
            >
              <span className="ck-toggle__knob" />
            </button>
          </div>
        </div>
      </Section>

      {/* Layout & position */}
      <Section title="Estilo e posição">
        <div className="ck-card">
          <div className="ck-field-group">
            <label className="ck-label">Modelo</label>
            <div className="ck-layout-grid">
              {LAYOUTS.map(l => (
                <button
                  key={l.value}
                  type="button"
                  className={`ck-layout-btn${cfg.layout === l.value ? ' ck-layout-btn--active' : ''}`}
                  onClick={() => set('layout', l.value)}
                >
                  <span className="ck-layout-btn__name">{l.label}</span>
                  <span className="ck-layout-btn__desc">{l.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="ck-field-group">
            <label className="ck-label" htmlFor="ck-position">Posição</label>
            <div className="filter-wrap" style={{ maxWidth: 320 }}>
              <select id="ck-position" className="filter-select" value={cfg.position} onChange={e => set('position', e.target.value as Position)}>
                {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <span className="material-symbols-outlined filter-wrap__icon">expand_more</span>
            </div>
          </div>

          <div className="ck-field-group">
            <label className="ck-label">Arredondamento das bordas</label>
            <div className="ck-radius-row">
              <input
                type="range" min={0} max={24} value={cfg.radius}
                onChange={e => set('radius', Number(e.target.value))}
                className="ck-range"
              />
              <span className="ck-range-val">{cfg.radius}px</span>
            </div>
          </div>
        </div>
      </Section>

      {/* Colors */}
      <Section title="Cores">
        <div className="ck-card">
          <div className="ck-color-grid">
            <ColorField label="Fundo do banner" value={cfg.bgColor} onChange={v => set('bgColor', v)} />
            <ColorField label="Cor do texto" value={cfg.textColor} onChange={v => set('textColor', v)} />
            <ColorField label="Fundo botão aceitar" value={cfg.acceptBg} onChange={v => set('acceptBg', v)} />
            <ColorField label="Texto botão aceitar" value={cfg.acceptText} onChange={v => set('acceptText', v)} />
            <ColorField label="Fundo botão rejeitar" value={cfg.rejectBg} onChange={v => set('rejectBg', v)} />
            <ColorField label="Texto botão rejeitar" value={cfg.rejectText} onChange={v => set('rejectText', v)} />
          </div>
        </div>
      </Section>

      {/* Texts */}
      <Section title="Textos">
        <div className="ck-card">
          <div className="ck-field-group">
            <label className="ck-label" htmlFor="ck-title">Título</label>
            <input id="ck-title" className="ck-text-input ck-text-input--full" type="text"
              value={cfg.title} onChange={e => set('title', e.target.value)}
              placeholder="Ex: Utilizamos cookies" />
          </div>
          <div className="ck-field-group">
            <label className="ck-label" htmlFor="ck-desc">Descrição</label>
            <textarea id="ck-desc" className="ck-text-input ck-text-input--full ck-textarea"
              rows={4} value={cfg.description}
              onChange={e => set('description', e.target.value)} />
          </div>
          <div className="ck-two-col">
            <div className="ck-field-group">
              <label className="ck-label" htmlFor="ck-link-text">Texto do link de política</label>
              <input id="ck-link-text" className="ck-text-input ck-text-input--full" type="text"
                value={cfg.linkText} onChange={e => set('linkText', e.target.value)} />
            </div>
            <div className="ck-field-group">
              <label className="ck-label" htmlFor="ck-link-url">URL da política</label>
              <input id="ck-link-url" className="ck-text-input ck-text-input--full" type="text"
                value={cfg.linkUrl} onChange={e => set('linkUrl', e.target.value)}
                placeholder="/politica-de-privacidade" />
            </div>
          </div>
        </div>
      </Section>

      {/* Buttons */}
      <Section title="Botões">
        <div className="ck-card">
          <div className="ck-field-group">
            <label className="ck-label" htmlFor="ck-accept-label">Rótulo do botão Aceitar</label>
            <input id="ck-accept-label" className="ck-text-input" type="text"
              value={cfg.acceptLabel} onChange={e => set('acceptLabel', e.target.value)} />
          </div>

          <div className="ck-btn-row">
            <div className="ck-toggle-row ck-toggle-row--inline">
              <div>
                <p className="ck-toggle-row__label">Mostrar botão Rejeitar</p>
              </div>
              <button type="button" className={`ck-toggle${cfg.showReject ? ' ck-toggle--on' : ''}`}
                onClick={() => set('showReject', !cfg.showReject)}>
                <span className="ck-toggle__knob" />
              </button>
            </div>
            {cfg.showReject && (
              <div className="ck-field-group">
                <label className="ck-label" htmlFor="ck-reject-label">Rótulo do botão Rejeitar</label>
                <input id="ck-reject-label" className="ck-text-input" type="text"
                  value={cfg.rejectLabel} onChange={e => set('rejectLabel', e.target.value)} />
              </div>
            )}
          </div>

          <div className="ck-btn-row">
            <div className="ck-toggle-row ck-toggle-row--inline">
              <div>
                <p className="ck-toggle-row__label">Mostrar botão Personalizar</p>
              </div>
              <button type="button" className={`ck-toggle${cfg.showCustomize ? ' ck-toggle--on' : ''}`}
                onClick={() => set('showCustomize', !cfg.showCustomize)}>
                <span className="ck-toggle__knob" />
              </button>
            </div>
            {cfg.showCustomize && (
              <div className="ck-field-group">
                <label className="ck-label" htmlFor="ck-custom-label">Rótulo do botão Personalizar</label>
                <input id="ck-custom-label" className="ck-text-input" type="text"
                  value={cfg.customizeLabel} onChange={e => set('customizeLabel', e.target.value)} />
              </div>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}
