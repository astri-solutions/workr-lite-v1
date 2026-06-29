import { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import UnsavedModal from '../../components/UnsavedModal';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import '../admin/AdminPages.css';
import './PersonalizarPages.css';

const FONTS = [
  { id: 'inter', label: 'Inter', family: "'Inter', sans-serif", category: 'Sans-serif' },
  { id: 'plus-jakarta', label: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans', sans-serif", category: 'Sans-serif' },
  { id: 'montserrat', label: 'Montserrat', family: "'Montserrat', sans-serif", category: 'Sans-serif' },
  { id: 'poppins', label: 'Poppins', family: "'Poppins', sans-serif", category: 'Sans-serif' },
  { id: 'raleway', label: 'Raleway', family: "'Raleway', sans-serif", category: 'Sans-serif' },
  { id: 'lato', label: 'Lato', family: "'Lato', sans-serif", category: 'Sans-serif' },
  { id: 'source-sans', label: 'Source Sans 3', family: "'Source Sans 3', sans-serif", category: 'Sans-serif' },
  { id: 'nunito', label: 'Nunito', family: "'Nunito', sans-serif", category: 'Sans-serif' },
  { id: 'playfair', label: 'Playfair Display', family: "'Playfair Display', serif", category: 'Serif' },
  { id: 'merriweather', label: 'Merriweather', family: "'Merriweather', serif", category: 'Serif' },
  { id: 'lora', label: 'Lora', family: "'Lora', serif", category: 'Serif' },
];

const INITIAL_HEADING = 'plus-jakarta';
const INITIAL_BODY = 'inter';

export default function FontesPage() {
  const [headingFont, setHeadingFont] = useState(INITIAL_HEADING);
  const [bodyFont, setBodyFont] = useState(INITIAL_BODY);
  const [saved, setSaved] = useState(false);
  const isDirty = !saved && (headingFont !== INITIAL_HEADING || bodyFont !== INITIAL_BODY);
  const blocker = useUnsavedChanges(isDirty);

  const heading = FONTS.find(f => f.id === headingFont);
  const body = FONTS.find(f => f.id === bodyFont);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="page">
      <PageHeader
        title="Fontes"
        description="Defina as famílias tipográficas do portal."
        action={
          <button className="btn-primary" type="button" onClick={handleSave}>
            {saved ? 'Salvo!' : 'Salvar alterações'}
          </button>
        }
      />

      {/* Preview */}
      <div className="pers-section">
        <h2 className="pers-section__title">Pré-visualização</h2>
        <div className="fontes-preview">
          <p className="fontes-preview__heading" style={{ fontFamily: heading?.family }}>
            Relações com Investidores
          </p>
          <p className="fontes-preview__body" style={{ fontFamily: body?.family }}>
            Apresentamos os resultados do segundo trimestre de 2025, demonstrando crescimento sustentável e geração de valor para nossos acionistas e stakeholders.
          </p>
        </div>
      </div>

      <div className="fontes-grid">
        <div className="pers-section">
          <h2 className="pers-section__title">Fonte de títulos</h2>
          <p className="pers-section__desc">Usada em headings, destaques e navegação.</p>
          <div className="fontes-list">
            {FONTS.map(f => (
              <button
                key={f.id}
                type="button"
                className={`fontes-option${headingFont === f.id ? ' fontes-option--active' : ''}`}
                onClick={() => { setHeadingFont(f.id); setSaved(false); }}
              >
                <span className="fontes-option__sample" style={{ fontFamily: f.family }}>Aa</span>
                <span className="fontes-option__label">{f.label}</span>
                <span className="fontes-option__cat">{f.category}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pers-section">
          <h2 className="pers-section__title">Fonte de corpo</h2>
          <p className="pers-section__desc">Usada em textos, parágrafos e tabelas.</p>
          <div className="fontes-list">
            {FONTS.map(f => (
              <button
                key={f.id}
                type="button"
                className={`fontes-option${bodyFont === f.id ? ' fontes-option--active' : ''}`}
                onClick={() => { setBodyFont(f.id); setSaved(false); }}
              >
                <span className="fontes-option__sample" style={{ fontFamily: f.family }}>Aa</span>
                <span className="fontes-option__label">{f.label}</span>
                <span className="fontes-option__cat">{f.category}</span>
              </button>
            ))}
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
