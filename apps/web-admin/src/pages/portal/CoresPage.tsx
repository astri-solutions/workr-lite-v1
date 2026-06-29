import { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import '../admin/AdminPages.css';
import './PersonalizarPages.css';

interface ColorToken {
  key: string;
  label: string;
  desc: string;
  value: string;
}

const DEFAULT_COLORS: ColorToken[] = [
  { key: 'primary', label: 'Cor primária', desc: 'Botões, links e elementos de destaque', value: '#0B5B68' },
  { key: 'accent', label: 'Cor de destaque', desc: 'Highlights e elementos secundários', value: '#00D865' },
  { key: 'text', label: 'Texto', desc: 'Cor principal do texto do portal', value: '#141414' },
  { key: 'bg', label: 'Fundo', desc: 'Cor de fundo das páginas', value: '#F4F4F4' },
  { key: 'header', label: 'Header / Navbar', desc: 'Fundo do cabeçalho do portal', value: '#0B5B68' },
];

const PRESETS = [
  { name: 'Astri', colors: { primary: '#0B5B68', accent: '#00D865', text: '#141414', bg: '#F4F4F4', header: '#0B5B68' } },
  { name: 'Oceano', colors: { primary: '#1a56db', accent: '#3ABFF8', text: '#1e293b', bg: '#F8FAFC', header: '#1a56db' } },
  { name: 'Floresta', colors: { primary: '#166534', accent: '#4ade80', text: '#14532d', bg: '#F0FDF4', header: '#166534' } },
  { name: 'Slate', colors: { primary: '#334155', accent: '#64748b', text: '#0f172a', bg: '#F8FAFC', header: '#1e293b' } },
];

export default function CoresPage() {
  const [colors, setColors] = useState<Record<string, string>>(
    Object.fromEntries(DEFAULT_COLORS.map(c => [c.key, c.value]))
  );
  const [saved, setSaved] = useState(false);

  function applyPreset(preset: typeof PRESETS[0]) {
    setColors(preset.colors);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="page">
      <PageHeader
        title="Cores"
        description="Personalize a paleta de cores do seu portal de RI."
        action={
          <button className="btn-primary" type="button" onClick={handleSave}>
            {saved ? 'Salvo!' : 'Salvar alterações'}
          </button>
        }
      />

      <div className="pers-section">
        <h2 className="pers-section__title">Temas prontos</h2>
        <div className="cores-presets">
          {PRESETS.map(p => (
            <button key={p.name} type="button" className="cores-preset" onClick={() => applyPreset(p)}>
              <div className="cores-preset__swatches">
                {Object.values(p.colors).slice(0, 3).map((c, i) => (
                  <span key={i} className="cores-preset__swatch" style={{ background: c }} />
                ))}
              </div>
              <span className="cores-preset__name">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="pers-section">
        <h2 className="pers-section__title">Tokens de cor</h2>
        <div className="cores-tokens">
          {DEFAULT_COLORS.map(token => (
            <div key={token.key} className="cores-token-row">
              <div className="cores-token-row__info">
                <span className="cores-token-row__label">{token.label}</span>
                <span className="cores-token-row__desc">{token.desc}</span>
              </div>
              <div className="cores-token-row__picker">
                <label className="cores-color-picker">
                  <input
                    type="color"
                    value={colors[token.key]}
                    onChange={e => setColors(prev => ({ ...prev, [token.key]: e.target.value }))}
                  />
                  <span className="cores-color-picker__swatch" style={{ background: colors[token.key] }} />
                </label>
                <input
                  className="cores-token-row__hex"
                  type="text"
                  value={colors[token.key]}
                  onChange={e => {
                    const v = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setColors(prev => ({ ...prev, [token.key]: v }));
                  }}
                  maxLength={7}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
