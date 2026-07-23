import { useState, useEffect } from 'react';
import StickyPageHeader from '../../components/StickyPageHeader';
import UnsavedModal from '../../components/UnsavedModal';
import ColorPickerPopover from '../../components/ColorPickerPopover';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { generateColorScale, contrastRatio, wcagLevel, bestTextColor, type WcagLevel } from '../../utils/colorUtils';
import { usePortalName } from '../../hooks/usePortalName';
import { useActivePortalId } from '../../hooks/useActivePortalId';
import { pKey } from '../../utils/portalStorage';
import { savePortalConfig, fetchPortalConfig } from '../../lib/portalConfigApi';
import { usePublish } from '../../contexts/PublishContext';
import PublishButton from '../../components/PublishButton';
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

export const CORES_KEY = 'portal_cores';

function loadCores(key: string): Palette {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch { return DEFAULT; }
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

  const primaryText = bestTextColor(palette.primary);

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
  { key: 'primary' as const,   label: 'Cor primária',   desc: 'Botões, links principais e destaques — 10%' },
  { key: 'secondary' as const, label: 'Cor secundária', desc: 'Subtítulos, botões secundários e fundo de seções — 30%' },
  { key: 'tertiary' as const,  label: 'Cor terciária',  desc: 'Badges e textos pequenos — 10%' },
];

// ── Contrast checker ──────────────────────────────────────────────────────────

const LEVEL_META: Record<WcagLevel, { cls: string; tip: string }> = {
  'AAA':      { cls: 'ca-badge ca-badge--aaa',   tip: 'Excelente — texto normal e pequeno' },
  'AA':       { cls: 'ca-badge ca-badge--aa',    tip: 'Bom — texto normal (≥ 4,5:1)' },
  'AA large': { cls: 'ca-badge ca-badge--aal',   tip: 'Apenas texto grande / ícones (≥ 3:1)' },
  'Fail':     { cls: 'ca-badge ca-badge--fail',  tip: 'Contraste insuficiente' },
};

interface ContrastRowProps { bg: string; fg: string; label: string }

function ContrastRow({ bg, fg, label }: ContrastRowProps) {
  const ratio = contrastRatio(bg, fg);
  const level = wcagLevel(ratio);
  const meta  = LEVEL_META[level];
  return (
    <div className="ca-row">
      <div className="ca-swatch" style={{ background: bg }}>
        <span style={{ color: fg, fontWeight: 600, fontSize: '13px' }}>Aa</span>
      </div>
      <div className="ca-row__info">
        <span className="ca-row__label">{label}</span>
        <span className="ca-row__ratio">{ratio}:1</span>
      </div>
      <span className={meta.cls} title={meta.tip}>{level}</span>
    </div>
  );
}

interface ContrastCardProps { hex: string; name: string }

function ContrastCard({ hex, name }: ContrastCardProps) {
  const best = bestTextColor(hex);
  const worst = best === '#ffffff' ? '#000000' : '#ffffff';
  const bestLabel  = best  === '#ffffff' ? 'Texto branco' : 'Texto preto';
  const worstLabel = worst === '#ffffff' ? 'Texto branco' : 'Texto preto';
  const bestRatio  = contrastRatio(hex, best);
  const bestLevel  = wcagLevel(bestRatio);
  const worstLevel = wcagLevel(contrastRatio(hex, worst));

  return (
    <div className="ca-card">
      <div className="ca-card__header">
        <div className="ca-card__swatch" style={{ background: hex }} />
        <div>
          <div className="ca-card__name">{name}</div>
          <div className="ca-card__hex">{hex.toUpperCase()}</div>
        </div>
        <div className={`ca-card__badge ${LEVEL_META[bestLevel].cls}`}>
          Melhor texto: {bestLabel.replace('Texto ', '')}
        </div>
      </div>

      {worstLevel === 'Fail' && (
        <div className="ca-warning">
          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {worstLabel} nesta cor <strong>não atende WCAG</strong> — evite essa combinação.
        </div>
      )}

      <div className="ca-rows">
        <ContrastRow bg={hex}       fg={best}      label={bestLabel} />
        <ContrastRow bg={hex}       fg={worst}     label={worstLabel} />
        <ContrastRow bg="#ffffff"   fg={hex}       label="Cor sobre fundo branco" />
        <ContrastRow bg="#141414"   fg={hex}       label="Cor sobre fundo escuro" />
      </div>
    </div>
  );
}

