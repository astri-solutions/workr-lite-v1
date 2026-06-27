import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminPages.css';
import './NovoPortalPage.css';

/* ─── Steps ─────────────────────────────────────────────── */
const STEPS = [
  { id: 1, label: 'Nome' },
  { id: 2, label: 'URL' },
  { id: 3, label: 'Tipo' },
  { id: 4, label: 'Fonte' },
  { id: 5, label: 'Cores' },
  { id: 6, label: 'Logotipo' },
];

/* ─── Tipos ──────────────────────────────────────────────── */
const TIPOS = [
  {
    id: 'ri',
    label: 'RI',
    title: 'Relações com Investidores',
    desc: 'Resultados, fatos relevantes, governança e divulgações obrigatórias.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
        <line x1="2" y1="20" x2="22" y2="20" />
      </svg>
    ),
  },
  {
    id: 'institucional',
    label: 'Institucional',
    title: 'Site Institucional',
    desc: 'Presença institucional com sobre, produtos, equipe e contato.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: 'landing',
    label: 'Landing Page',
    title: 'Landing Page',
    desc: 'Página de conversão focada em um produto, campanha ou evento.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M5 3l14 9-14 9V3z" />
      </svg>
    ),
  },
  {
    id: 'simples',
    label: 'Simples',
    title: 'Site Simples',
    desc: 'Estrutura mínima, ideal para microsites e páginas informativas.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    ),
  },
];

