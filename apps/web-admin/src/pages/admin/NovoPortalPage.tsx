import { useState, useRef, useEffect, useCallback } from 'react';
import { processImage, ImageSlot } from '../../utils/imageProcessor';
import { useNavigate, useLocation } from 'react-router-dom';
import ChannelEditor, { Canal, DEFAULT_CANAIS, DEFAULT_CANAIS_FLAT } from '../../components/ChannelEditor';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { savePortal } from '../../lib/portalsApi';
import { savePortalConfig } from '../../lib/portalConfigApi';
import { cvmService } from '../../services/cvm.service';
import { useAuth } from '../../contexts/AuthContext';
import ColorPickerPopover from '../../components/ColorPickerPopover';
import './AdminPages.css';
import './NovoPortalPage.css';
import '../../components/InviteUserModal.css';

/* ─── Default canais por tipo ──────────────────────────────────────────── */
function defaultCanaisForTipo(tipo: string): Canal[] {
  if (tipo === 'banner') return DEFAULT_CANAIS;
  return DEFAULT_CANAIS_FLAT;
}

/* ─── Dynamic steps ────────────────────────────────────────────────────── */
function getSteps(tipo: string) {
  const steps: { id: number; label: string }[] = [
    { id: 1, label: 'Identificação' },
    { id: 2, label: 'Tipo' },
  ];
  if (tipo === 'banner' || tipo === 'sidebar' || tipo === 'tabmenu') {
    steps.push({ id: 3, label: 'Canais' });
  }
  const off = (tipo === 'banner' || tipo === 'sidebar' || tipo === 'tabmenu') ? 1 : 0;
  steps.push(
    { id: 3 + off, label: 'Fonte' },
    { id: 4 + off, label: 'Cores' },
    { id: 5 + off, label: 'Identidade' },
    { id: 6 + off, label: 'Ticker' },
    { id: 7 + off, label: 'Idioma' },
    { id: 8 + off, label: 'SEO' },
    { id: 9 + off, label: 'Email' },
    { id: 10 + off, label: 'Admin' },
  );
  return steps;
}

/* ─── Tipos ──────────────────────────────────────────────────────── */
const TIPOS = [
  {
    id: 'sidebar',
    label: 'Menu lateral',
    desc: 'Navegação na barra lateral com conteúdo central.',
    thumb: (
      <svg width="100%" height="80" viewBox="0 0 160 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="160" height="14" rx="2" fill="#e8edf2" />
        <rect x="6" y="4" width="28" height="6" rx="1" fill="#c8d2db" />
        <rect x="0" y="16" width="38" height="64" rx="2" fill="#f0f4f8" />
        <rect x="6" y="22" width="26" height="5" rx="1" fill="#c8d2db" />
        <rect x="6" y="31" width="22" height="5" rx="1" fill="#dde3ea" />
        <rect x="6" y="40" width="24" height="5" rx="1" fill="#dde3ea" />
        <rect x="6" y="49" width="20" height="5" rx="1" fill="#dde3ea" />
        <rect x="6" y="58" width="23" height="5" rx="1" fill="#dde3ea" />
        <rect x="42" y="16" width="118" height="10" rx="2" fill="#e8edf2" />
        <rect x="42" y="30" width="118" height="5" rx="1" fill="#eef1f5" />
        <rect x="42" y="39" width="96" height="5" rx="1" fill="#eef1f5" />
        <rect x="42" y="50" width="56" height="14" rx="2" fill="#eef1f5" />
        <rect x="102" y="50" width="58" height="14" rx="2" fill="#eef1f5" />
      </svg>
    ),
  },
  {
    id: 'tabmenu',
    label: 'Tabs de conteúdo',
    desc: 'Navegação por abas horizontais com conteúdo organizado por seção.',
    thumb: (
      <svg width="100%" height="80" viewBox="0 0 160 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="160" height="14" rx="2" fill="#e8edf2" />
        <rect x="6" y="4" width="28" height="6" rx="1" fill="#c8d2db" />
        <rect x="106" y="4" width="18" height="6" rx="1" fill="#dde3ea" />
        <rect x="128" y="4" width="18" height="6" rx="1" fill="#dde3ea" />
        <rect x="0" y="16" width="160" height="16" rx="0" fill="#f5f7fa" />
        <rect x="6" y="19" width="28" height="10" rx="2" fill="#0B5B68" />
        <rect x="38" y="21" width="24" height="6" rx="1" fill="#dde3ea" />
        <rect x="66" y="21" width="28" height="6" rx="1" fill="#dde3ea" />
        <rect x="98" y="21" width="22" height="6" rx="1" fill="#dde3ea" />
        <rect x="6" y="38" width="148" height="10" rx="2" fill="#e8edf2" />
        <rect x="6" y="52" width="148" height="6" rx="1" fill="#eef1f5" />
        <rect x="6" y="62" width="120" height="6" rx="1" fill="#eef1f5" />
      </svg>
    ),
  },
  {
    id: 'banner',
    label: 'Banner com menu',
    desc: 'Banner de destaque no topo com navegação no header.',
    thumb: (
      <svg width="100%" height="80" viewBox="0 0 160 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="160" height="14" rx="2" fill="#0B5B68" />
        <rect x="6" y="4" width="28" height="6" rx="1" fill="rgba(255,255,255,0.4)" />
        <rect x="106" y="4" width="14" height="6" rx="1" fill="rgba(255,255,255,0.25)" />
        <rect x="124" y="4" width="14" height="6" rx="1" fill="rgba(255,255,255,0.25)" />
        <rect x="142" y="4" width="12" height="6" rx="1" fill="rgba(255,255,255,0.25)" />
        <rect x="0" y="16" width="160" height="28" rx="0" fill="#e4eef0" />
        <rect x="10" y="22" width="60" height="8" rx="2" fill="#c8d2db" />
        <rect x="10" y="34" width="40" height="5" rx="1" fill="#dde3ea" />
        <rect x="6" y="50" width="46" height="22" rx="2" fill="#eef1f5" />
        <rect x="57" y="50" width="46" height="22" rx="2" fill="#eef1f5" />
        <rect x="108" y="50" width="46" height="22" rx="2" fill="#eef1f5" />
      </svg>
    ),
  },
];

