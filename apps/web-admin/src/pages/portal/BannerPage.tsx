import { useState, useRef } from 'react';
import PageHeader from '../../components/PageHeader';
import '../admin/AdminPages.css';
import './PersonalizarPages.css';

interface BannerSlide {
  id: string;
  titulo: string;
  subtitulo: string;
  cta: string;
  imagem: string | null;
}

const INITIAL_SLIDES: BannerSlide[] = [
  { id: 'b1', titulo: 'Relações com Investidores', subtitulo: 'Transparência e geração de valor para nossos acionistas.', cta: 'Saiba mais', imagem: null },
];

export default function BannerPage() {
  const [slides, setSlides] = useState<BannerSlide[]>(INITIAL_SLIDES);
  const [activeId, setActiveId] = useState('b1');
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const active = slides.find(s => s.id === activeId) ?? slides[0];

  function update(field: keyof BannerSlide, value: string | null) {
    setSlides(prev => prev.map(s => s.id === activeId ? { ...s, [field]: value } : s));
  }

  function addSlide() {
    const id = 'b' + Date.now();
    const novo: BannerSlide = { id, titulo: 'Novo banner', subtitulo: '', cta: 'Saiba mais', imagem: null };
    setSlides(prev => [...prev, novo]);
    setActiveId(id);
  }

  function removeSlide(id: string) {
    if (slides.length === 1) return;
    setSlides(prev => prev.filter(s => s.id !== id));
    if (activeId === id) setActiveId(slides.find(s => s.id !== id)?.id ?? '');
  }

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => update('imagem', ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="page">
      <PageHeader
        title="Banner"
        description="Configure os slides do banner hero exibido no topo do portal."
        action={
          <button className="btn-primary" type="button" onClick={handleSave}>
            {saved ? 'Salvo!' : 'Salvar alterações'}
          </button>
        }
      />

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
                <span className="banner-slide-item__title">{s.titulo || 'Sem título'}</span>
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
          <h2 className="pers-section__title">Editar slide</h2>

          {/* Image */}
          <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" style={{ display: 'none' }} onChange={handleImage} />
          {active.imagem ? (
            <div className="banner-img-preview">
              <img src={active.imagem} alt="Banner" className="banner-img-preview__img" />
              <button type="button" className="banner-img-preview__remove" onClick={() => update('imagem', null)}>Remover imagem</button>
            </div>
          ) : (
            <button type="button" className="logo-dropzone" onClick={() => fileRef.current?.click()}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="logo-dropzone__text">Enviar imagem do banner</span>
              <span className="logo-dropzone__hint">JPG, PNG ou WebP — 1920×600px recomendado</span>
            </button>
          )}

          <div className="banner-fields">
            <label className="banner-field">
              <span>Título</span>
              <input className="banner-input" type="text" value={active.titulo}
                onChange={e => update('titulo', e.target.value)} placeholder="Ex: Relações com Investidores" />
            </label>
            <label className="banner-field">
              <span>Subtítulo</span>
              <textarea className="banner-input banner-textarea" value={active.subtitulo}
                onChange={e => update('subtitulo', e.target.value)}
                placeholder="Texto descritivo exibido abaixo do título..." rows={3} />
            </label>
            <label className="banner-field">
              <span>Texto do botão (CTA)</span>
              <input className="banner-input" type="text" value={active.cta}
                onChange={e => update('cta', e.target.value)} placeholder="Ex: Saiba mais" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
