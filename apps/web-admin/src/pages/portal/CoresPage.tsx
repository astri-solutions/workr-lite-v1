import { useState } from 'react';
import StickyPageHeader from '../../components/StickyPageHeader';
import UnsavedModal from '../../components/UnsavedModal';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { generateColorScale } from '../../utils/colorUtils';
import PORTAL_CONFIG from '../../portalConfig';
import '../admin/AdminPages.css';
import './CoresPage.css';

interface Palette {
  primary: string;
  secondary: string;
  tertiary: string;
}

const DEFAULT: Palette = {
  primary: '#0B5B68',
  secondary: '#00D865',
  tertiary: '#F4A261',
};


function hexToHsl(hex: string): [number, number, number] | null {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min, l = (max + min) / 2;
  if (d === 0) return [0, 0, Math.round(l * 100)];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function isLight(hex: string): boolean {
  const hsl = hexToHsl(hex);
  return hsl ? hsl[2] > 55 : true;
}

function scaleVar(name: string, step: number) {
  return `var(--prev-${name}-${step})`;
}

interface PreviewProps { palette: Palette }

function ColorPreview({ palette }: PreviewProps) {
  const scales = {
    primary: generateColorScale(palette.primary),
    secondary: generateColorScale(palette.secondary),
    tertiary: generateColorScale(palette.tertiary),
  };

  const cssVars: Record<string, string> = {};
  (['primary', 'secondary', 'tertiary'] as const).forEach(name => {
    Object.entries(scales[name]).forEach(([step, val]) => {
      cssVars[`--prev-${name}-${step}`] = val as string;
    });
  });

  const primaryText = isLight(palette.primary) ? '#141414' : '#ffffff';

  return (
    <div className="cores-preview-wrap" style={cssVars as React.CSSProperties}>
      {/* Light */}
      <div className="cores-preview cores-preview--light">
        <div className="cores-preview__label">
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>light_mode</span>
          LIGHT MODE
        </div>

        <div className="cores-prev-card" style={{ background: scaleVar('primary', 50), border: `1px solid ${scaleVar('primary', 100)}` }}>
          <div className="cores-prev-card__title" style={{ color: scaleVar('primary', 700) }}>Card de exemplo</div>
          <div className="cores-prev-card__sub" style={{ color: scaleVar('primary', 500) }}>Texto de suporte com a paleta gerada.</div>
          <div className="cores-prev-card__tags">
            <span className="cores-prev-tag" style={{ background: scaleVar('primary', 100), color: scaleVar('primary', 600) }}>Design</span>
            <span className="cores-prev-tag" style={{ background: scaleVar('secondary', 100), color: scaleVar('secondary', 700) }}>System</span>
            <span className="cores-prev-tag" style={{ background: scaleVar('tertiary', 100), color: scaleVar('tertiary', 700) }}>Accent</span>
          </div>
        </div>

        <button className="cores-prev-btn" style={{ background: scaleVar('primary', 500), color: primaryText }}>
          Ação primária
        </button>
        <button className="cores-prev-btn cores-prev-btn--outline" style={{ color: scaleVar('primary', 500), borderColor: scaleVar('primary', 500), background: 'transparent' }}>
          Ação secundária
        </button>
        <button className="cores-prev-btn cores-prev-btn--outline" style={{ color: scaleVar('tertiary', 600), borderColor: scaleVar('tertiary', 400), background: scaleVar('tertiary', 50) }}>
          Ação terciária
        </button>

        <div className="cores-prev-user" style={{ background: scaleVar('primary', 50) }}>
          <div className="cores-prev-avatar" style={{ background: scaleVar('primary', 500), color: primaryText }}>AB</div>
          <div>
            <div className="cores-prev-user__name">Ana Beatriz</div>
            <div className="cores-prev-user__role">Product Designer</div>
          </div>
          <span className="cores-prev-badge" style={{ background: scaleVar('tertiary', 100), color: scaleVar('tertiary', 700) }}>Ativo</span>
        </div>
      </div>

      {/* Dark */}
      <div className="cores-preview cores-preview--dark">
        <div className="cores-preview__label">
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>dark_mode</span>
          DARK MODE
        </div>

        <div className="cores-prev-card" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <div className="cores-prev-card__title" style={{ color: '#fff' }}>Card de exemplo</div>
          <div className="cores-prev-card__sub" style={{ color: 'rgba(255,255,255,0.65)' }}>Texto de suporte com a paleta gerada.</div>
          <div className="cores-prev-card__tags">
            <span className="cores-prev-tag" style={{ background: `${scaleVar('primary', 800)}`, color: scaleVar('primary', 200) }}>Design</span>
            <span className="cores-prev-tag" style={{ background: scaleVar('secondary', 800), color: scaleVar('secondary', 200) }}>System</span>
            <span className="cores-prev-tag" style={{ background: scaleVar('tertiary', 800), color: scaleVar('tertiary', 200) }}>Accent</span>
          </div>
        </div>

        <button className="cores-prev-btn" style={{ background: scaleVar('primary', 400), color: primaryText }}>
          Ação primária
        </button>
        <button className="cores-prev-btn cores-prev-btn--outline" style={{ color: scaleVar('primary', 300), borderColor: scaleVar('primary', 400), background: 'transparent' }}>
          Ação secundária
        </button>
        <button className="cores-prev-btn cores-prev-btn--outline" style={{ color: scaleVar('tertiary', 300), borderColor: scaleVar('tertiary', 500), background: 'rgba(255,255,255,0.05)' }}>
          Ação terciária
        </button>

        <div className="cores-prev-user" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div className="cores-prev-avatar" style={{ background: scaleVar('primary', 400), color: primaryText }}>AB</div>
          <div>
            <div className="cores-prev-user__name" style={{ color: '#fff' }}>Ana Beatriz</div>
            <div className="cores-prev-user__role" style={{ color: 'rgba(255,255,255,0.5)' }}>Product Designer</div>
          </div>
          <span className="cores-prev-badge" style={{ background: scaleVar('tertiary', 700), color: scaleVar('tertiary', 100) }}>Ativo</span>
        </div>
      </div>
    </div>
  );
}

function ScaleStrip({ hex, name }: { hex: string; name: string }) {
  const scale = generateColorScale(hex);
  const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
  return (
    <div className="cores-scale">
      {steps.map(s => (
        <div key={s} className="cores-scale__step" title={`${name}-${s}`}>
          <div className="cores-scale__swatch" style={{ background: scale[s] as string }} />
          <span className="cores-scale__label">{s}</span>
        </div>
      ))}
    </div>
  );
}

const COLOR_DEFS = [
  { key: 'primary' as const,   label: 'Cor primária',    desc: 'Botões, links e elementos de ação' },
  { key: 'secondary' as const, label: 'Cor secundária',  desc: 'Destaques, badges e acentos' },
  { key: 'tertiary' as const,  label: 'Cor terciária',   desc: 'Elementos de apoio e variações' },
];

export default function CoresPage() {
  const [draft, setDraft] = useState<Palette>(DEFAULT);
  const [preview, setPreview] = useState<Palette>(DEFAULT);
  const [saved, setSaved] = useState(false);

  const isDirty = !saved && (
    draft.primary !== DEFAULT.primary ||
    draft.secondary !== DEFAULT.secondary ||
    draft.tertiary !== DEFAULT.tertiary
  );
  const blocker = useUnsavedChanges(isDirty);

  function handleSave() {
    setPreview(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function setColor(key: keyof Palette, val: string) {
    setDraft(prev => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  return (
    <div className="page">
      <StickyPageHeader
        title="Cores"
        description={<>Paleta de cores do portal <strong>{PORTAL_CONFIG.name}</strong>.</>}
        action={
          <button className="btn-primary" type="button" onClick={handleSave}>
            {saved ? 'Salvo!' : 'Salvar e aplicar'}
          </button>
        }
      />

      {/* Color pickers */}
      <div className="cores-inputs">
        {COLOR_DEFS.map(def => (
          <div key={def.key} className="cores-input-card">
            <div className="cores-input-card__top">
              <label className="cores-color-picker-label">
                <input
                  type="color"
                  value={draft[def.key]}
                  onChange={e => setColor(def.key, e.target.value)}
                />
                <span className="cores-color-picker-swatch" style={{ background: draft[def.key] }} />
              </label>
              <div>
                <div className="cores-input-card__label">{def.label}</div>
                <div className="cores-input-card__desc">{def.desc}</div>
              </div>
            </div>
            <input
              className="cores-input-card__hex"
              type="text"
              value={draft[def.key]}
              maxLength={7}
              onChange={e => {
                const v = e.target.value;
                if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setColor(def.key, v);
              }}
            />
            <ScaleStrip hex={draft[def.key]} name={def.label} />
          </div>
        ))}
      </div>

      {/* Preview */}
      <div className="cores-preview-section">
        <div className="cores-preview-section__head">
          <h2 className="pers-section__title" style={{ margin: 0 }}>Preview da aplicação</h2>
          <span className="cores-preview-section__hint">Atualiza ao salvar</span>
        </div>
        <ColorPreview palette={preview} />
      </div>

      <UnsavedModal
        open={blocker.state === 'blocked'}
        onStay={() => blocker.reset?.()}
        onLeave={() => blocker.proceed?.()}
      />
    </div>
  );
}