/* ─── Fonts ──────────────────────────────────────────────────────── */
const FONTS = [
  { id: 'inter', label: 'Inter', family: "'Inter', sans-serif", category: 'Sans-serif' },
  { id: 'plus-jakarta', label: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans', sans-serif", category: 'Sans-serif' },
  { id: 'montserrat', label: 'Montserrat', family: "'Montserrat', sans-serif", category: 'Sans-serif' },
  { id: 'poppins', label: 'Poppins', family: "'Poppins', sans-serif", category: 'Sans-serif' },
  { id: 'raleway', label: 'Raleway', family: "'Raleway', sans-serif", category: 'Sans-serif' },
  { id: 'lato', label: 'Lato', family: "'Lato', sans-serif", category: 'Sans-serif' },
  { id: 'nunito', label: 'Nunito', family: "'Nunito', sans-serif", category: 'Sans-serif' },
  { id: 'dm-sans', label: 'DM Sans', family: "'DM Sans', sans-serif", category: 'Sans-serif' },
  { id: 'outfit', label: 'Outfit', family: "'Outfit', sans-serif", category: 'Sans-serif' },
  { id: 'rubik', label: 'Rubik', family: "'Rubik', sans-serif", category: 'Sans-serif' },
  { id: 'work-sans', label: 'Work Sans', family: "'Work Sans', sans-serif", category: 'Sans-serif' },
  { id: 'manrope', label: 'Manrope', family: "'Manrope', sans-serif", category: 'Sans-serif' },
  { id: 'ibm-plex', label: 'IBM Plex Sans', family: "'IBM Plex Sans', sans-serif", category: 'Sans-serif' },
  { id: 'space-grotesk', label: 'Space Grotesk', family: "'Space Grotesk', sans-serif", category: 'Sans-serif' },
  { id: 'playfair', label: 'Playfair Display', family: "'Playfair Display', serif", category: 'Serif' },
  { id: 'merriweather', label: 'Merriweather', family: "'Merriweather', serif", category: 'Serif' },
  { id: 'lora', label: 'Lora', family: "'Lora', serif", category: 'Serif' },
  { id: 'eb-garamond', label: 'EB Garamond', family: "'EB Garamond', serif", category: 'Serif' },
  { id: 'libre-baskerville', label: 'Libre Baskerville', family: "'Libre Baskerville', serif", category: 'Serif' },
  { id: 'cormorant', label: 'Cormorant Garamond', family: "'Cormorant Garamond', serif", category: 'Serif' },
];

/* ─── Form state ────────────────────────────────────────────────────── */
interface FormData {
  /* portal */
  nome: string;
  nomeFantasia: string;
  url: string;
  cnpj: string;
  cvmCode: string;
  autoCvm: boolean;
  tipoSite: string;
  tipo: string;
  fonteTitulo: string;
  fonteTexto: string;
  corPrimaria: string;
  corSecundaria: string;
  corTerciaria: string;
  customFontFile: File | null;
  customFontName: string;
  logoFile: File | null;
  logoPreview: string | null;
  faviconFile: File | null;
  faviconPreview: string | null;
  idiomas: string[];
  tickerType: 'none' | 'iframe';
  tickerSymbol: string;
  tickerEmbedCode: string;
  metaTitulo: string;
  metaDescricao: string;
  analyticsId: string;
  clarityId: string;
  emailContato: string;
  canais: Canal[];
  /* admin user */
  adminNome: string;
  adminEmail: string;
}

/* ─── Stepper ──────────────────────────────────────────────────────── */
function Stepper({ steps, current }: { steps: { id: number; label: string }[]; current: number }) {
  return (
    <div className="np-stepper">
      {steps.map((s, i) => {
        const done = s.id < current;
        const active = s.id === current;
        return (
          <div key={s.label} className="np-stepper__item">
            <div className={`np-stepper__circle${done ? ' np-stepper__circle--done' : active ? ' np-stepper__circle--active' : ''}`}>
              {done ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : s.id}
            </div>
            <span className={`np-stepper__label${active ? ' np-stepper__label--active' : done ? ' np-stepper__label--done' : ''}`}>
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className={`np-stepper__line${done ? ' np-stepper__line--done' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Step 1: Identificação ──────────────────────────────────────────── */
const TIPO_SITE_OPTIONS = [
  { value: 'ri', label: 'RI — Relações com Investidores' },
  { value: 'institucional', label: 'Institucional' },
  { value: 'landing', label: 'Landing Page' },
  { value: 'fundo', label: 'Fundo' },
];

function StepIdentificacao({
  nome, nomeFantasia, url, cnpj, cvmCode, autoCvm, tipoSite,
  onNome, onNomeFantasia, onCnpj, onCvmCode, onAutoCvm, onTipoSite,
}: {
  nome: string; nomeFantasia: string; url: string; cnpj: string; cvmCode: string; autoCvm: boolean; tipoSite: string;
  onNome: (v: string) => void; onNomeFantasia: (v: string) => void;
  onCnpj: (v: string) => void; onCvmCode: (v: string) => void; onAutoCvm: (v: boolean) => void;
  onTipoSite: (v: string) => void;
}) {
  return (
    <div className="np-step">
      <div className="np-step__head">
        <h2 className="np-step__title">Identificação do portal</h2>
        <p className="np-step__desc">Defina o nome interno, o endereço público e os dados da empresa vinculada.</p>
      </div>
      <div className="np-step__body">

        <div className="np-field">
          <label className="np-label">Nome do site</label>
          <p className="np-field__hint">Esse nome é exibido no painel e identifica o portal internamente.</p>
          <input
            className="np-input np-input--lg"
            type="text"
            placeholder="Ex: Aurora RI"
            value={nome}
            onChange={(e) => onNome(e.target.value)}
            autoFocus
            maxLength={80}
          />
          {nome && <span className="np-input__hint">{nome.length}/80 caracteres</span>}
        </div>

        <div className="np-field">
          <label className="np-label">Domínio do projeto</label>
          <p className="np-field__hint">Gerado automaticamente a partir do nome do site. Usado como nome do repositório GitHub e projeto Vercel.</p>
          <div className={`np-domain-readonly${!url ? ' np-domain-readonly--empty' : ''}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            <span className="np-domain-readonly__value">
              {url ? `workr-portal-${url}` : 'workr-portal-nome-do-cliente'}
            </span>
          </div>
        </div>

        <div className="np-field">
          <label className="np-label">Nome fantasia</label>
          <p className="np-field__hint">Nome público da empresa exibido no portal para os visitantes.</p>
          <input
            className="np-input"
            type="text"
            placeholder="Ex: Construtora Aurora"
            value={nomeFantasia}
            onChange={(e) => onNomeFantasia(e.target.value)}
            maxLength={120}
          />
        </div>

        <div className="np-field">
          <label className="np-label">Tipo de site</label>
          <div className="np-select-wrap">
            <select
              className="np-input np-select"
              value={tipoSite}
              onChange={(e) => onTipoSite(e.target.value)}
            >
              <option value="" disabled>Selecionar tipo…</option>
              {TIPO_SITE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <svg className="np-select-wrap__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        <div className="np-id-row">
          <div className="np-field">
            <label className="np-label">CNPJ da empresa</label>
            <input
              className="np-input"
              type="text"
              placeholder="00.000.000/0001-00"
              value={cnpj}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 14);
                let masked = digits;
                if (digits.length > 12) masked = `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12)}`;
                else if (digits.length > 8) masked = `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8)}`;
                else if (digits.length > 5) masked = `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5)}`;
                else if (digits.length > 2) masked = `${digits.slice(0,2)}.${digits.slice(2)}`;
                onCnpj(masked);
              }}
              maxLength={18}
            />
          </div>
          <div className="np-field">
            <label className="np-label">Código CVM</label>
            <input
              className="np-input"
              type="text"
              placeholder="Ex: 23574"
              value={cvmCode}
              onChange={(e) => onCvmCode(e.target.value)}
              maxLength={10}
            />
          </div>
        </div>

        <div className="np-field">
          <label className="np-label">Auto CVM</label>
          <p className="np-field__hint">Ativar a importação automática de documentos da CVM pelo CNPJ.</p>
          <div className="np-autocvm-options">
            <button
              type="button"
              className={`np-autocvm-card${autoCvm ? ' np-autocvm-card--selected' : ''}`}
              onClick={() => onAutoCvm(true)}
            >
              <div className={`np-autocvm-card__check${autoCvm ? ' np-autocvm-card__check--active' : ''}`}>
                {autoCvm && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
              </div>
              <div className="np-autocvm-card__body">
                <span className="np-autocvm-card__title">Ativar Auto CVM</span>
                <span className="np-autocvm-card__desc">Documentos da CVM são importados automaticamente para os canais regulatórios.</span>
              </div>
            </button>
            <button
              type="button"
              className={`np-autocvm-card${!autoCvm ? ' np-autocvm-card--selected' : ''}`}
              onClick={() => onAutoCvm(false)}
            >
              <div className={`np-autocvm-card__check${!autoCvm ? ' np-autocvm-card__check--active' : ''}`}>
                {!autoCvm && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
              </div>
              <div className="np-autocvm-card__body">
                <span className="np-autocvm-card__title">Não ativar agora</span>
                <span className="np-autocvm-card__desc">O Auto CVM pode ser configurado posteriormente nas configurações do portal.</span>
              </div>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ─── Step 2: Tipo ────────────────────────────────────────────────────── */
function StepTipo({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="np-step">
      <div className="np-step__head">
        <h2 className="np-step__title">Escolha o layout do site</h2>
        <p className="np-step__desc">O layout define a estrutura de navegação e a disposição do conteúdo.</p>
      </div>
      <div className="np-step__body">
        <div className="np-tipo-grid np-tipo-grid--3">
          {TIPOS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`np-tipo-card np-tipo-card--layout${value === t.id ? ' np-tipo-card--selected' : ''}`}
              onClick={() => onChange(t.id)}
            >
              <div className="np-tipo-card__thumb">
                {t.thumb}
              </div>
              <div className="np-tipo-card__footer">
                <div className="np-tipo-card__label">{t.label}</div>
                <div className="np-tipo-card__desc">{t.desc}</div>
              </div>
              {value === t.id && (
                <div className="np-tipo-card__check">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
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

/* ─── Step: Canais ───────────────────────────────────────────────────── */
function StepCanais({ value, onChange, tipo }: { value: Canal[]; onChange: (v: Canal[]) => void; tipo: string }) {
  const isBanner = tipo === 'banner';
  return (
    <div className="np-step">
      <div className="np-step__head">
        <h2 className="np-step__title">Árvore de canais</h2>
        <p className="np-step__desc">
          {isBanner
            ? 'Configure as seções e páginas que farão parte do portal. Você pode alterar isso depois.'
            : 'Cada canal é uma página direta na navegação do portal — este layout não usa sub-páginas. Pré-configurado com as seções mais comuns de RI.'}
        </p>
      </div>
      <div className="np-step__body">
        <ChannelEditor value={value} onChange={onChange} flat={!isBanner} />
      </div>
    </div>
  );
}

/* ─── Step: Fonte ─────────────────────────────────────────────────────── */
function StepFonte({
  role, value, onChange, customFontFile, customFontName, onCustomFont,
}: {
  role: 'titulo' | 'texto';
  value: string; onChange: (v: string) => void;
  customFontFile: File | null; customFontName: string;
  onCustomFont: (file: File | null, name: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [customFontFamily, setCustomFontFamily] = useState<string | null>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!customFontFile) { setCustomFontFamily(null); return; }
    const url = URL.createObjectURL(customFontFile);
    const prev = document.getElementById('np-custom-font-style');
    if (prev) prev.remove();
    const style = document.createElement('style');
    style.id = 'np-custom-font-style';
    style.textContent = `@font-face { font-family: 'NPCustomFont'; src: url('${url}'); }`;
    document.head.appendChild(style);
    setCustomFontFamily("'NPCustomFont', sans-serif");
    return () => { URL.revokeObjectURL(url); };
  }, [customFontFile]);

  const q = search.toLowerCase();
  const filtered = FONTS.filter((f) => f.label.toLowerCase().includes(q));
  const sansSerif = filtered.filter((f) => f.category === 'Sans-serif');
  const serif = filtered.filter((f) => f.category === 'Serif');

  function FontGroup({ fonts, title }: { fonts: typeof FONTS; title: string }) {
    if (!fonts.length) return null;
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

  const selected = value === 'custom'
    ? { label: customFontName || 'Fonte personalizada', family: customFontFamily || 'sans-serif' }
    : FONTS.find((f) => f.id === value);

  function handleCustomFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    onCustomFont(file, name);
    onChange('custom');
  }

  return (
    <div className="np-step">
      <div className="np-step__head">
        <h2 className="np-step__title">{role === 'titulo' ? 'Fonte dos títulos' : 'Fonte do corpo de texto'}</h2>
        <p className="np-step__desc">{role === 'titulo' ? 'Usada em cabeçalhos, títulos de seção e destaques.' : 'Usada em parágrafos, descrições e conteúdo geral.'}</p>
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

        <div className="np-font-search-wrap">
          <svg className="np-font-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="np-input np-font-search"
            type="search"
            placeholder="Buscar fonte por nome…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filtered.length > 0 ? (
          <>
            <FontGroup fonts={sansSerif} title="Sans-serif" />
            <FontGroup fonts={serif} title="Serif" />
          </>
        ) : (
          <div className="np-font-empty">Nenhuma fonte encontrada para "{search}"</div>
        )}

        <div className="np-font-custom">
          <div className="np-font-custom__header">
            <div className="np-font-custom__title">Fonte personalizada</div>
            <p className="np-font-custom__desc">Faça upload de uma fonte nos formatos TTF, WOFF ou WOFF2.</p>
          </div>
          {customFontFile && value === 'custom' ? (
            <div className={`np-font-item np-font-item--selected np-font-custom__row`}>
              <span className="np-font-item__preview" style={{ fontFamily: customFontFamily || 'sans-serif' }}>Aa</span>
              <span className="np-font-item__name">{customFontName || customFontFile.name}</span>
              <button
                className="np-font-custom__remove"
                type="button"
                onClick={() => {
                  onCustomFont(null, '');
                  if (value === 'custom') onChange('inter');
                  if (customInputRef.current) customInputRef.current.value = '';
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ) : (
            <button className="np-font-custom__upload" type="button" onClick={() => customInputRef.current?.click()}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Fazer upload de fonte
            </button>
          )}
          <input
            ref={customInputRef}
            type="file"
            accept=".ttf,.woff,.woff2,.otf"
            style={{ display: 'none' }}
            onChange={handleCustomFile}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── ColorField ─────────────────────────────────────────────────────── */
function ColorField({ label, value, onChange, hint, required }: {
  label: string; value: string; onChange: (v: string) => void; hint: string; required?: boolean;
}) {
  return (
    <div className="np-color-item">
      <label className="np-color-item__label">
        {label}{required && <span className="np-label__required"> *</span>}
      </label>
      <p className="np-color-item__hint">{hint}</p>
      <ColorPickerPopover value={value} onChange={onChange} />
    </div>
  );
}

/* ─── Step: Cores ─────────────────────────────────────────────────────── */
function StepCores({
  primaria, secundaria, terciaria,
  onPrimaria, onSecundaria, onTerciaria,
}: {
  primaria: string; secundaria: string; terciaria: string;
  onPrimaria: (v: string) => void; onSecundaria: (v: string) => void; onTerciaria: (v: string) => void;
}) {
  return (
    <div className="np-step">
      <div className="np-step__head">
        <h2 className="np-step__title">Defina a paleta de cores</h2>
        <p className="np-step__desc">As cores serão aplicadas nos botões, links e destaques do portal.</p>
      </div>
      <div className="np-step__body">
        <div className="np-cores-preview" style={{ '--np-c1': primaria, '--np-c2': secundaria, '--np-c3': terciaria } as React.CSSProperties}>
          {/* 60 / 30 / 10 proportion bar — 60% neutras, 30% secundária, 10% primária */}
          <div className="np-cores-preview__bar">
            <div className="np-cores-preview__bar-seg" style={{ background: '#e8edf2', flex: 6 }} title="Neutras — 60%" />
            <div className="np-cores-preview__bar-seg" style={{ background: secundaria, flex: 3 }} title="Secundária — 30%" />
            <div className="np-cores-preview__bar-seg" style={{ background: primaria, flex: 1 }} title="Primária — 10%" />
          </div>
          <div className="np-cores-preview__mock">
            {/* Header/nav usa secundária como background (30%) */}
            <div className="np-cores-preview__mock-nav" style={{ background: secundaria }}>
              <span className="np-cores-preview__mock-nav-brand">Portal RI</span>
              <span className="np-cores-preview__mock-nav-links">Sobre · Resultados · Contato</span>
            </div>
            {/* Body section — título em secundária, fundo neutro */}
            <div className="np-cores-preview__mock-body">
              <div className="np-cores-preview__mock-title" style={{ color: secundaria }}>Portal de Relações com Investidores</div>
              <div className="np-cores-preview__mock-sub">Acompanhe os resultados e comunicados</div>
              {/* CTA button usa primária (10%) */}
              <div className="np-cores-preview__mock-btn" style={{ background: primaria }}>Acessar portal</div>
            </div>
          </div>
          <div className="np-cores-preview__legend">
            <span><em style={{ background: '#e8edf2', border: '1px solid #d0d5db' }} />Neutra 60%</span>
            <span><em style={{ background: secundaria }} />Secundária 30%</span>
            <span><em style={{ background: primaria }} />Primária 10%</span>
          </div>
        </div>
        <div className="np-cores-grid">
          <ColorField label="Cor Primária" value={primaria} onChange={onPrimaria} hint="CTAs, botões e destaques — 10%" required />
          <ColorField label="Cor Secundária" value={secundaria} onChange={onSecundaria} hint="Títulos, backgrounds e seções — 30%" />
          <ColorField label="Cor de Destaque" value={terciaria} onChange={onTerciaria} hint="Complemento para casos específicos" />
        </div>
      </div>
    </div>
  );
}

/* ─── Dropzone ───────────────────────────────────────────────────────── */
function Dropzone({
  preview, onFile, hint, accept, size,
}: {
  preview: string | null;
  onFile: (file: File | null, preview: string | null) => void;
  hint: string;
  accept: string;
  size: 'logo' | 'favicon';
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.match(/image\/(png|svg\+xml|jpeg|webp|x-icon|vnd.microsoft.icon)/)) return;
    const slot: ImageSlot = size === 'favicon' ? 'favicon' : 'logo';
    const result = await processImage(file, slot);
    onFile(result.file, result.objectUrl);
  }, [onFile, size]);

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

  if (preview) {
    return (
      <div className={`np-logo-preview${size === 'favicon' ? ' np-logo-preview--favicon' : ''}`}>
        <img src={preview} alt="" className={size === 'favicon' ? 'np-logo-preview__favicon' : 'np-logo-preview__img'} />
        <button
          className="np-logo-preview__remove"
          type="button"
          onClick={() => { onFile(null, null); if (inputRef.current) inputRef.current.value = ''; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Remover
        </button>
        <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={handleChange} />
      </div>
    );
  }

  return (
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
      <div className="np-dropzone__hint">{hint}</div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="np-dropzone__input"
        onChange={handleChange}
      />
    </div>
  );
}

/* ─── Step: Identidade ────────────────────────────────────────────────────── */
function StepIdentidade({
  logoPreview, faviconPreview,
  onLogo, onFavicon,
}: {
  logoPreview: string | null;
  faviconPreview: string | null;
  onLogo: (file: File | null, preview: string | null) => void;
  onFavicon: (file: File | null, preview: string | null) => void;
}) {
  return (
    <div className="np-step">
      <div className="np-step__head">
        <h2 className="np-step__title">Identidade visual</h2>
        <p className="np-step__desc">Configure o logotipo e o favicon do portal.</p>
      </div>
      <div className="np-step__body np-step__body--sections">

        <div className="np-field">
          <label className="np-label">Logotipo</label>
          <p className="np-field__hint">PNG, SVG ou JPG. Tamanho recomendado: 400×120px. Etapa opcional.</p>
          <Dropzone
            preview={logoPreview}
            onFile={onLogo}
            hint="PNG, SVG, JPG ou WebP — máx. 5 MB"
            accept="image/png,image/svg+xml,image/jpeg,image/webp"
            size="logo"
          />
        </div>

        <div className="np-field">
          <label className="np-label">Favicon</label>
          <p className="np-field__hint">Ícone exibido na aba do navegador. Tamanho recomendado: 32×32px. Etapa opcional.</p>
          <Dropzone
            preview={faviconPreview}
            onFile={onFavicon}
            hint="ICO, PNG ou SVG — máx. 1 MB"
            accept="image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml"
            size="favicon"
          />
        </div>

      </div>
    </div>
  );
}

/* ─── Step: Ticker ────────────────────────────────────────────────────────── */
type TickerType = 'none' | 'iframe';

function StepTicker({
  tickerType, tickerSymbol, tickerEmbedCode,
  onType, onSymbol, onEmbedCode,
}: {
  tickerType: TickerType; tickerSymbol: string; tickerEmbedCode: string;
  onType: (v: TickerType) => void; onSymbol: (v: string) => void; onEmbedCode: (v: string) => void;
}) {
  return (
    <div className="np-step">
      <div className="np-step__head">
        <h2 className="np-step__title">Ticker de cotação <span style={{ fontSize: '0.75em', fontWeight: 400, color: 'var(--color-text-tertiary)' }}>(opcional)</span></h2>
        <p className="np-step__desc">Configure o widget de cotação exibido no header do portal. Código embed fornecido pela Enfoque.</p>
      </div>
      <div className="np-step__body">
        <div className="np-field">
          <label className="np-label">Ticker (código do ativo)</label>
          <input
            className="np-input"
            type="text"
            placeholder="Ex: IGTA3, PETR4, VALE3"
            value={tickerSymbol}
            onChange={e => onSymbol(e.target.value.toUpperCase())}
            maxLength={10}
            disabled={tickerType === 'none'}
          />
          <span className="np-field-hint">Código do ativo na B3, conforme cadastrado na Enfoque.</span>
        </div>
        <div className="np-field">
          <label className="np-label">Código embed (fornecido pela Enfoque)</label>
          <textarea
            className="np-input np-textarea"
            placeholder={'<iframe src="https://..." ...></iframe>'}
            value={tickerEmbedCode}
            onChange={e => onEmbedCode(e.target.value)}
            rows={4}
            disabled={tickerType === 'none'}
          />
          <span className="np-field-hint">Cole aqui o código HTML fornecido pela Enfoque para o widget de cotação.</span>
        </div>
        <label className="np-ticker-none-toggle">
          <input
            type="checkbox"
            checked={tickerType === 'none'}
            onChange={e => onType(e.target.checked ? 'none' : 'iframe')}
          />
          <span>Sem ticker no portal</span>
        </label>
      </div>
    </div>
  );
}

/* ─── Step: Idioma ────────────────────────────────────────────────────────── */
function FlagBR() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 27" width="36" height="27" style={{ borderRadius: 3, flexShrink: 0 }}>
      <rect width="36" height="27" fill="#009c3b" />
      <polygon points="18,3 33,13.5 18,24 3,13.5" fill="#ffdf00" />
      <circle cx="18" cy="13.5" r="6" fill="#002776" />
      <path d="M12.5,11.5 Q18,9.5 23.5,11.5" stroke="#fff" strokeWidth="1.2" fill="none" />
    </svg>
  );
}
function FlagUS() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 27" width="36" height="27" style={{ borderRadius: 3, flexShrink: 0 }}>
      {[0,1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
        <rect key={i} x="0" y={i*2.077} width="36" height="2.077" fill={i % 2 === 0 ? '#B22234' : '#fff'} />
      ))}
      <rect x="0" y="0" width="15" height="14.5" fill="#3C3B6E" />
      {[0,1,2,3,4].map(row => [0,1,2,3,4,5].map(col => (
        <circle key={`${row}-${col}`} cx={1.3 + col * 2.5 + (row % 2 === 0 ? 0 : 1.25)} cy={1.5 + row * 2.8} r="0.8" fill="#fff" />
      )))}
    </svg>
  );
}
function FlagES() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 27" width="36" height="27" style={{ borderRadius: 3, flexShrink: 0 }}>
      <rect width="36" height="27" fill="#c60b1e" />
      <rect y="6.75" width="36" height="13.5" fill="#ffc400" />
    </svg>
  );
}
function FlagGeneric({ code }: { code: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 27, borderRadius: 3, background: '#e5e7eb', fontSize: 11, fontWeight: 700, color: '#374151', letterSpacing: '0.04em', flexShrink: 0 }}>
      {code.toUpperCase()}
    </span>
  );
}
const FLAG_COMPONENTS: Record<string, React.ReactNode> = {
  'pt-BR': <FlagBR />,
  en: <FlagUS />,
  es: <FlagES />,
  fr: <FlagGeneric code="FR" />,
  de: <FlagGeneric code="DE" />,
  it: <FlagGeneric code="IT" />,
  zh: <FlagGeneric code="ZH" />,
  ja: <FlagGeneric code="JA" />,
};
const ALL_LANGS = [
  { id: 'pt-BR', label: 'Português', flag: '🇧🇷', desc: 'Conteúdo em português brasileiro' },
  { id: 'en', label: 'Inglês', flag: '🇺🇸', desc: 'Conteúdo em inglês americano' },
  { id: 'es', label: 'Espanhol', flag: '🇪🇸', desc: 'Conteúdo em espanhol' },
  { id: 'fr', label: 'Francês', flag: '🇫🇷', desc: 'Conteúdo em francês' },
  { id: 'de', label: 'Alemão', flag: '🇩🇪', desc: 'Conteúdo em alemão' },
  { id: 'it', label: 'Italiano', flag: '🇮🇹', desc: 'Conteúdo em italiano' },
  { id: 'zh', label: 'Chinês', flag: '🇨🇳', desc: 'Conteúdo em chinês simplificado' },
  { id: 'ja', label: 'Japonês', flag: '🇯🇵', desc: 'Conteúdo em japonês' },
];

function StepIdioma({ idiomas, onIdiomas }: { idiomas: string[]; onIdiomas: (v: string[]) => void }) {
  const primaryLangs = ALL_LANGS.filter((l) => ['pt-BR', 'en', 'es'].includes(l.id));

  function toggleIdioma(id: string) {
    if (idiomas.includes(id)) {
      if (idiomas.length === 1) return;
      onIdiomas(idiomas.filter((v) => v !== id));
    } else {
      onIdiomas([...idiomas, id]);
    }
  }

  return (
    <div className="np-step">
      <div className="np-step__head">
        <h2 className="np-step__title">Idiomas do portal</h2>
        <p className="np-step__desc">Selecione um ou mais idiomas disponíveis no portal. Você pode adicionar versões adicionais depois.</p>
      </div>
      <div className="np-step__body">
        <div className="np-idioma-list">
          {primaryLangs.map((lang) => {
            const selected = idiomas.includes(lang.id);
            return (
              <button
                key={lang.id}
                type="button"
                className={`np-idioma-card${selected ? ' np-idioma-card--selected' : ''}`}
                onClick={() => toggleIdioma(lang.id)}
              >
                <span className="np-idioma-card__flag">{FLAG_COMPONENTS[lang.id] ?? <FlagGeneric code={lang.id} />}</span>
                <div className="np-idioma-card__info">
                  <span className="np-idioma-card__label">{lang.label}</span>
                  <span className="np-idioma-card__desc">{lang.desc}</span>
                </div>
                <div className={`np-idioma-card__check${selected ? ' np-idioma-card__check--active' : ''}`}>
                  {selected && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Step: SEO ───────────────────────────────────────────────────────── */
function StepSeo({
  metaTitulo, metaDescricao, analyticsId, clarityId,
  onMetaTitulo, onMetaDescricao, onAnalyticsId, onClarityId,
}: {
  metaTitulo: string; metaDescricao: string; analyticsId: string; clarityId: string;
  onMetaTitulo: (v: string) => void; onMetaDescricao: (v: string) => void; onAnalyticsId: (v: string) => void; onClarityId: (v: string) => void;
}) {
  return (
    <div className="np-step">
      <div className="np-step__head">
        <h2 className="np-step__title">SEO e Analytics</h2>
        <p className="np-step__desc">Configure as informações de indexação e rastreamento do portal. Etapa opcional.</p>
      </div>
      <div className="np-step__body">
        <div className="np-field">
          <label className="np-label">Meta título</label>
          <p className="np-field__hint">Título exibido nos resultados de busca (recomendado: até 60 caracteres)</p>
          <input
            className="np-input"
            type="text"
            placeholder="Ex: Aurora RI — Relações com Investidores"
            value={metaTitulo}
            onChange={(e) => onMetaTitulo(e.target.value)}
            maxLength={100}
          />
          {metaTitulo && (
            <span className={`np-input__hint${metaTitulo.length > 60 ? ' np-input__hint--warn' : ''}`}>
              {metaTitulo.length}/60 caracteres recomendados
            </span>
          )}
        </div>
        <div className="np-field">
          <label className="np-label">Meta descrição</label>
          <p className="np-field__hint">Resumo exibido nos resultados de busca (recomendado: até 160 caracteres)</p>
          <textarea
            className="np-input np-input--textarea"
            placeholder="Ex: Acesse os resultados financeiros, fatos relevantes e informações de governança da Aurora."
            value={metaDescricao}
            onChange={(e) => onMetaDescricao(e.target.value)}
            maxLength={300}
            rows={3}
          />
          {metaDescricao && (
            <span className={`np-input__hint${metaDescricao.length > 160 ? ' np-input__hint--warn' : ''}`}>
              {metaDescricao.length}/160 caracteres recomendados
            </span>
          )}
        </div>
        <div className="np-field">
          <label className="np-label">ID do Google Analytics / GTM</label>
          <p className="np-field__hint">Google Analytics 4 (G-XXXXXXXX) ou Google Tag Manager (GTM-XXXXXXX)</p>
          <input
            className="np-input"
            type="text"
            placeholder="G-XXXXXXXXXX ou GTM-XXXXXXX"
            value={analyticsId}
            onChange={(e) => onAnalyticsId(e.target.value)}
            maxLength={30}
          />
        </div>
        <div className="np-field">
          <label className="np-label">ID do Microsoft Clarity</label>
          <p className="np-field__hint">Tracking de mapas de calor e sessões via Microsoft Clarity (clarity.microsoft.com)</p>
          <input
            className="np-input"
            type="text"
            placeholder="xxxxxxxxxx"
            value={clarityId}
            onChange={(e) => onClarityId(e.target.value)}
            maxLength={20}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Step: Email ──────────────────────────────────────────────────────── */
function StepEmail({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isValid = !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  return (
    <div className="np-step">
      <div className="np-step__head">
        <h2 className="np-step__title">Email de contato</h2>
        <p className="np-step__desc">E-mail padrão de resposta do portal. Usado como Reply-To nos envios automáticos e exibido como contato nos comunicados.</p>
      </div>
      <div className="np-step__body">
        <div className="np-field">
          <label className="np-label">Email</label>
          <div className="np-email-wrap">
            <svg className="np-email-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <input
              className={`np-input np-input--email${!isValid ? ' np-input--error' : ''}`}
              type="email"
              placeholder="ri@empresa.com.br"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              autoFocus
            />
          </div>
          {!isValid && (
            <span className="np-input__hint np-input__hint--error">Digite um endereço de e-mail válido.</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Step: Admin ─────────────────────────────────────────────────────── */
function StepAdmin({
  nome, email,
  onNome, onEmail,
}: {
  nome: string; email: string;
  onNome: (v: string) => void; onEmail: (v: string) => void;
}) {
  const emailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <div className="np-step">
      <div className="np-step__head">
        <h2 className="np-step__title">Usuário administrador</h2>
        <p className="np-step__desc">Informe os dados do responsável pelo portal. Após a criação, um e-mail de boas-vindas será enviado com o link para o cliente definir a própria senha.</p>
      </div>
      <div className="np-step__body">

        <div className="np-admin-notice np-admin-notice--email">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          <span>O cliente receberá um e-mail de boas-vindas com um link para criar a própria senha antes de acessar o portal pela primeira vez.</span>
        </div>

        <div className="np-field">
          <label className="np-label">Nome completo <span className="np-label__required">*</span></label>
          <input
            className="np-input"
            type="text"
            placeholder="Ex: Carlos Silva"
            value={nome}
            onChange={(e) => onNome(e.target.value)}
            maxLength={80}
            autoFocus
          />
        </div>

        <div className="np-field">
          <label className="np-label">E-mail <span className="np-label__required">*</span></label>
          <div className="np-email-wrap">
            <svg className="np-email-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <input
              className={`np-input np-input--email${!emailValid ? ' np-input--error' : ''}`}
              type="email"
              placeholder="carlos@empresa.com.br"
              value={email}
              onChange={(e) => onEmail(e.target.value)}
            />
          </div>
          {!emailValid && <span className="np-input__hint np-input__hint--error">Digite um endereço de e-mail válido.</span>}
        </div>

      </div>
    </div>
  );
}

/* ─── Main ──────────────────────────────────────────────────────────── */
export default function NovoPortalPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { empresaNome?: string; portalId?: string } | null;
  const { enterPortal } = useAuth();
  const isAddingSite = !!locationState?.empresaNome;

  const DRAFT_KEY = 'workr_wizard_draft';

  function loadDraft(): { step: number; form: FormData } {
    const defaults: FormData = {
      nome: locationState?.empresaNome ?? '',
      nomeFantasia: '',
      url: '',
      cnpj: '',
      cvmCode: '',
      autoCvm: true,
      tipoSite: '',
      tipo: '',
      fonteTitulo: 'inter',
      fonteTexto: 'inter',
      customFontFile: null,
      customFontName: '',
      corPrimaria: '#0B5B68',
      corSecundaria: '#00D865',
      corTerciaria: '#F4A261',
      logoFile: null,
      logoPreview: null,
      faviconFile: null,
      faviconPreview: null,
      idiomas: ['pt-BR'],
      tickerType: 'iframe',
      tickerSymbol: '',
      tickerEmbedCode: '',
      metaTitulo: '',
      metaDescricao: '',
      analyticsId: '',
      clarityId: '',
      emailContato: '',
      canais: DEFAULT_CANAIS,
      adminNome: '',
      adminEmail: '',
    };
    if (isAddingSite) return { step: 1, form: defaults };
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return { step: 1, form: defaults };
      const { step: savedStep, ...saved } = JSON.parse(raw);
      return { step: typeof savedStep === 'number' ? savedStep : 1, form: { ...defaults, ...saved, logoFile: null, faviconFile: null, customFontFile: null } };
    } catch {
      return { step: 1, form: defaults };
    }
  }

  const _draft = loadDraft();
  const [step, setStep] = useState(_draft.step);
  const [form, setForm] = useState<FormData>(_draft.form);

  // Auto-save wizard draft (excluding File objects which can't be serialized)
  useEffect(() => {
    if (isAddingSite) return; // Don't persist when adding a site
    try {
      const { logoFile, faviconFile, customFontFile, ...serializable } = form;
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, ...serializable }));
    } catch { /* ignore */ }
  }, [form, step]);

  const [creating, setCreating] = useState(false);
  const [creatingStep, setCreatingStep] = useState(-1); // -1 = not started, 0..N = current step, N+1 = done
  const [creationWarnings, setCreationWarnings] = useState<string[]>([]);
  const [createdSiteId, setCreatedSiteId] = useState<string | null>(null);
  const steps = getSteps(form.tipo);
  const currentLabel = steps[step - 1]?.label ?? '';
  const [fonteFase, setFonteFase] = useState<'titulo' | 'texto'>('titulo');

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Poppins:wght@400;600;700&family=Raleway:wght@400;600;700&family=Playfair+Display:wght@400;600;700&family=Lato:wght@400;700&family=Merriweather:wght@400;700&family=Nunito:wght@400;600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700&family=Outfit:wght@400;600;700&family=Rubik:wght@400;600;700&family=Work+Sans:wght@400;600;700&family=Manrope:wght@400;600;700&family=IBM+Plex+Sans:wght@400;600;700&family=Space+Grotesk:wght@400;600;700&family=Lora:wght@400;600;700&family=EB+Garamond:wght@400;700&family=Libre+Baskerville:wght@400;700&family=Cormorant+Garamond:wght@400;600;700&display=swap';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  const canProceed = () => {
    if (currentLabel === 'Identificação') return form.nome.trim().length > 0;
    if (currentLabel === 'Tipo') return form.tipo !== '';
    if (currentLabel === 'Idioma') return form.idiomas.length > 0;
    if (currentLabel === 'Email') {
      if (!form.emailContato) return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailContato);
    }
    if (currentLabel === 'Cores') return form.corPrimaria !== '';
    if (currentLabel === 'Admin') {
      return (
        form.adminNome.trim().length > 0 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail)
      );
    }
    return true;
  };

  function next() {
    if (!canProceed()) return;
    if (currentLabel === 'Fonte' && fonteFase === 'titulo') {
      setFonteFase('texto');
      document.querySelector('.admin-main')?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (currentLabel === 'Fonte') setFonteFase('titulo');
    setStep((s) => Math.min(s + 1, steps.length));
    document.querySelector('.admin-main')?.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function back() {
    if (currentLabel === 'Fonte' && fonteFase === 'texto') {
      setFonteFase('titulo');
      return;
    }
    if (currentLabel === 'Fonte') setFonteFase('titulo');
    setStep((s) => Math.max(s - 1, 1));
  }

  const CREATION_STEPS = [
    { label: 'Registrando domínio', desc: 'Configurando DNS e certificado SSL' },
    { label: 'Criando banco de dados', desc: 'Estrutura de dados inicializada' },
    { label: 'Aplicando identidade visual', desc: 'Cores, fontes e logotipo configurados' },
    { label: 'Configurando canais', desc: 'Estrutura de navegação definida' },
    { label: 'Criando usuário administrador', desc: 'Acesso enviado por e-mail' },
  ];

  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function fileToBase64(file: File): Promise<{ b64: string; ext: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        // strip "data:<mime>;base64," prefix
        const b64 = dataUrl.split(',')[1] ?? '';
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
        resolve({ b64, ext });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function handleSubmit() {
    setCreating(true);
    setCreatingStep(0);
    let i = 0;
    function advance() {
      i += 1;
      if (i < CREATION_STEPS.length) {
        setTimeout(() => { setCreatingStep(i); advance(); }, 900);
      } else {
        setTimeout(async () => {
          // Keep last step spinner active while real async work runs.
          // setCreatingStep(CREATION_STEPS.length) is called AFTER all API calls finish.

          // Persiste o portal no localStorage para aparecer na lista
          const stored = localStorage.getItem('workr_portais');
          const existing = stored ? JSON.parse(stored) : [];
          const newPortal = {
            id: Date.now().toString(),
            cliente: form.nome,
            criadoEm: new Date().toLocaleDateString('pt-BR'),
            autoCvm: form.autoCvm,
            cvmCode: form.cvmCode || '',
            empresa: {
              cnpj: form.cnpj,
              responsavel: form.adminNome,
              email: form.adminEmail,
              status: 'Ativa' as const,
            },
            sites: [{
              id: `s${Date.now()}`,
              link: form.url ? `workr-portal-${form.url}.vercel.app` : `workr-portal-${form.nome.toLowerCase().replace(/\s+/g, '-')}.vercel.app`,
              status: 'Ativo' as const,
              ip: '',
              tipo: (form.tipoSite as 'RI' | 'Institucional' | 'Fundo' | 'Landing Page') || 'RI',
            }],
          };
          localStorage.setItem('workr_portais', JSON.stringify([...existing, newPortal]));
          setCreatedSiteId(newPortal.sites[0].id);

          // Set the newly created portal as the active portal
          enterPortal(newPortal.id, form.nome);

          // Inicializa a árvore de canais do portal no localStorage (per-portal key)
          // Usa os canais configurados no wizard ou DEFAULT_CANAIS como ponto de partida
          localStorage.setItem(
            `portal_canais_${newPortal.id}`,
            JSON.stringify(form.canais && form.canais.length > 0 ? form.canais : defaultCanaisForTipo(form.tipo)),
          );

          const pid = newPortal.id;

          // Salva cores do portal (portal-scoped)
          localStorage.setItem(`portal_cores_${pid}`, JSON.stringify({
            primary: form.corPrimaria,
            secondary: form.corSecundaria,
            tertiary: form.corTerciaria,
          }));

          // Salva favicon e logo como data URL (blob URLs não persistem entre sessões)
          if (form.faviconFile) {
            const faviconDataUrl = await fileToDataUrl(form.faviconFile);
            localStorage.setItem(`portal_favicon_${pid}`, faviconDataUrl);
          }
          if (form.logoFile) {
            const logoDataUrl = await fileToDataUrl(form.logoFile);
            localStorage.setItem(`portal_logotipo_${pid}`, logoDataUrl);
          }

          // Salva idiomas do portal (portal-scoped)
          localStorage.setItem(`portal_idiomas_${pid}`, JSON.stringify(form.idiomas));

          // Salva ticker do portal (portal-scoped)
          if (form.tickerType !== 'none') {
            localStorage.setItem(`portal_ticker_${pid}`, JSON.stringify({
              type: form.tickerType,
              symbol: form.tickerSymbol || undefined,
              embedCode: form.tickerEmbedCode || undefined,
            }));
          }

          // Salva template do portal (portal-scoped)
          if (form.tipo) {
            localStorage.setItem(`portal_layout_${pid}`, form.tipo);
          }

          // Salva fontes do portal (portal-scoped)
          localStorage.setItem(`portal_fontes_${pid}`, JSON.stringify({
            heading: form.fonteTitulo,
            body: form.fonteTexto,
          }));

          // Adiciona usuário admin à lista global de usuários
          if (form.adminEmail) {
            const usuariosRaw = localStorage.getItem('workr_usuarios');
            const usuariosList = usuariosRaw ? JSON.parse(usuariosRaw) : [];
            if (!usuariosList.find((u: { email: string }) => u.email === form.adminEmail)) {
              usuariosList.push({
                id: `u${Date.now()}`,
                nome: form.adminNome || form.adminEmail,
                email: form.adminEmail,
                role: 'client_user',
                portais: [newPortal.id],
                status: 'Ativo',
              });
              localStorage.setItem('workr_usuarios', JSON.stringify(usuariosList));
            }
          }

          // Registra entidade CVM no store (mock → real backend quando Go estiver pronto)
          if (form.autoCvm && form.cnpj) {
            cvmService.onPortalCreated(newPortal.id, form.cnpj, form.cvmCode || '', form.nome)
              .catch(console.error);
          }

          const warnings: string[] = [];
          let provisionedUuid: string | undefined;

          // Provisiona repositório GitHub + projeto Vercel
          // Strip any accidental 'workr-portal-' prefix — the edge function always prepends it
          const rawSlug = form.url || form.nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          const subdomain = rawSlug.replace(/^workr-portal-/, '');
          if (isSupabaseConfigured && supabase) {
            try {
              const { data: { session: sess } } = await supabase.auth.getSession();
              const t = sess?.access_token;
              if (t) {
                const provRes = await fetch(
                  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/provision-portal`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${t}`,
                      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
                    },
                    body: JSON.stringify({
                      portalId: newPortal.id,
                      nome: form.nome,
                      nomeFantasia: form.nomeFantasia || form.nome,
                      cnpj: form.cnpj,
                      cvmCode: form.cvmCode,
                      tipoSite: form.tipoSite,
                      subdomain,
                      layout: form.tipo,
                      colors: { primary: form.corPrimaria, secondary: form.corSecundaria, tertiary: form.corTerciaria },
                      fonts: { display: form.fonteTitulo, body: form.fonteTexto },
                      canais: form.canais,
                      ticker: form.tickerType === 'none'
                        ? { type: 'none' }
                        : { type: 'iframe', iframeUrl: (form.tickerEmbedCode.match(/src=["']([^"']+)["']/)?.[1]) || '' },
                      idiomas: form.idiomas,
                      seo: {
                        metaTitulo: form.metaTitulo,
                        metaDescricao: form.metaDescricao,
                        analyticsId: form.analyticsId,
                        clarityId: form.clarityId,
                      },
                      emailContato: form.emailContato,
                      ...(form.logoFile    ? { logo:    await fileToBase64(form.logoFile)    } : {}),
                      ...(form.faviconFile ? { favicon: await fileToBase64(form.faviconFile) } : {}),
                    }),
                  }
                );
                if (provRes.ok) {
                  const provData = await provRes.json() as {
                    repoName: string; repoUrl: string; vercelUrl: string;
                    vercelCreated: boolean; vercelError?: string; portalUuid?: string;
                    portalUpsertError?: string; configUpsertError?: string; siteUpsertError?: string;
                    assetErrors?: string[];
                  };
                  if (provData.portalUpsertError) warnings.push(`Registro do portal no banco: ${provData.portalUpsertError}`);
                  if (provData.configUpsertError) warnings.push(`Configuração inicial no banco: ${provData.configUpsertError}`);
                  if (provData.assetErrors?.length) warnings.push(`Upload de assets: ${provData.assetErrors.join('; ')}`);
                  // Store GitHub repo + Supabase UUID in portal record
                  const portaisRaw = localStorage.getItem('workr_portais');
                  const portais = portaisRaw ? JSON.parse(portaisRaw) : [];
                  const idx = portais.findIndex((p: { id: string }) => p.id === newPortal.id);
                  if (idx !== -1) {
                    portais[idx].githubRepo = provData.repoName;
                    portais[idx].vercelUrl = provData.vercelUrl;
                    portais[idx].vercelCreated = provData.vercelCreated;
                    if (provData.portalUuid) { portais[idx].supabaseId = provData.portalUuid; provisionedUuid = provData.portalUuid; }
                    // Update site.link to the actual Vercel URL (Vercel generates its own slug)
                    const siteLink = (provData.vercelUrl ?? `https://${provData.repoName}.vercel.app`).replace(/^https?:\/\//, '');
                    if (portais[idx].sites?.length > 0) {
                      portais[idx].sites[0].link = siteLink;
                    }
                    localStorage.setItem('workr_portais', JSON.stringify(portais));
                    // Await: savePortalConfig below resolves the portal UUID from the
                    // portals table — the row must exist before we try to write config.
                    try { await savePortal(portais[idx]); } catch (e) { console.error(e); }

                    // Belt-and-suspenders: write the full initial config from the
                    // frontend too, so the CMS state is guaranteed even if the
                    // Edge Function's portal_config upsert failed silently.
                    await savePortalConfig(newPortal.id, {
                      canais: form.canais,
                      cores: { primary: form.corPrimaria, secondary: form.corSecundaria, tertiary: form.corTerciaria },
                      fontes: { heading: form.fonteTitulo, body: form.fonteTexto },
                      layout: form.tipo,
                      ticker: form.tickerType === 'none'
                        ? { type: 'none' }
                        : { type: form.tickerType, symbol: form.tickerSymbol || undefined, embedCode: form.tickerEmbedCode || undefined },
                      empresas: [{
                        id: `principal-${newPortal.id}`,
                        nome: form.nomeFantasia || form.nome,
                        tipo: 'EMPRESA',
                        cnpj: form.cnpj || '',
                        cvmCodigo: form.cvmCode || '',
                        autoCvm: form.autoCvm,
                        importarDesde: '',
                        ativo: true,
                      }],
                    }).catch(err => {
                      warnings.push(`Falha ao gravar configuração inicial: ${String(err)}`);
                    });

                    // Belt-and-suspenders: upsert portal_sites directly from the frontend
                    // using the UUID returned by provision-portal, guaranteeing the record exists.
                    if (provData.portalUuid && supabase) {
                      supabase.from('portal_sites').upsert({
                        portal_id: provData.portalUuid,
                        link: siteLink,
                        status: 'Ativo',
                        ip: null,
                        tipo: form.tipoSite || 'RI',
                      }, { onConflict: 'portal_id' }).then(({ error }) => {
                        if (error) console.error('portal_sites upsert fallback failed:', error.message);
                      });
                    }
                  }
                  if (!provData.vercelCreated) {
                    warnings.push(`Projeto Vercel não criado: ${provData.vercelError ?? 'erro desconhecido'}`);
                  }
                } else {
                  const errBody = await provRes.json().catch(() => ({})) as { error?: string };
                  warnings.push(`Erro no provisionamento GitHub: ${errBody.error ?? provRes.statusText}`);
                }
              }
            } catch (e) {
              warnings.push(`Erro de rede ao provisionar: ${String(e)}`);
            }
          }

          // Convida o usuário admin via Supabase Edge Function
          if (isSupabaseConfigured && supabase && form.adminEmail) {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              const token = session?.access_token;
              if (token) {
                const inviteRes = await fetch(
                  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-portal-user`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`,
                      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
                    },
                    body: JSON.stringify({
                      email: form.adminEmail,
                      nome: form.adminNome,
                      portalId: provisionedUuid ?? newPortal.id,
                      portalKey: newPortal.id,
                      role: 'admin',
                      resend: true,
                      empresas: [`principal-${newPortal.id}`],
                      redirectTo: 'https://workr-lite-v1.vercel.app/definir-senha',
                    }),
                  }
                );
                const invBody = await inviteRes.json().catch(() => ({})) as { error?: string; emailError?: string; alreadyExists?: boolean };
                if (!inviteRes.ok) {
                  const msg = invBody.error ?? inviteRes.statusText;
                  const lower = msg.toLowerCase();
                  if (lower.includes('rate') || lower.includes('limit') || lower.includes('over_email')) {
                    warnings.push(`INVITE_PENDING:${form.adminEmail}`);
                  } else {
                    warnings.push(`INVITE_PENDING:${form.adminEmail}`);
                  }
                } else if (invBody.emailError) {
                  warnings.push(`INVITE_PENDING:${form.adminEmail}|${invBody.emailError}`);
                }
              }
            } catch (e) {
              warnings.push(`Erro de rede ao enviar convite: ${String(e)}`);
            }
          }

          // All real work done — now show the success checkmark
          setCreatingStep(CREATION_STEPS.length);
          if (warnings.length > 0) setCreationWarnings(warnings);
          localStorage.removeItem(DRAFT_KEY);
          const hasPendingInvite = warnings.some(w => w.startsWith('INVITE_PENDING:'));
          // Don't auto-redirect when invite failed — user must click to proceed
          if (!hasPendingInvite) setTimeout(() => navigate('/admin/portais'), warnings.length > 0 ? 3000 : 1800);
        }, 900);
      }
    }
    setTimeout(advance, 900);
  }

  return (
    <div className="page novo-portal-page">
      <div className="np-header">
        <span className="np-header__title">
          {isAddingSite ? `Adicionar site — ${locationState?.empresaNome}` : 'Novo Portal'}
        </span>
      </div>

      <Stepper steps={steps} current={step} />

      <div className="np-card">
        {currentLabel === 'Identificação' && (
          <StepIdentificacao
            nome={form.nome}
            nomeFantasia={form.nomeFantasia}
            url={form.url}
            cnpj={form.cnpj}
            cvmCode={form.cvmCode}
            autoCvm={form.autoCvm}
            tipoSite={form.tipoSite}
            onNome={(v) => setForm((f) => {
              const derivedFromCurrent = f.nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
              const autoSync = f.url === '' || f.url === derivedFromCurrent;
              const newSlug = v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
              return { ...f, nome: v, url: autoSync ? newSlug : f.url };
            })}
            onNomeFantasia={(v) => setForm((f) => ({ ...f, nomeFantasia: v }))}
            onCnpj={(v) => setForm((f) => ({ ...f, cnpj: v }))}
            onCvmCode={(v) => setForm((f) => ({ ...f, cvmCode: v }))}
            onAutoCvm={(v) => setForm((f) => ({ ...f, autoCvm: v }))}
            onTipoSite={(v) => setForm((f) => ({ ...f, tipoSite: v }))}
          />
        )}
        {currentLabel === 'Tipo' && (
          <StepTipo value={form.tipo} onChange={(v) => setForm((f) => ({ ...f, tipo: v, canais: defaultCanaisForTipo(v) }))} />
        )}
        {currentLabel === 'Canais' && (
          <StepCanais tipo={form.tipo} value={form.canais} onChange={(v) => setForm((f) => ({ ...f, canais: v }))} />
        )}
        {currentLabel === 'Fonte' && (
          <StepFonte
            role={fonteFase}
            value={fonteFase === 'titulo' ? form.fonteTitulo : form.fonteTexto}
            onChange={(v) => setForm((f) => ({ ...f, [fonteFase === 'titulo' ? 'fonteTitulo' : 'fonteTexto']: v }))}
            customFontFile={form.customFontFile}
            customFontName={form.customFontName}
            onCustomFont={(file, name) => setForm((f) => ({ ...f, customFontFile: file, customFontName: name }))}
          />
        )}
        {currentLabel === 'Cores' && (
          <StepCores
            primaria={form.corPrimaria}
            secundaria={form.corSecundaria}
            terciaria={form.corTerciaria}
            onPrimaria={(v) => setForm((f) => ({ ...f, corPrimaria: v }))}
            onSecundaria={(v) => setForm((f) => ({ ...f, corSecundaria: v }))}
            onTerciaria={(v) => setForm((f) => ({ ...f, corTerciaria: v }))}
          />
        )}
        {currentLabel === 'Identidade' && (
          <StepIdentidade
            logoPreview={form.logoPreview}
            faviconPreview={form.faviconPreview}
            onLogo={(file, preview) => setForm((f) => ({ ...f, logoFile: file, logoPreview: preview }))}
            onFavicon={(file, preview) => setForm((f) => ({ ...f, faviconFile: file, faviconPreview: preview }))}
          />
        )}
        {currentLabel === 'Ticker' && (
          <StepTicker
            tickerType={form.tickerType}
            tickerSymbol={form.tickerSymbol}
            tickerEmbedCode={form.tickerEmbedCode}
            onType={(v) => setForm((f) => ({ ...f, tickerType: v }))}
            onSymbol={(v) => setForm((f) => ({ ...f, tickerSymbol: v }))}
            onEmbedCode={(v) => setForm((f) => ({ ...f, tickerEmbedCode: v }))}
          />
        )}
        {currentLabel === 'Idioma' && (
          <StepIdioma
            idiomas={form.idiomas}
            onIdiomas={(v) => setForm((f) => ({ ...f, idiomas: v }))}
          />
        )}
        {currentLabel === 'SEO' && (
          <StepSeo
            metaTitulo={form.metaTitulo}
            metaDescricao={form.metaDescricao}
            analyticsId={form.analyticsId}
            clarityId={form.clarityId}
            onMetaTitulo={(v) => setForm((f) => ({ ...f, metaTitulo: v }))}
            onMetaDescricao={(v) => setForm((f) => ({ ...f, metaDescricao: v }))}
            onAnalyticsId={(v) => setForm((f) => ({ ...f, analyticsId: v }))}
            onClarityId={(v) => setForm((f) => ({ ...f, clarityId: v }))}
          />
        )}
        {currentLabel === 'Email' && (
          <StepEmail value={form.emailContato} onChange={(v) => setForm((f) => ({ ...f, emailContato: v }))} />
        )}
        {currentLabel === 'Admin' && (
          <StepAdmin
            nome={form.adminNome}
            email={form.adminEmail}
            onNome={(v) => setForm((f) => ({ ...f, adminNome: v }))}
            onEmail={(v) => setForm((f) => ({ ...f, adminEmail: v }))}
          />
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
          ) : (
            <button className="np-btn np-btn--cancel" type="button" onClick={() => navigate('/admin/portais')}>
              Cancelar
            </button>
          )}

          {step < steps.length ? (
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
            <button
              className="np-btn np-btn--primary"
              type="button"
              onClick={handleSubmit}
              disabled={!canProceed()}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Criar Portal
            </button>
          )}
        </div>
      </div>

      {creating && (
        <div className="np-creating-overlay">
          <div className="np-creating-card">
            <div className="np-creating-card__top">
              <p className="np-creating-card__eyebrow">Workr Lite</p>
              <h3 className="np-creating-card__title">
                {creatingStep < CREATION_STEPS.length ? 'Criando portal…' : 'Portal criado!'}
              </h3>
              <p className="np-creating-card__subtitle">
                {creatingStep < CREATION_STEPS.length
                  ? 'Aguarde enquanto configuramos seu ambiente.'
                  : 'O e-mail de boas-vindas será enviado ao administrador.'}
              </p>
            </div>
            <ul className="np-creating-steps">
              {CREATION_STEPS.map((s, i) => {
                const done = i < creatingStep;
                const active = i === creatingStep;
                return (
                  <li key={i} className={`np-cs-item${done ? ' np-cs-item--done' : active ? ' np-cs-item--active' : ' np-cs-item--pending'}`}>
                    <span className="np-cs-item__indicator">
                      {done ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : active ? (
                        <span className="np-cs-spinner" />
                      ) : (
                        <span className="np-cs-item__num">{i + 1}</span>
                      )}
                    </span>
                    <span className="np-cs-item__text">
                      <span className="np-cs-item__label">{s.label}</span>
                      {(done || active) && <span className="np-cs-item__desc">{s.desc}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
            {creatingStep >= CREATION_STEPS.length && (
              <div className="np-creating-card__done">
                <svg className="np-creating-card__done-icon" viewBox="0 0 52 52" fill="none">
                  <circle className="invite-success__circle" cx="26" cy="26" r="23" stroke="currentColor" strokeWidth="2" fill="none" />
                  <polyline className="invite-success__check" points="14,26 22,34 38,18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
                {creationWarnings.length > 0 && (
                  <ul className="np-creation-warnings">
                    {creationWarnings.map((w, i) => {
                      if (w.startsWith('INVITE_PENDING:')) {
                        const [email, ...errParts] = w.replace('INVITE_PENDING:', '').split('|');
                        const errDetail = errParts.join('|');
                        return (
                          <li key={i} className="np-creation-warning np-creation-warning--invite">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                            <div>
                              <strong>Convite não enviado para {email}</strong>
                              <br />
                              <span style={{ fontSize: '12px' }}>Falha no envio do e-mail de convite. Reenvie pelo Painel de Controle.</span>
                              {errDetail && (
                                <details style={{ marginTop: '4px' }}>
                                  <summary style={{ fontSize: '11px', color: '#92400e', cursor: 'pointer' }}>Ver erro técnico</summary>
                                  <code style={{ fontSize: '11px', display: 'block', marginTop: '4px', wordBreak: 'break-all' }}>{errDetail}</code>
                                </details>
                              )}
                              <br />
                              {createdSiteId && (
                                <button
                                  className="btn-primary"
                                  type="button"
                                  style={{ marginTop: '10px', fontSize: '13px' }}
                                  onClick={() => navigate(`/admin/portais/${createdSiteId}/painel`)}
                                >
                                  Ir para o Painel de Controle
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      }
                      return (
                        <li key={i} className="np-creation-warning">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                          </svg>
                          {w}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