/* ─── Fonts ──────────────────────────────────────────────── */
const FONTS = [
  { id: 'inter', label: 'Inter', family: "'Inter', sans-serif", category: 'Sans-serif' },
  { id: 'plus-jakarta', label: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans', sans-serif", category: 'Sans-serif' },
  { id: 'montserrat', label: 'Montserrat', family: "'Montserrat', sans-serif", category: 'Sans-serif' },
  { id: 'poppins', label: 'Poppins', family: "'Poppins', sans-serif", category: 'Sans-serif' },
  { id: 'raleway', label: 'Raleway', family: "'Raleway', sans-serif", category: 'Sans-serif' },
  { id: 'lato', label: 'Lato', family: "'Lato', sans-serif", category: 'Sans-serif' },
  { id: 'playfair', label: 'Playfair Display', family: "'Playfair Display', serif", category: 'Serif' },
  { id: 'merriweather', label: 'Merriweather', family: "'Merriweather', serif", category: 'Serif' },
];

/* ─── Form state ─────────────────────────────────────────── */
interface FormData {
  nome: string;
  url: string;
  tipo: string;
  fonte: string;
  corPrimaria: string;
  corSecundaria: string;
  corTerciaria: string;
  logoFile: File | null;
  logoPreview: string | null;
}

/* ─── Stepper ────────────────────────────────────────────── */
function Stepper({ current }: { current: number }) {
  return (
    <div className="np-stepper">
      {STEPS.map((s, i) => {
        const done = s.id < current;
        const active = s.id === current;
        return (
          <div key={s.id} className="np-stepper__item">
            <div className={`np-stepper__circle${done ? ' np-stepper__circle--done' : active ? ' np-stepper__circle--active' : ''}`}>
              {done ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : s.id}
            </div>
            <span className={`np-stepper__label${active ? ' np-stepper__label--active' : done ? ' np-stepper__label--done' : ''}`}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`np-stepper__line${done ? ' np-stepper__line--done' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Step 1: Nome ───────────────────────────────────────── */
function StepNome({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="np-step">
      <div className="np-step__head">
        <h2 className="np-step__title">Como se chama o site?</h2>
        <p className="np-step__desc">Esse nome é exibido no painel e identifica o portal internamente.</p>
      </div>
      <div className="np-step__body">
        <label className="np-label">Nome do site</label>
        <input
          className="np-input np-input--lg"
          type="text"
          placeholder="Ex: Aurora RI"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
          maxLength={80}
        />
        {value && <span className="np-input__hint">{value.length}/80 caracteres</span>}
      </div>
    </div>
  );
}

/* ─── Step 2: URL ────────────────────────────────────────── */
function StepUrl({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const slug = value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-');

  function handleChange(raw: string) {
    onChange(raw.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-'));
  }

  return (
    <div className="np-step">
      <div className="np-step__head">
        <h2 className="np-step__title">Qual será o endereço?</h2>
        <p className="np-step__desc">Escolha o subdomínio do portal. Pode ser alterado depois.</p>
      </div>
      <div className="np-step__body">
        <label className="np-label">Subdomínio</label>
        <div className="np-url-wrap">
          <span className="np-url-prefix">workr.com.br /</span>
          <input
            className="np-input np-input--url"
            type="text"
            placeholder="aurora"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            autoFocus
            maxLength={40}
          />
        </div>
        {slug && (
          <div className="np-url-preview">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span>https://<strong>{slug}</strong>.workr.com.br</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Step 3: Tipo ───────────────────────────────────────── */
function StepTipo({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="np-step">
      <div className="np-step__head">
        <h2 className="np-step__title">Qual é o tipo do site?</h2>
        <p className="np-step__desc">O tipo define a estrutura e os módulos disponíveis no portal.</p>
      </div>
      <div className="np-step__body">
        <div className="np-tipo-grid">
          {TIPOS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`np-tipo-card${value === t.id ? ' np-tipo-card--selected' : ''}`}
              onClick={() => onChange(t.id)}
            >
              <div className="np-tipo-card__icon">{t.icon}</div>
              <div className="np-tipo-card__label">{t.label}</div>
              <div className="np-tipo-card__title">{t.title}</div>
              <div className="np-tipo-card__desc">{t.desc}</div>
              {value === t.id && (
                <div className="np-tipo-card__check">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Step 4: Fonte ──────────────────────────────────────── */
function StepFonte({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const sansSerif = FONTS.filter((f) => f.category === 'Sans-serif');
  const serif = FONTS.filter((f) => f.category === 'Serif');

  function FontGroup({ fonts, title }: { fonts: typeof FONTS; title: string }) {
    return (
      <div className="np-font-group">
        <div className="np-font-group__title">{title}</div>
        <div className="np-font-list">
          {fonts.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`np-font-item${value === f.id ? ' np-font-item--selected' : ''}`}
              onClick={() => onChange(f.id)}
            >
              <span className="np-font-item__preview" style={{ fontFamily: f.family }}>Aa</span>
              <span className="np-font-item__name">{f.label}</span>
              {value === f.id && (
                <svg className="np-font-item__check" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const selected = FONTS.find((f) => f.id === value);

  return (
    <div className="np-step">
      <div className="np-step__head">
        <h2 className="np-step__title">Escolha a tipografia</h2>
        <p className="np-step__desc">Fonte principal usada em títulos e textos do portal.</p>
      </div>
      <div className="np-step__body">
        {selected && (
          <div className="np-font-preview-bar">
            <span className="np-font-preview-bar__sample" style={{ fontFamily: selected.family }}>
              O futuro dos investimentos começa aqui.
            </span>
            <span className="np-font-preview-bar__name">{selected.label}</span>
          </div>
        )}
        <FontGroup fonts={sansSerif} title="Sans-serif" />
        <FontGroup fonts={serif} title="Serif" />
      </div>
    </div>
  );
}

/* ─── Step 5: Cores ──────────────────────────────────────── */
function StepCores({
  primaria, secundaria, terciaria,
  onPrimaria, onSecundaria, onTerciaria,
}: {
  primaria: string; secundaria: string; terciaria: string;
  onPrimaria: (v: string) => void; onSecundaria: (v: string) => void; onTerciaria: (v: string) => void;
}) {
  function ColorPicker({ label, value, onChange, hint }: {
    label: string; value: string; onChange: (v: string) => void; hint: string;
  }) {
    const [hex, setHex] = useState(value);

    function handleHex(raw: string) {
      setHex(raw);
      if (/^#[0-9a-fA-F]{6}$/.test(raw)) onChange(raw);
    }

    useEffect(() => { setHex(value); }, [value]);

    return (
      <div className="np-color-item">
        <label className="np-color-item__label">{label}</label>
        <p className="np-color-item__hint">{hint}</p>
        <div className="np-color-item__row">
          <div className="np-color-swatch-wrap">
            <div className="np-color-swatch" style={{ background: value }} />
            <input
              type="color"
              className="np-color-native"
              value={value}
              onChange={(e) => { onChange(e.target.value); setHex(e.target.value); }}
            />
          </div>
          <input
            className="np-input np-input--hex"
            type="text"
            value={hex}
            onChange={(e) => handleHex(e.target.value)}
            maxLength={7}
            spellCheck={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="np-step">
      <div className="np-step__head">
        <h2 className="np-step__title">Defina a paleta de cores</h2>
        <p className="np-step__desc">As cores serão aplicadas nos botões, links e destaques do portal.</p>
      </div>
      <div className="np-step__body">
        <div className="np-cores-preview" style={{ '--np-c1': primaria, '--np-c2': secundaria, '--np-c3': terciaria } as React.CSSProperties}>
          <div className="np-cores-preview__bar">
            <div className="np-cores-preview__dot" style={{ background: primaria }} />
            <div className="np-cores-preview__dot" style={{ background: secundaria }} />
            <div className="np-cores-preview__dot" style={{ background: terciaria }} />
          </div>
          <div className="np-cores-preview__mock">
            <div className="np-cores-preview__mock-title" style={{ color: terciaria }}>Portal de Relações com Investidores</div>
            <div className="np-cores-preview__mock-sub">Acompanhe os resultados e comunicados</div>
            <div className="np-cores-preview__mock-btn" style={{ background: primaria }}>Acessar portal</div>
          </div>
        </div>
        <div className="np-cores-list">
          <ColorPicker label="Cor Primária" value={primaria} onChange={onPrimaria} hint="Botões e ações principais" />
          <ColorPicker label="Cor Secundária" value={secundaria} onChange={onSecundaria} hint="Destaques e badges" />
          <ColorPicker label="Cor Terciária" value={terciaria} onChange={onTerciaria} hint="Textos e títulos" />
        </div>
      </div>
    </div>
  );
}

/* ─── Step 6: Logotipo ───────────────────────────────────── */
function StepLogo({
  preview, onFile,
}: {
  preview: string | null; onFile: (file: File, preview: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.type.match(/image\/(png|svg\+xml|jpeg|webp)/)) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) onFile(file, e.target.result as string);
    };
    reader.readAsDataURL(file);
  }, [onFile]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  return (
    <div className="np-step">
      <div className="np-step__head">
        <h2 className="np-step__title">Adicione o logotipo</h2>
        <p className="np-step__desc">Aceita PNG, SVG ou JPG. Tamanho recomendado: 400×120px. Etapa opcional.</p>
      </div>
      <div className="np-step__body">
        {preview ? (
          <div className="np-logo-preview">
            <img src={preview} alt="Logotipo" className="np-logo-preview__img" />
            <button
              className="np-logo-preview__remove"
              type="button"
              onClick={() => { onFile(null as unknown as File, ''); inputRef.current && (inputRef.current.value = ''); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Remover
            </button>
          </div>
        ) : (
          <div
            className={`np-dropzone${dragging ? ' np-dropzone--over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <div className="np-dropzone__text">
              <strong>Arraste o arquivo aqui</strong> ou clique para selecionar
            </div>
            <div className="np-dropzone__hint">PNG, SVG, JPG ou WebP — máx. 5 MB</div>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/svg+xml,image/jpeg,image/webp"
              className="np-dropzone__input"
              onChange={handleChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────── */
export default function NovoPortalPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    nome: '',
    url: '',
    tipo: '',
    fonte: 'inter',
    corPrimaria: '#0B5B68',
    corSecundaria: '#00D865',
    corTerciaria: '#141414',
    logoFile: null,
    logoPreview: null,
  });

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Poppins:wght@400;600;700&family=Raleway:wght@400;600;700&family=Playfair+Display:wght@400;600;700&family=Lato:wght@400;700&family=Merriweather:wght@400;700&display=swap';
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const canProceed = () => {
    if (step === 1) return form.nome.trim().length > 0;
    if (step === 2) return form.url.trim().length > 0;
    if (step === 3) return form.tipo !== '';
    return true;
  };

  function next() { if (canProceed()) setStep((s) => Math.min(s + 1, STEPS.length)); }
  function back() { setStep((s) => Math.max(s - 1, 1)); }

  function handleLogoFile(file: File, preview: string) {
    setForm((f) => ({ ...f, logoFile: file || null, logoPreview: preview || null }));
  }

  function handleSubmit() {
    navigate('/admin/portais');
  }

  return (
    <div className="page novo-portal-page">
      <div className="np-header">
        <button className="np-back-btn" type="button" onClick={() => navigate('/admin/portais')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Cancelar
        </button>
        <span className="np-header__title">Novo Portal</span>
      </div>

      <Stepper current={step} />

      <div className="np-card">
        {step === 1 && (
          <StepNome value={form.nome} onChange={(v) => setForm((f) => ({ ...f, nome: v }))} />
        )}
        {step === 2 && (
          <StepUrl value={form.url} onChange={(v) => setForm((f) => ({ ...f, url: v }))} />
        )}
        {step === 3 && (
          <StepTipo value={form.tipo} onChange={(v) => setForm((f) => ({ ...f, tipo: v }))} />
        )}
        {step === 4 && (
          <StepFonte value={form.fonte} onChange={(v) => setForm((f) => ({ ...f, fonte: v }))} />
        )}
        {step === 5 && (
          <StepCores
            primaria={form.corPrimaria}
            secundaria={form.corSecundaria}
            terciaria={form.corTerciaria}
            onPrimaria={(v) => setForm((f) => ({ ...f, corPrimaria: v }))}
            onSecundaria={(v) => setForm((f) => ({ ...f, corSecundaria: v }))}
            onTerciaria={(v) => setForm((f) => ({ ...f, corTerciaria: v }))}
          />
        )}
        {step === 6 && (
          <StepLogo preview={form.logoPreview} onFile={handleLogoFile} />
        )}

        <div className="np-footer">
          {step > 1 ? (
            <button className="np-btn np-btn--ghost" type="button" onClick={back}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Voltar
            </button>
          ) : <div />}

          {step < STEPS.length ? (
            <button
              className="np-btn np-btn--primary"
              type="button"
              onClick={next}
              disabled={!canProceed()}
            >
              Próximo
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          ) : (
            <button className="np-btn np-btn--primary" type="button" onClick={handleSubmit}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Criar Portal
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
