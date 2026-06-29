import { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import UnsavedModal from '../../components/UnsavedModal';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import '../admin/AdminPages.css';
import './PersonalizarPages.css';

const INITIAL = 'banner';

const TIPOS = [
  {
    id: 'sidebar',
    label: 'Menu lateral',
    desc: 'Navegação na barra lateral com conteúdo central. Ideal para portais com muito conteúdo.',
    thumb: (
      <svg width="100%" height="90" viewBox="0 0 200 90" fill="none">
        <rect width="200" height="14" rx="2" fill="#e8edf2" />
        <rect x="6" y="4" width="32" height="6" rx="1" fill="#c8d2db" />
        <rect y="16" width="46" height="74" rx="2" fill="#f0f4f8" />
        <rect x="6" y="22" width="32" height="5" rx="1" fill="#c8d2db" />
        <rect x="6" y="31" width="28" height="5" rx="1" fill="#dde3ea" />
        <rect x="6" y="40" width="30" height="5" rx="1" fill="#dde3ea" />
        <rect x="6" y="49" width="24" height="5" rx="1" fill="#dde3ea" />
        <rect x="6" y="58" width="28" height="5" rx="1" fill="#dde3ea" />
        <rect x="50" y="16" width="150" height="12" rx="2" fill="#e8edf2" />
        <rect x="50" y="32" width="150" height="5" rx="1" fill="#eef1f5" />
        <rect x="50" y="41" width="120" height="5" rx="1" fill="#eef1f5" />
        <rect x="50" y="54" width="68" height="18" rx="2" fill="#eef1f5" />
        <rect x="124" y="54" width="76" height="18" rx="2" fill="#eef1f5" />
      </svg>
    ),
  },
  {
    id: 'tabmenu',
    label: 'Tabs de conteúdo',
    desc: 'Navegação por abas horizontais com conteúdo organizado por seção.',
    thumb: (
      <svg width="100%" height="90" viewBox="0 0 200 90" fill="none">
        <rect width="200" height="14" rx="2" fill="#e8edf2" />
        <rect x="6" y="4" width="32" height="6" rx="1" fill="#c8d2db" />
        <rect x="130" y="4" width="22" height="6" rx="1" fill="#dde3ea" />
        <rect x="156" y="4" width="22" height="6" rx="1" fill="#dde3ea" />
        <rect width="200" height="18" y="16" rx="0" fill="#f5f7fa" />
        <rect x="6" y="19" width="34" height="12" rx="2" fill="#0B5B68" />
        <rect x="44" y="21" width="28" height="8" rx="1" fill="#dde3ea" />
        <rect x="76" y="21" width="34" height="8" rx="1" fill="#dde3ea" />
        <rect x="114" y="21" width="26" height="8" rx="1" fill="#dde3ea" />
        <rect x="6" y="40" width="188" height="12" rx="2" fill="#e8edf2" />
        <rect x="6" y="56" width="188" height="6" rx="1" fill="#eef1f5" />
        <rect x="6" y="66" width="150" height="6" rx="1" fill="#eef1f5" />
      </svg>
    ),
  },
  {
    id: 'banner',
    label: 'Banner com menu',
    desc: 'Banner de destaque no topo com navegação no header. Impactante e moderno.',
    thumb: (
      <svg width="100%" height="90" viewBox="0 0 200 90" fill="none">
        <rect width="200" height="16" rx="2" fill="#0B5B68" />
        <rect x="6" y="5" width="32" height="6" rx="1" fill="rgba(255,255,255,0.4)" />
        <rect x="128" y="5" width="18" height="6" rx="1" fill="rgba(255,255,255,0.25)" />
        <rect x="150" y="5" width="18" height="6" rx="1" fill="rgba(255,255,255,0.25)" />
        <rect x="172" y="5" width="14" height="6" rx="1" fill="rgba(255,255,255,0.25)" />
        <rect y="18" width="200" height="32" rx="0" fill="#e4eef0" />
        <rect x="10" y="26" width="70" height="9" rx="2" fill="#c8d2db" />
        <rect x="10" y="38" width="48" height="6" rx="1" fill="#dde3ea" />
        <rect x="6" y="56" width="58" height="26" rx="2" fill="#eef1f5" />
        <rect x="72" y="56" width="58" height="26" rx="2" fill="#eef1f5" />
        <rect x="138" y="56" width="56" height="26" rx="2" fill="#eef1f5" />
      </svg>
    ),
  },
];

export default function LayoutPage() {
  const [selected, setSelected] = useState(INITIAL);
  const [saved, setSaved] = useState(false);
  const isDirty = selected !== INITIAL && !saved;
  const blocker = useUnsavedChanges(isDirty);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="page">
      <PageHeader
        title="Layout"
        description="Escolha o modelo de navegação do seu portal de Relações com Investidores."
        action={
          <button className="btn-primary" type="button" onClick={handleSave}>
            {saved ? 'Salvo!' : 'Salvar alterações'}
          </button>
        }
      />

      <div className="pers-section">
        <h2 className="pers-section__title">Modelo de navegação</h2>
        <p className="pers-section__desc">O modelo define como os visitantes navegam pelo seu site de RI. Esta alteração afeta a estrutura visual do portal publicado.</p>
        <div className="pers-tipos">
          {TIPOS.map(t => (
            <button
              key={t.id}
              type="button"
              className={`pers-tipo-card${selected === t.id ? ' pers-tipo-card--active' : ''}`}
              onClick={() => setSelected(t.id)}
            >
              <div className="pers-tipo-card__thumb">{t.thumb}</div>
              <div className="pers-tipo-card__info">
                <span className="pers-tipo-card__label">{t.label}</span>
                <span className="pers-tipo-card__desc">{t.desc}</span>
              </div>
              {selected === t.id && (
                <span className="pers-tipo-card__check">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              )}
            </button>
          ))}
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