function ContrastPanel({ palette }: { palette: Palette }) {
  return (
    <div className="ca-panel">
      <div className="ca-panel__head">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4m0 4h.01"/>
        </svg>
        <h2 className="ca-panel__title">Verificação de Acessibilidade WCAG 2.1</h2>
      </div>
      <p className="ca-panel__desc">
        Contraste mínimo recomendado: <strong>4,5:1</strong> para texto normal (AA) e <strong>3:1</strong> para texto grande e ícones.
        Cores vibrantes com contraste baixo causam fadiga visual mesmo quando tecnicamente aprovadas.
      </p>
      <div className="ca-grid">
        <ContrastCard hex={palette.primary}   name="Cor Primária" />
        <ContrastCard hex={palette.secondary} name="Cor Secundária" />
        <ContrastCard hex={palette.tertiary}  name="Cor Terciária" />
      </div>
    </div>
  );
}

export default function CoresPage() {
  const portalName = usePortalName();
  const portalId = useActivePortalId();
  const coresKey = pKey(CORES_KEY, portalId);
  const { publish, hasPendingDraft, notifyDraft } = usePublish();
  const [base, setBase] = useState<Palette>(() => loadCores(coresKey));
  const [draft, setDraft] = useState<Palette>(base);
  const [preview, setPreview] = useState<Palette>(base);
  const [isDraft, setIsDraft] = useState(false);

  const isDirty = (
    draft.primary !== base.primary ||
    draft.secondary !== base.secondary ||
    draft.tertiary !== base.tertiary
  );
  const blocker = useUnsavedChanges(isDirty);

  // Hydrate from Supabase on mount so all users see the same portal config
  useEffect(() => {
    if (!portalId) return;
    fetchPortalConfig(portalId).then(data => {
      if (data?.cores) {
        const cores: Palette = { ...DEFAULT, ...(data.cores as Partial<Palette>) };
        localStorage.setItem(coresKey, JSON.stringify(cores));
        setBase(cores);
        setDraft(cores);
        setPreview(cores);
      }
    }).catch(console.error);
  }, [portalId, coresKey]);

  async function saveDraft() {
    setPreview(draft);
    localStorage.setItem(coresKey, JSON.stringify(draft));
    setBase(draft);
    setIsDraft(true);
    notifyDraft();
    // Await the Supabase write — publish() reads from Supabase, so the save
    // must land before publishing or the site gets stale colors.
    if (portalId) {
      try { await savePortalConfig(portalId, { cores: draft }); } catch (e) { console.error(e); }
    }
  }

  async function handlePublish() {
    if (isDirty) await saveDraft();
    const ok = await publish();
    if (ok) setIsDraft(false);
  }

  function setColor(key: keyof Palette, val: string) {
    setDraft(prev => ({ ...prev, [key]: val }));
  }

  return (
    <div className="page">
      <StickyPageHeader
        title="Cores"
        description={<>Paleta de cores do portal <strong>{portalName}</strong>.</>}
        action={
          <div className="publish-actions">
            <button className="btn-outline" type="button" onClick={saveDraft} disabled={!isDirty}>
              Salvar rascunho
            </button>
            <PublishButton onClick={handlePublish} disabled={!isDirty && !isDraft && !hasPendingDraft} />
          </div>
        }
      />

      {/* Color pickers */}
      <div className="cores-inputs">
        {COLOR_DEFS.map(def => (
          <div key={def.key} className="cores-input-card">
            <div className="cores-input-card__top">
              <ColorPickerPopover
                value={draft[def.key]}
                onChange={v => setColor(def.key, v)}
              />
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
          <span className="cores-preview-section__hint">Atualiza ao salvar rascunho</span>
        </div>
        <ColorPreview palette={preview} />
      </div>

      {/* Accessibility checker — updates live as user picks colors */}
      <ContrastPanel palette={draft} />

      <UnsavedModal
        open={blocker.state === 'blocked'}
        onStay={() => blocker.reset?.()}
        onLeave={() => blocker.proceed?.()}
      />
    </div>
  );
}
