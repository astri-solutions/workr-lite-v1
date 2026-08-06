import { useState, useRef, useEffect } from 'react';
import { processImage } from '../../utils/imageProcessor';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import LangTabs from '../../components/LangTabs';
import DatePicker from '../../components/DatePicker';
import { useCanaisDestinos, type Destino } from '../../hooks/useCanaisDestinos';
import { persistMateria, syncMateriaToSupabase, activatePageInSupabase, type MateriaPageType, type StoredMateria } from '../../hooks/useMateriasStore';
import { useAuth } from '../../contexts/AuthContext';
import { resolvePortalId } from '../../lib/portalDb';
import { fetchPortalConfig } from '../../lib/portalConfigApi';
import { usePublish } from '../../contexts/PublishContext';
import PublishButton from '../../components/PublishButton';
import ColorPickerPopover from '../../components/ColorPickerPopover';
import MediaPicker from '../../components/MediaPicker';
import PORTAL_CONFIG, { LocaleCode } from '../../portalConfig';
import '../admin/AdminPages.css';
import './NovaMateriaPage.css';

type SectionType = 'text' | 'image-text' | 'text-image' | 'bg-image' | 'two-col' | 'three-col' | 'image' | 'image-full' | 'galeria' | 'timeline'
  | 'kpis' | 'accordion' | 'tabs' | 'pessoas';
type PublishStatus = 'draft' | 'published' | 'scheduled';

interface GaleriaCard {
  id: string;
  titulo: string;
  descricao: string;
  data: string;
  link: string;
  imageUrl: string | null;
}

interface TimelineItem {
  id: string;
  ano: string;
  titulo: string;
  descricao: string;
  imageUrl: string | null;
}

/** Destaque numérico ("R$ 2,4 bi", "+18%") — o site anima a contagem. */
interface KpiItem { id: string; valor: string; rotulo: string; variacao: string }
interface AccordionItem { id: string; pergunta: string; resposta: string }
interface TabItem { id: string; titulo: string; html: string }
interface PessoaItem { id: string; nome: string; cargo: string; bio: string; imageUrl: string | null }

// Per-locale rich text — `string` is only the legacy shape (every matéria
// saved before locales were tracked here), migrated to the primary locale's
// key the first time that field is edited in any locale. Fall back to the
// primary locale so a language nobody has translated yet still shows
// something instead of a blank block.
type LocalizedHtml = Partial<Record<LocaleCode, string>>;

function htmlFor(field: string | LocalizedHtml | undefined, locale: LocaleCode, primaryLocale: LocaleCode): string {
  if (field == null) return '';
  if (typeof field === 'string') return field;
  return field[locale] ?? field[primaryLocale] ?? '';
}

function withLocalizedHtml(field: string | LocalizedHtml | undefined, locale: LocaleCode, primaryLocale: LocaleCode, value: string): LocalizedHtml {
  const base: LocalizedHtml = field == null ? {} : typeof field === 'string' ? { [primaryLocale]: field } : { ...field };
  return { ...base, [locale]: value };
}

// Per-locale section image — same idea as LocalizedHtml above. Uploading an
// image the first time sets it only under the locale it was uploaded in
// (usually the primary locale); every other locale that hasn't uploaded its
// own falls back to that one, so a portal with 3 languages doesn't force 3
// separate uploads for the same picture. Uploading again from a *different*
// locale tab overrides just that locale, leaving the others (and the
// fallback for any locale still untouched) alone.
type LocalizedImage = Partial<Record<LocaleCode, string>>;

function imageFor(field: string | LocalizedImage | null | undefined, locale: LocaleCode, primaryLocale: LocaleCode): string | null {
  if (field == null) return null;
  if (typeof field === 'string') return field;
  return field[locale] ?? field[primaryLocale] ?? null;
}

function withLocalizedImage(field: string | LocalizedImage | null | undefined, locale: LocaleCode, primaryLocale: LocaleCode, value: string | null): LocalizedImage {
  const base: LocalizedImage = field == null ? {} : typeof field === 'string' ? { [primaryLocale]: field } : { ...field };
  if (value == null) delete base[locale];
  else base[locale] = value;
  return base;
}

// True once this locale has its own uploaded image, distinct from the
// fallback it would otherwise inherit — drives the "imagem compartilhada"
// hint so authors understand why replacing it here doesn't touch other tabs.
function isImageOverridden(field: string | LocalizedImage | null | undefined, locale: LocaleCode): boolean {
  return typeof field === 'object' && field != null && locale in field;
}

interface ContentSection {
  id: string;
  type: SectionType;
  cards?: GaleriaCard[];
  // 'text', 'image-text', 'bg-image' primary text; 'two-col'/'three-col' col 1
  html?: string | LocalizedHtml;
  html2?: string | LocalizedHtml; // 'two-col'/'three-col' col 2
  html3?: string | LocalizedHtml; // 'three-col' col 3
  imageUrl?: string | LocalizedImage | null; // 'image-text', 'bg-image', 'image', 'image-full'
  imageAlt?: string;
  timelineItems?: TimelineItem[]; // 'timeline'
  timelineOrientation?: 'vertical' | 'horizontal'; // 'timeline'
  /** Cores opcionais da seção. Vazio/ausente = herda o tema do portal. */
  bgColor?: string;
  textColor?: string;
  kpiItems?: KpiItem[]; // 'kpis'
  accordionItems?: AccordionItem[]; // 'accordion'
  tabItems?: TabItem[]; // 'tabs'
  pessoaItems?: PessoaItem[]; // 'pessoas'
}

type SectionCategory = 'texto' | 'layout' | 'midia' | 'dados' | 'institucional';

const SECTION_DEFS: { type: SectionType; label: string; desc: string; cat: SectionCategory; thumb: React.ReactNode }[] = [
  {
    type: 'text',
    label: 'Bloco de texto',
    desc: 'Título e parágrafos com formatação rica e multilíngue.',
    cat: 'texto',
    thumb: (
      <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="nm-thumb-svg">
        <rect width="160" height="100" rx="6" fill="#F4F4F4"/>
        <rect x="16" y="18" width="80" height="8" rx="3" fill="#0B5B68" opacity="0.85"/>
        <rect x="16" y="34" width="128" height="5" rx="2.5" fill="#B8B8B8"/>
        <rect x="16" y="44" width="118" height="5" rx="2.5" fill="#B8B8B8"/>
        <rect x="16" y="54" width="124" height="5" rx="2.5" fill="#B8B8B8"/>
        <rect x="16" y="64" width="96" height="5" rx="2.5" fill="#B8B8B8"/>
        <rect x="16" y="78" width="52" height="12" rx="4" fill="#0B5B68" opacity="0.2"/>
      </svg>
    ),
  },
  {
    type: 'image-text',
    label: 'Imagem + Texto',
    desc: 'Imagem à esquerda com texto e parágrafo à direita.',
    cat: 'layout',
    thumb: (
      <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="nm-thumb-svg">
        <rect width="160" height="100" rx="6" fill="#F4F4F4"/>
        <rect x="12" y="16" width="58" height="68" rx="5" fill="#C8DFE2"/>
        <line x1="29" y1="42" x2="52" y2="58" stroke="#0B5B68" strokeWidth="1.5" opacity="0.4"/>
        <circle cx="34" cy="34" r="6" fill="#0B5B68" opacity="0.25"/>
        <rect x="80" y="22" width="68" height="7" rx="3" fill="#0B5B68" opacity="0.8"/>
        <rect x="80" y="36" width="68" height="4.5" rx="2" fill="#B8B8B8"/>
        <rect x="80" y="45" width="58" height="4.5" rx="2" fill="#B8B8B8"/>
        <rect x="80" y="54" width="62" height="4.5" rx="2" fill="#B8B8B8"/>
        <rect x="80" y="63" width="50" height="4.5" rx="2" fill="#B8B8B8"/>
      </svg>
    ),
  },
  {
    type: 'text-image',
    label: 'Texto + Imagem',
    desc: 'Texto à esquerda com imagem à direita — o inverso do modelo acima.',
    cat: 'layout',
    thumb: (
      <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="nm-thumb-svg">
        <rect width="160" height="100" rx="6" fill="#F4F4F4"/>
        <rect x="12" y="22" width="68" height="7" rx="3" fill="#0B5B68" opacity="0.8"/>
        <rect x="12" y="36" width="68" height="4.5" rx="2" fill="#B8B8B8"/>
        <rect x="12" y="45" width="58" height="4.5" rx="2" fill="#B8B8B8"/>
        <rect x="12" y="54" width="62" height="4.5" rx="2" fill="#B8B8B8"/>
        <rect x="12" y="63" width="50" height="4.5" rx="2" fill="#B8B8B8"/>
        <rect x="90" y="16" width="58" height="68" rx="5" fill="#C8DFE2"/>
        <line x1="107" y1="42" x2="130" y2="58" stroke="#0B5B68" strokeWidth="1.5" opacity="0.4"/>
        <circle cx="112" cy="34" r="6" fill="#0B5B68" opacity="0.25"/>
      </svg>
    ),
  },
  {
    type: 'bg-image',
    label: 'Fundo com texto',
    desc: 'Imagem de fundo com sobreposição escurecida e texto centrado.',
    cat: 'midia',
    thumb: (
      <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="nm-thumb-svg">
        <rect width="160" height="100" rx="6" fill="#C8DFE2"/>
        <rect width="160" height="100" rx="6" fill="#0B5B68" opacity="0.55"/>
        <rect x="30" y="30" width="100" height="9" rx="4" fill="white" opacity="0.9"/>
        <rect x="45" y="46" width="70" height="5" rx="2.5" fill="white" opacity="0.6"/>
        <rect x="52" y="56" width="56" height="5" rx="2.5" fill="white" opacity="0.5"/>
        <rect x="55" y="70" width="50" height="12" rx="4" fill="white" opacity="0.2"/>
      </svg>
    ),
  },
  {
    type: 'two-col',
    label: 'Duas colunas',
    desc: 'Dois blocos de conteúdo independentes lado a lado.',
    cat: 'layout',
    thumb: (
      <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="nm-thumb-svg">
        <rect width="160" height="100" rx="6" fill="#F4F4F4"/>
        <rect x="12" y="16" width="62" height="68" rx="5" fill="white" stroke="#D8D8D8" strokeWidth="1"/>
        <rect x="22" y="26" width="42" height="6" rx="2.5" fill="#0B5B68" opacity="0.7"/>
        <rect x="22" y="38" width="42" height="4" rx="2" fill="#B8B8B8"/>
        <rect x="22" y="47" width="36" height="4" rx="2" fill="#B8B8B8"/>
        <rect x="22" y="56" width="40" height="4" rx="2" fill="#B8B8B8"/>
        <rect x="86" y="16" width="62" height="68" rx="5" fill="white" stroke="#D8D8D8" strokeWidth="1"/>
        <rect x="96" y="26" width="42" height="6" rx="2.5" fill="#0B5B68" opacity="0.7"/>
        <rect x="96" y="38" width="42" height="4" rx="2" fill="#B8B8B8"/>
        <rect x="96" y="47" width="36" height="4" rx="2" fill="#B8B8B8"/>
        <rect x="96" y="56" width="40" height="4" rx="2" fill="#B8B8B8"/>
      </svg>
    ),
  },
  {
    type: 'three-col',
    label: 'Três colunas',
    desc: 'Três blocos de conteúdo alinhados horizontalmente.',
    cat: 'layout',
    thumb: (
      <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="nm-thumb-svg">
        <rect width="160" height="100" rx="6" fill="#F4F4F4"/>
        <rect x="8" y="16" width="42" height="68" rx="5" fill="white" stroke="#D8D8D8" strokeWidth="1"/>
        <rect x="15" y="24" width="28" height="5" rx="2" fill="#0B5B68" opacity="0.7"/>
        <rect x="15" y="34" width="28" height="3.5" rx="1.5" fill="#B8B8B8"/>
        <rect x="15" y="42" width="22" height="3.5" rx="1.5" fill="#B8B8B8"/>
        <rect x="59" y="16" width="42" height="68" rx="5" fill="white" stroke="#D8D8D8" strokeWidth="1"/>
        <rect x="66" y="24" width="28" height="5" rx="2" fill="#0B5B68" opacity="0.7"/>
        <rect x="66" y="34" width="28" height="3.5" rx="1.5" fill="#B8B8B8"/>
        <rect x="66" y="42" width="22" height="3.5" rx="1.5" fill="#B8B8B8"/>
        <rect x="110" y="16" width="42" height="68" rx="5" fill="white" stroke="#D8D8D8" strokeWidth="1"/>
        <rect x="117" y="24" width="28" height="5" rx="2" fill="#0B5B68" opacity="0.7"/>
        <rect x="117" y="34" width="28" height="3.5" rx="1.5" fill="#B8B8B8"/>
        <rect x="117" y="42" width="22" height="3.5" rx="1.5" fill="#B8B8B8"/>
      </svg>
    ),
  },
  {
    type: 'image',
    label: 'Imagem',
    desc: 'Imagem centralizada dentro do container de conteúdo.',
    cat: 'midia',
    thumb: (
      <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="nm-thumb-svg">
        <rect width="160" height="100" rx="6" fill="#F4F4F4"/>
        <rect x="24" y="14" width="112" height="72" rx="6" fill="#C8DFE2"/>
        <line x1="50" y1="55" x2="80" y2="70" stroke="#0B5B68" strokeWidth="1.5" opacity="0.45"/>
        <line x1="80" y1="70" x2="110" y2="45" stroke="#0B5B68" strokeWidth="1.5" opacity="0.45"/>
        <circle cx="50" cy="38" r="8" fill="#0B5B68" opacity="0.25"/>
      </svg>
    ),
  },
  {
    type: 'image-full',
    label: 'Imagem full width',
    desc: 'Imagem de borda a borda, sem margens laterais.',
    cat: 'midia',
    thumb: (
      <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="nm-thumb-svg">
        <rect width="160" height="100" rx="6" fill="#C8DFE2"/>
        <line x1="20" y1="65" x2="70" y2="45" stroke="#0B5B68" strokeWidth="2" opacity="0.4"/>
        <line x1="70" y1="45" x2="120" y2="68" stroke="#0B5B68" strokeWidth="2" opacity="0.4"/>
        <circle cx="28" cy="28" r="10" fill="#0B5B68" opacity="0.2"/>
        <rect x="0" y="78" width="160" height="22" rx="0" fill="#0B5B68" opacity="0.08"/>
      </svg>
    ),
  },
  {
    type: 'galeria',
    label: 'Galeria de cards',
    desc: 'Grade de cards com título, imagem, descrição e link.',
    cat: 'layout',
    thumb: (
      <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="nm-thumb-svg">
        <rect width="160" height="100" rx="6" fill="#F4F4F4"/>
        {[0,1,2].map(i => (
          <g key={i} transform={`translate(${10 + i * 50}, 12)`}>
            <rect width="40" height="76" rx="5" fill="white" stroke="#D8D8D8" strokeWidth="1"/>
            <rect x="4" y="4" width="32" height="28" rx="3" fill="#C8DFE2"/>
            <rect x="5" y="38" width="28" height="5" rx="2" fill="#0B5B68" opacity="0.65"/>
            <rect x="5" y="48" width="24" height="3.5" rx="1.5" fill="#B8B8B8"/>
            <rect x="5" y="55" width="20" height="3.5" rx="1.5" fill="#B8B8B8"/>
          </g>
        ))}
      </svg>
    ),
  },
  {
    type: 'kpis',
    label: 'Números / Indicadores',
    desc: 'Destaques numéricos com rótulo e variação — a contagem anima no site.',
    cat: 'dados',
    thumb: (
      <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="nm-thumb-svg">
        <rect width="160" height="100" rx="6" fill="#F4F4F4"/>
        {[0, 1, 2].map(i => (
          <g key={i} transform={`translate(${10 + i * 50}, 26)`}>
            <rect width="40" height="48" rx="5" fill="white" stroke="#D8D8D8" strokeWidth="1"/>
            <rect x="7" y="10" width="26" height="11" rx="3" fill="#0B5B68" opacity="0.75"/>
            <rect x="9" y="27" width="22" height="4" rx="2" fill="#B8B8B8"/>
            <rect x="13" y="36" width="14" height="4" rx="2" fill="#00D865" opacity="0.7"/>
          </g>
        ))}
      </svg>
    ),
  },
  {
    type: 'accordion',
    label: 'Perguntas frequentes',
    desc: 'Lista sanfonada de pergunta e resposta, expandindo uma por vez.',
    cat: 'texto',
    thumb: (
      <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="nm-thumb-svg">
        <rect width="160" height="100" rx="6" fill="#F4F4F4"/>
        <rect x="12" y="12" width="136" height="16" rx="4" fill="white" stroke="#D8D8D8" strokeWidth="1"/>
        <rect x="20" y="18" width="60" height="4" rx="2" fill="#0B5B68" opacity="0.7"/>
        <polyline points="134,19 138,23 142,19" stroke="#949494" strokeWidth="1.5" fill="none"/>
        <rect x="12" y="32" width="136" height="34" rx="4" fill="white" stroke="#0B5B68" strokeWidth="1" opacity="0.9"/>
        <rect x="20" y="38" width="70" height="4" rx="2" fill="#0B5B68" opacity="0.7"/>
        <rect x="20" y="49" width="118" height="3.5" rx="1.75" fill="#B8B8B8"/>
        <rect x="20" y="57" width="96" height="3.5" rx="1.75" fill="#B8B8B8"/>
        <rect x="12" y="70" width="136" height="16" rx="4" fill="white" stroke="#D8D8D8" strokeWidth="1"/>
        <rect x="20" y="76" width="52" height="4" rx="2" fill="#0B5B68" opacity="0.7"/>
      </svg>
    ),
  },
  {
    type: 'tabs',
    label: 'Abas',
    desc: 'Vários conteúdos no mesmo espaço, alternados por abas.',
    cat: 'layout',
    thumb: (
      <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="nm-thumb-svg">
        <rect width="160" height="100" rx="6" fill="#F4F4F4"/>
        <rect x="12" y="14" width="42" height="14" rx="4" fill="#0B5B68" opacity="0.85"/>
        <rect x="58" y="14" width="42" height="14" rx="4" fill="#E4E9ED"/>
        <rect x="104" y="14" width="42" height="14" rx="4" fill="#E4E9ED"/>
        <rect x="12" y="34" width="134" height="52" rx="5" fill="white" stroke="#D8D8D8" strokeWidth="1"/>
        <rect x="22" y="44" width="70" height="5" rx="2.5" fill="#0B5B68" opacity="0.6"/>
        <rect x="22" y="56" width="112" height="4" rx="2" fill="#B8B8B8"/>
        <rect x="22" y="65" width="100" height="4" rx="2" fill="#B8B8B8"/>
        <rect x="22" y="74" width="80" height="4" rx="2" fill="#B8B8B8"/>
      </svg>
    ),
  },
  {
    type: 'pessoas',
    label: 'Pessoas',
    desc: 'Cards de diretoria e conselho com foto, cargo e mini-bio.',
    cat: 'institucional',
    thumb: (
      <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="nm-thumb-svg">
        <rect width="160" height="100" rx="6" fill="#F4F4F4"/>
        {[0, 1, 2].map(i => (
          <g key={i} transform={`translate(${12 + i * 46}, 14)`}>
            <rect width="38" height="72" rx="5" fill="white" stroke="#D8D8D8" strokeWidth="1"/>
            <circle cx="19" cy="24" r="11" fill="#C8DFE2"/>
            <circle cx="19" cy="20" r="4" fill="#0B5B68" opacity="0.35"/>
            <path d="M11 30a8 8 0 0 1 16 0z" fill="#0B5B68" opacity="0.35"/>
            <rect x="7" y="43" width="24" height="4.5" rx="2" fill="#0B5B68" opacity="0.7"/>
            <rect x="10" y="52" width="18" height="3.5" rx="1.75" fill="#B8B8B8"/>
            <rect x="7" y="61" width="24" height="3" rx="1.5" fill="#E4E9ED"/>
          </g>
        ))}
      </svg>
    ),
  },
  {
    type: 'timeline',
    label: 'Linha do tempo',
    desc: 'Marcos por ano com título, descrição e imagem — vertical ou horizontal.',
    cat: 'institucional',
    thumb: (
      <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="nm-thumb-svg">
        <rect width="160" height="100" rx="6" fill="#F4F4F4"/>
        <line x1="80" y1="12" x2="80" y2="88" stroke="#0B5B68" strokeWidth="2" opacity="0.35"/>
        {[24, 50, 76].map((y, i) => (
          <g key={i}>
            <circle cx="80" cy={y} r="4" fill="#0B5B68" opacity="0.8"/>
            {i % 2 === 0 ? (
              <rect x="20" y={y - 6} width="48" height="12" rx="3" fill="#C8DFE2"/>
            ) : (
              <rect x="92" y={y - 6} width="48" height="12" rx="3" fill="#C8DFE2"/>
            )}
          </g>
        ))}
      </svg>
    ),
  },
];

const SECTION_LABEL: Record<SectionType, string> = {
  text: 'Bloco de texto',
  'image-text': 'Imagem + Texto',
  'text-image': 'Texto + Imagem',
  'bg-image': 'Fundo com texto',
  timeline: 'Linha do tempo',
  kpis: 'Números / Indicadores',
  accordion: 'Perguntas frequentes',
  tabs: 'Abas',
  pessoas: 'Pessoas',
  'two-col': 'Duas colunas',
  'three-col': 'Três colunas',
  image: 'Imagem',
  'image-full': 'Imagem full width',
  galeria: 'Galeria',
};



/* ── Rich text editor ─────────────────────────────────────── */
// contentEditable is inherently uncontrolled (re-writing innerHTML on every
// keystroke would reset the caret), so the DOM only gets the `value` prop
// once, on mount — after that, every edit calls `onChange` with the latest
// innerHTML and the parent (SectionEditor's `sections` state) becomes the
// source of truth, which is what actually reaches persistMateria() now.
function RichTextEditor({ value, onChange, placeholder = 'Escreva aqui...' }: { value: string; onChange: (html: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = useState((value ?? '').replace(/<[^>]+>/g, '').trim() === '');
  // Cor por trecho selecionado (independente da cor padrão da seção, definida
  // no swatch "Texto" do cabeçalho) — o range é salvo no mousedown do botão,
  // antes que o clique tire o foco do contentEditable e colapse a seleção.
  const savedRangeRef = useRef<Range | null>(null);
  const [lastTextColor, setLastTextColor] = useState('#141414');

  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && ref.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function applyTextColor(hex: string) {
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
    ref.current?.focus();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, hex);
    setLastTextColor(hex);
    syncEmpty();
    onChange(ref.current?.innerHTML ?? '');
  }

  function resetTextColor() {
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
    ref.current?.focus();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, 'inherit');
    onChange(ref.current?.innerHTML ?? '');
  }

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = value ?? '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount only — see comment above

  function exec(cmd: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    syncEmpty();
    onChange(ref.current?.innerHTML ?? '');
  }

  function syncEmpty() {
    setEmpty((ref.current?.innerText ?? '').trim() === '');
  }

  function handleInput() {
    syncEmpty();
    onChange(ref.current?.innerHTML ?? '');
  }

  function md(e: React.MouseEvent, cmd: string, arg?: string) {
    e.preventDefault();
    exec(cmd, arg);
  }

  function handleBlockFormat(val: string) {
    ref.current?.focus();
    document.execCommand('formatBlock', false, val);
    onChange(ref.current?.innerHTML ?? '');
  }

  function handleLink(e: React.MouseEvent) {
    e.preventDefault();
    ref.current?.focus();
    const url = window.prompt('URL do link:');
    if (url) exec('createLink', url);
  }

  // Pasting into a contentEditable, by default, inserts the clipboard's
  // text/html — carrying over the source's own fonts/colors/inline styles
  // (Word, Google Docs, another site). Those inline styles then win over
  // this block's own Fundo/Texto colors and the portal's fonts, so the
  // matéria text stops looking like it belongs to the rest of the page.
  // Force plain text instead: the block's own formatting (toolbar above,
  // Fundo/Texto swatches) is the only styling that should ever apply here.
  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    handleInput();
  }

  return (
    <div className="rte">
      {/* Row 1 */}
      <div className="rte-toolbar">
        <select className="rte-format" defaultValue="p" onChange={(e) => handleBlockFormat(e.target.value)}>
          <option value="p">Parágrafo</option>
          {/* No h1 on purpose — the page's own name (rendered in the header
              banner) is the single h1 of every page, so content headings
              start at h2 to keep one h1 per document. */}
          <option value="h2">Título 2</option>
          <option value="h3">Título 3</option>
          <option value="h4">Título 4</option>
          <option value="blockquote">Citação</option>
          <option value="pre">Código</option>
        </select>

        <div className="rte-sep" />

        <button type="button" className="rte-btn rte-btn--bold" title="Negrito" onMouseDown={(e) => md(e, 'bold')}>B</button>
        <button type="button" className="rte-btn rte-btn--italic" title="Itálico" onMouseDown={(e) => md(e, 'italic')}>I</button>
        <button type="button" className="rte-btn rte-btn--underline" title="Sublinhado" onMouseDown={(e) => md(e, 'underline')}>U</button>
        <button type="button" className="rte-btn rte-btn--strike" title="Tachado" onMouseDown={(e) => md(e, 'strikeThrough')}>S</button>

        <div className="rte-sep" />

        {/* Cor do texto — aplica só ao trecho selecionado, não à seção
            inteira (essa é a função do swatch "Texto" no cabeçalho). Sem
            seleção nenhuma cor é aplicada, mantendo o padrão do tema. */}
        <div className="rte-textcolor" onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}>
          <ColorPickerPopover
            value={lastTextColor}
            onChange={applyTextColor}
            size={18}
            title="Cor do texto selecionado"
          />
        </div>
        <button
          type="button"
          className="rte-btn"
          title="Remover cor do trecho selecionado (volta ao padrão da seção)"
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); resetTextColor(); }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>format_color_reset</span>
        </button>

        <div className="rte-sep" />

        {/* Alignment */}
        <button type="button" className="rte-btn" title="Alinhar à esquerda" onMouseDown={(e) => md(e, 'justifyLeft')}>
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>format_align_left</span>
        </button>
        <button type="button" className="rte-btn" title="Centralizar" onMouseDown={(e) => md(e, 'justifyCenter')}>
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>format_align_center</span>
        </button>
        <button type="button" className="rte-btn" title="Alinhar à direita" onMouseDown={(e) => md(e, 'justifyRight')}>
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>format_align_right</span>
        </button>
        <button type="button" className="rte-btn" title="Justificar" onMouseDown={(e) => md(e, 'justifyFull')}>
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>format_align_justify</span>
        </button>

        <div className="rte-sep" />

        {/* Lists */}
        <button type="button" className="rte-btn" title="Lista" onMouseDown={(e) => md(e, 'insertUnorderedList')}>
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>format_list_bulleted</span>
        </button>
        <button type="button" className="rte-btn" title="Lista numerada" onMouseDown={(e) => md(e, 'insertOrderedList')}>
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>format_list_numbered</span>
        </button>

        <div className="rte-sep" />

        {/* Indent */}
        <button type="button" className="rte-btn" title="Diminuir recuo" onMouseDown={(e) => md(e, 'outdent')}>
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>format_indent_decrease</span>
        </button>
        <button type="button" className="rte-btn" title="Aumentar recuo" onMouseDown={(e) => md(e, 'indent')}>
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>format_indent_increase</span>
        </button>

        <div className="rte-sep" />

        {/* Link */}
        <button type="button" className="rte-btn" title="Inserir link" onMouseDown={handleLink}>
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>link</span>
        </button>
        <button type="button" className="rte-btn" title="Remover link" onMouseDown={(e) => md(e, 'unlink')}>
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>link_off</span>
        </button>

        <div className="rte-sep" />

        {/* Undo / Redo */}
        <button type="button" className="rte-btn" title="Desfazer" onMouseDown={(e) => md(e, 'undo')}>
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>undo</span>
        </button>
        <button type="button" className="rte-btn" title="Refazer" onMouseDown={(e) => md(e, 'redo')}>
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>redo</span>
        </button>

        <div className="rte-sep" />

        {/* HR */}
        <button type="button" className="rte-btn" title="Linha horizontal" onMouseDown={(e) => md(e, 'insertHorizontalRule')}>
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>horizontal_rule</span>
        </button>

        {/* Remove formatting */}
        <button type="button" className="rte-btn" title="Remover formatação" onMouseDown={(e) => md(e, 'removeFormat')}>
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>format_clear</span>
        </button>
      </div>

      <div className="rte-body">
        {empty && <span className="rte-placeholder">{placeholder}</span>}
        <div
          ref={ref}
          className="rte-content"
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onFocus={() => setEmpty(false)}
          onBlur={handleInput}
          onPaste={handlePaste}
        />
      </div>
    </div>
  );
}

/* ── Image upload placeholder ─────────────────────────────── */
function ImageUpload({ label = 'Imagem', ratio = '16/9', value, onChange, portalDbId, sharedNote }: {
  label?: string; ratio?: string; value: string | null; onChange: (url: string | null) => void; portalDbId: string | null; sharedNote?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const result = await processImage(file, 'article-image');
      const url = await uploadMateriaImage(result.file, result.objectUrl, portalDbId, 'section-image');
      onChange(url);
    } finally { setUploading(false); }
  }

  return (
    <>
      <div
        className={`img-upload${value ? ' img-upload--filled' : ''}`}
        style={{ aspectRatio: ratio }}
        onClick={() => !value && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {value ? (
          <>
            <img src={value} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
            <button
              type="button"
              className="img-upload__change-btn"
              onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
              disabled={uploading}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
              {uploading ? 'Enviando…' : 'Alterar imagem'}
            </button>
            {sharedNote && <span className="img-upload__shared-note">{sharedNote}</span>}
          </>
        ) : (
          <>
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>image</span>
            <span className="img-upload__label">{label}</span>
            <button type="button" className="img-upload__btn" disabled={uploading} onClick={() => inputRef.current?.click()}>
              {uploading ? 'Enviando…' : 'Escolher arquivo'}
            </button>
            <button type="button" className="media-picker-trigger" onClick={e => { e.stopPropagation(); setPickerOpen(true); }}>
              ou escolher da Biblioteca
            </button>
          </>
        )}
      </div>
      {/* Rendered OUTSIDE the div above on purpose — Modal isn't a portal,
          so a picker nested inside that div's own onClick="open file
          dialog" handler would have every click inside the modal (picking
          an image) bubble up through React's tree and ALSO fire that
          handler, popping the native file picker right after selecting
          from the library. */}
      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={onChange} portalDbId={portalDbId} />
    </>
  );
}

/* ── Inline image editor (container-width image) ──────────── */
function ImageEditor({ value, alt, onChange, onAltChange, portalDbId, sharedNote }: {
  value: string | null; alt: string; onChange: (url: string | null) => void; onAltChange: (alt: string) => void; portalDbId: string | null; sharedNote?: string;
}) {
  const [file, setFile] = useState<{ name: string; url: string; w: number; h: number } | null>(
    value ? { name: '', url: value, w: 0, h: 0 } : null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // `value` can change from under us without a re-mount — switching to a
  // locale tab that still falls back to another locale's image (or has its
  // own override) resolves to a different URL. Only resync when it actually
  // diverges from what we already show, so the upload flow below (which
  // updates `file` optimistically with real width/height before `value`
  // catches up) doesn't get its dimensions clobbered by this effect.
  useEffect(() => {
    if (value !== (file?.url ?? null)) {
      setFile(value ? { name: '', url: value, w: 0, h: 0 } : null);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFile(f: File) {
    const result = await processImage(f, 'article-image');
    const img = new Image();
    img.onload = async () => {
      setFile({ name: result.file.name, url: result.objectUrl, w: img.naturalWidth, h: img.naturalHeight });
      const url = await uploadMateriaImage(result.file, result.objectUrl, portalDbId, 'section-image');
      onChange(url);
      setFile(prev => prev ? { ...prev, url } : prev);
    };
    img.src = result.objectUrl;
  }

  // Already a real, usable URL (from Biblioteca de Mídia) — no
  // processImage/upload round-trip needed, unlike a fresh file.
  function handlePicked(url: string) {
    setFile({ name: '', url, w: 0, h: 0 });
    onChange(url);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) handleFile(f);
  }

  if (!file) {
    return (
      <>
        <div
          className="img-editor-empty"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>image</span>
          <span>Clique ou arraste uma imagem</span>
          <button type="button" className="media-picker-trigger" onClick={e => { e.stopPropagation(); setPickerOpen(true); }}>
            ou escolher da Biblioteca
          </button>
        </div>
        {/* Outside the div above — Modal isn't a portal, so nesting the
            picker inside that div's own onClick="open file dialog" handler
            made every click inside the modal (picking an image) bubble up
            and ALSO fire that handler, popping the native file picker right
            after a library selection. */}
        <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handlePicked} portalDbId={portalDbId} />
      </>
    );
  }

  return (
    <div className="img-editor">
      <img className="img-editor__preview" src={file.url} alt={alt || file.name} />
      <div className="img-editor__body">
        <div className="img-editor__top">
          <div className="img-editor__info">
            <span className="img-editor__name">Image</span>
            <span className="img-editor__dims"> · {file.w}×{file.h}px</span>
          </div>
          <div className="img-editor__actions">
            <button type="button" className="img-editor__btn" title="Recortar">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>crop</span>
            </button>
            <button type="button" className="img-editor__btn" title="Redimensionar">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>photo_size_select_large</span>
            </button>
            <button
              type="button"
              className="img-editor__btn"
              title="Substituir"
              onClick={() => inputRef.current?.click()}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>cached</span>
            </button>
            <button
              type="button"
              className="img-editor__btn"
              title="Escolher da Biblioteca"
              onClick={() => setPickerOpen(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>perm_media</span>
            </button>
            <button
              type="button"
              className="img-editor__btn img-editor__btn--danger"
              title="Excluir"
              onClick={() => { setFile(null); onChange(null); }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>delete</span>
            </button>
          </div>
        </div>
        {sharedNote && <span className="img-editor__shared-note">{sharedNote}</span>}
        <div className="img-editor__alt-wrap">
          <label className="img-editor__alt-label">Alt text</label>
          <input
            className="img-editor__alt-input"
            type="text"
            placeholder="Short description for the visually impaired"
            value={alt}
            onChange={(e) => onAltChange(e.target.value)}
          />
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handlePicked} portalDbId={portalDbId} />
    </div>
  );
}

/* ── Galeria card editor ──────────────────────────────────── */
function newCard(): GaleriaCard {
  return { id: Math.random().toString(36).slice(2), titulo: '', descricao: '', data: '', link: '', imageUrl: null };
}

const SAMPLE_GALERIA_CARDS: GaleriaCard[] = [
  { id: 'g1', titulo: 'IMC reporta crescimento de 12% no EBITDA do 2T25', descricao: 'A IMC apresentou resultados acima das expectativas do mercado, com crescimento expressivo em todas as marcas do portfólio.', data: '2026-06-10', link: '/resultados/2t25', imageUrl: null },
  { id: 'g2', titulo: 'Calendário de eventos corporativos — 2º semestre 2026', descricao: 'Confira as datas de teleconferências, road shows e demais eventos para investidores no segundo semestre.', data: '2026-06-01', link: '/eventos/2s26', imageUrl: null },
  { id: 'g3', titulo: 'Convocação: Assembleia Geral Ordinária 2026', descricao: 'A IMC convoca seus acionistas para a Assembleia Geral Ordinária a ser realizada em 20 de junho de 2026.', data: '2026-05-28', link: '/governanca/ago2026', imageUrl: null },
  { id: 'g4', titulo: 'Nota ao mercado: aquisição estratégica no segmento de fast food', descricao: 'A companhia informa ao mercado a conclusão de aquisição de cadeia regional com 45 unidades, fortalecendo presença no Nordeste.', data: '2026-05-15', link: '', imageUrl: null },
  { id: 'g5', titulo: 'Resultados do 1T26: receita líquida cresce 18% a/a', descricao: 'Destaques do primeiro trimestre incluem expansão de margens e redução de alavancagem financeira.', data: '2026-05-08', link: '/resultados/1t26', imageUrl: null },
  { id: 'g6', titulo: 'IMC anuncia programa de recompra de ações', descricao: 'O Conselho de Administração aprovou programa de recompra de até 5% das ações em circulação pelo prazo de 18 meses.', data: '2026-04-22', link: '', imageUrl: null },
];

// Uploads the processed WebP straight to Storage and returns a real public
// URL — a blob: URL (from processImage's objectUrl) only lives as long as
// the tab does, so a card saved with one shows a broken image after reload
// or on the published site. Falls back to the ephemeral blob URL only if
// the portal id isn't resolved yet or the upload itself fails, so the user
// still sees a preview rather than nothing.
async function uploadMateriaImage(file: File, objectUrl: string, portalDbId: string | null, kind: string): Promise<string> {
  if (!portalDbId || !isSupabaseConfigured || !supabase) return objectUrl;
  try {
    const path = `${portalDbId}/materias/${kind}-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
    const { error } = await supabase.storage.from('portal-media').upload(path, file, { upsert: true, contentType: file.type || 'image/webp' });
    if (error) return objectUrl;
    // Every other upload point (Documentos, Logotipo/Favicon/Banner/Splash
    // at publish time) ends up registered in portal_media so Biblioteca de
    // Mídia can actually list it — matéria/gallery/timeline/pessoa images
    // uploaded here were the one gap: they landed in the same bucket but
    // never got a row, so they were invisible to that page. Best-effort,
    // non-blocking: a failed insert still leaves the image usable in the
    // matéria, it just won't show up in the library.
    supabase.from('portal_media').insert({
      id: crypto.randomUUID(),
      portal_id: portalDbId,
      name: file.name || `${kind}.webp`,
      type: 'image',
      size_bytes: file.size,
      file_path: path,
    }).then(({ error: insertError }) => {
      if (insertError) console.error('portal_media insert failed for matéria image', insertError);
    });
    return supabase.storage.from('portal-media').getPublicUrl(path).data.publicUrl;
  } catch {
    return objectUrl;
  }
}

/* Compact "escolher da Biblioteca" trigger — shared by every per-item image
   slot below (galeria card, ano da timeline, pessoa) so each one gets the
   same picker without repeating open-state/modal plumbing three times. */
function MediaPickerButton({ portalDbId, onSelect, icon = false }: { portalDbId: string | null; onSelect: (url: string) => void; icon?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {icon ? (
        <button type="button" className="btn-action btn-action--enter" title="Escolher da Biblioteca" onClick={() => setOpen(true)}>
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>perm_media</span>
        </button>
      ) : (
        <button type="button" className="media-picker-trigger" onClick={() => setOpen(true)}>
          ou escolher da Biblioteca
        </button>
      )}
      <MediaPicker open={open} onClose={() => setOpen(false)} onSelect={onSelect} portalDbId={portalDbId} />
    </>
  );
}

function GaleriaEditor({ cards, onChange, portalDbId }: { cards: GaleriaCard[]; onChange: (cards: GaleriaCard[]) => void; portalDbId: string | null }) {
  function update(id: string, patch: Partial<GaleriaCard>) {
    onChange(cards.map(c => c.id === id ? { ...c, ...patch } : c));
  }
  function remove(id: string) { onChange(cards.filter(c => c.id !== id)); }
  function add() { onChange([...cards, newCard()]); }
  function move(i: number, dir: -1 | 1) {
    const next = [...cards];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="galeria-editor">
      {cards.map((card, i) => (
        <div key={card.id} className="galeria-card-editor">
          <div className="galeria-card-editor__header">
            <span className="galeria-card-editor__num">Card {i + 1}</span>
            <div className="galeria-card-editor__order">
              <button type="button" className="ce-icon-btn" title="Mover para cima" disabled={i === 0} onClick={() => move(i, -1)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
              </button>
              <button type="button" className="ce-icon-btn" title="Mover para baixo" disabled={i === cards.length - 1} onClick={() => move(i, 1)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>
            <button type="button" className="sec-editor__del" onClick={() => remove(card.id)} title="Remover card">
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>delete</span>
            </button>
          </div>
          <div className="galeria-card-editor__fields">
            <div className="galeria-card-editor__col-img">
              {card.imageUrl ? (
                <div className="galeria-card-img-preview">
                  <img src={card.imageUrl} alt="" className="galeria-card-img-preview__img" />
                  <div className="galeria-card-img-preview__actions">
                    <label className="btn-action btn-action--enter galeria-img-label">
                      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>cached</span>
                      <input type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={async e => { const f = e.target.files?.[0]; if (f) { const r = await processImage(f, 'gallery-card'); const url = await uploadMateriaImage(r.file, r.objectUrl, portalDbId, 'gallery-card'); update(card.id, { imageUrl: url }); } }} />
                    </label>
                    <MediaPickerButton portalDbId={portalDbId} icon onSelect={url => update(card.id, { imageUrl: url })} />
                    <button type="button" className="btn-action btn-action--danger" onClick={() => update(card.id, { imageUrl: null })}>
                      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>delete</span>
                    </button>
                  </div>
                </div>
              ) : (
                <label className="galeria-card-img-empty galeria-img-label">
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={async e => { const f = e.target.files?.[0]; if (f) { const r = await processImage(f, 'gallery-card'); const url = await uploadMateriaImage(r.file, r.objectUrl, portalDbId, 'gallery-card'); update(card.id, { imageUrl: url }); } }} />
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>image</span>
                  <span>Imagem (opcional)</span>
                </label>
              )}
              {!card.imageUrl && (
                <MediaPickerButton portalDbId={portalDbId} onSelect={url => update(card.id, { imageUrl: url })} />
              )}
            </div>
            <div className="galeria-card-editor__col-fields">
              <input className="nm-field--sm" type="text" placeholder="Título" value={card.titulo}
                onChange={e => update(card.id, { titulo: e.target.value })} />
              <textarea className="nm-field--sm nm-textarea" rows={2} placeholder="Descrição" value={card.descricao}
                onChange={e => update(card.id, { descricao: e.target.value })} />
              <div className="galeria-card-editor__row2">
                <DatePicker placeholder="Data" value={card.data}
                  onChange={date => update(card.id, { data: date })} />
                <input className="nm-field--sm" type="text" placeholder="Link (ex: /pagina ou https://...)" value={card.link}
                  onChange={e => update(card.id, { link: e.target.value })} />
              </div>
              {card.link && !card.link.startsWith('http') && card.link.startsWith('/') && (
                <a className="galeria-card-inner-link" href={card.link} target="_blank" rel="noreferrer">
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>edit</span>
                  Editar conteúdo interno
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="galeria-add-card" onClick={add}>
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
        Adicionar card
      </button>
    </div>
  );
}

/* ── Linha do tempo editor ─────────────────────────────────── */
function newTimelineItem(): TimelineItem {
  return { id: Math.random().toString(36).slice(2), ano: '', titulo: '', descricao: '', imageUrl: null };
}

function TimelineEditor({ items, orientation, onChangeItems, onChangeOrientation, portalDbId }: {
  items: TimelineItem[];
  orientation: 'vertical' | 'horizontal';
  onChangeItems: (items: TimelineItem[]) => void;
  onChangeOrientation: (orientation: 'vertical' | 'horizontal') => void;
  portalDbId: string | null;
}) {
  function update(id: string, patch: Partial<TimelineItem>) {
    onChangeItems(items.map(i => i.id === id ? { ...i, ...patch } : i));
  }
  function remove(id: string) { onChangeItems(items.filter(i => i.id !== id)); }
  function add() { onChangeItems([...items, newTimelineItem()]); }
  function move(i: number, dir: -1 | 1) {
    const next = [...items];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChangeItems(next);
  }

  return (
    <div className="timeline-editor">
      <div className="timeline-editor__orientation">
        <span className="nm-meta-label">Orientação no site</span>
        <div className="nm-type-chips">
          <button type="button" className={`nm-type-chip${orientation === 'vertical' ? ' nm-type-chip--active' : ''}`}
            onClick={() => onChangeOrientation('vertical')}>Vertical</button>
          <button type="button" className={`nm-type-chip${orientation === 'horizontal' ? ' nm-type-chip--active' : ''}`}
            onClick={() => onChangeOrientation('horizontal')}>Horizontal</button>
        </div>
      </div>

      {items.map((item, i) => (
        <div key={item.id} className="galeria-card-editor">
          <div className="galeria-card-editor__header">
            <span className="galeria-card-editor__num">Ano {i + 1}</span>
            <div className="galeria-card-editor__order">
              <button type="button" className="ce-icon-btn" title="Mover para cima" disabled={i === 0} onClick={() => move(i, -1)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
              </button>
              <button type="button" className="ce-icon-btn" title="Mover para baixo" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>
            <button type="button" className="sec-editor__del" onClick={() => remove(item.id)} title="Remover ano">
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>delete</span>
            </button>
          </div>
          <div className="galeria-card-editor__fields">
            <div className="galeria-card-editor__col-img">
              {item.imageUrl ? (
                <div className="galeria-card-img-preview">
                  <img src={item.imageUrl} alt="" className="galeria-card-img-preview__img" />
                  <div className="galeria-card-img-preview__actions">
                    <label className="btn-action btn-action--enter galeria-img-label">
                      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>cached</span>
                      <input type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={async e => { const f = e.target.files?.[0]; if (f) { const r = await processImage(f, 'gallery-card'); const url = await uploadMateriaImage(r.file, r.objectUrl, portalDbId, 'timeline-item'); update(item.id, { imageUrl: url }); } }} />
                    </label>
                    <MediaPickerButton portalDbId={portalDbId} icon onSelect={url => update(item.id, { imageUrl: url })} />
                    <button type="button" className="btn-action btn-action--danger" onClick={() => update(item.id, { imageUrl: null })}>
                      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>delete</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <label className="galeria-card-img-empty galeria-img-label">
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={async e => { const f = e.target.files?.[0]; if (f) { const r = await processImage(f, 'gallery-card'); const url = await uploadMateriaImage(r.file, r.objectUrl, portalDbId, 'timeline-item'); update(item.id, { imageUrl: url }); } }} />
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>image</span>
                    <span>Imagem (opcional)</span>
                  </label>
                  <MediaPickerButton portalDbId={portalDbId} onSelect={url => update(item.id, { imageUrl: url })} />
                </>
              )}
            </div>
            <div className="galeria-card-editor__col-fields">
              <input className="nm-field--sm" type="text" placeholder="Ano (ex: 1966)" value={item.ano}
                onChange={e => update(item.id, { ano: e.target.value })} />
              <input className="nm-field--sm" type="text" placeholder="Título (opcional)" value={item.titulo}
                onChange={e => update(item.id, { titulo: e.target.value })} />
              <textarea className="nm-field--sm nm-textarea" rows={2} placeholder="Descrição" value={item.descricao}
                onChange={e => update(item.id, { descricao: e.target.value })} />
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="galeria-add-card" onClick={add}>
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
        Adicionar ano
      </button>
    </div>
  );
}

/* ── Editores de lista simples (KPIs, FAQ, Abas, Pessoas) ─── */
// All four are "a list of small records with add/reorder/remove", so they
// share one shell instead of four near-identical copies. `renderFields`
// draws whatever inputs the specific block needs for one item.
function genItemId() { return Math.random().toString(36).slice(2); }

function ListBlockEditor<T extends { id: string }>({ items, itemLabel, addLabel, makeItem, onChange, renderFields }: {
  items: T[];
  itemLabel: string;
  addLabel: string;
  makeItem: () => T;
  onChange: (items: T[]) => void;
  renderFields: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  function move(i: number, dir: -1 | 1) {
    const next = [...items];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="timeline-editor">
      {items.map((item, i) => (
        <div key={item.id} className="galeria-card-editor">
          <div className="galeria-card-editor__header">
            <span className="galeria-card-editor__num">{itemLabel} {i + 1}</span>
            <div className="galeria-card-editor__order">
              <button type="button" className="ce-icon-btn" title="Mover para cima" disabled={i === 0} onClick={() => move(i, -1)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
              </button>
              <button type="button" className="ce-icon-btn" title="Mover para baixo" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>
            <button type="button" className="sec-editor__del" title={`Remover ${itemLabel.toLowerCase()}`}
              onClick={() => onChange(items.filter(x => x.id !== item.id))}>
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>delete</span>
            </button>
          </div>
          <div className="galeria-card-editor__fields">
            {renderFields(item, patch => onChange(items.map(x => x.id === item.id ? { ...x, ...patch } : x)))}
          </div>
        </div>
      ))}
      <button type="button" className="galeria-add-card" onClick={() => onChange([...items, makeItem()])}>
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
        {addLabel}
      </button>
    </div>
  );
}

function newKpi(): KpiItem { return { id: genItemId(), valor: '', rotulo: '', variacao: '' }; }
function newAccordionItem(): AccordionItem { return { id: genItemId(), pergunta: '', resposta: '' }; }
function newTab(): TabItem { return { id: genItemId(), titulo: '', html: '' }; }
function newPessoa(): PessoaItem { return { id: genItemId(), nome: '', cargo: '', bio: '', imageUrl: null }; }

/* ── Tabela editor ────────────────────────────────────────── */
interface TabelaCell { value: string; }
interface TabelaRow { id: string; cells: TabelaCell[]; }

function genRowId() { return Math.random().toString(36).slice(2); }

function makeCells(n: number): TabelaCell[] {
  return Array.from({ length: n }, () => ({ value: '' }));
}

function TabelaEditor({ rows, headers, onChange }: {
  rows: TabelaRow[];
  headers: string[];
  onChange: (rows: TabelaRow[], headers: string[]) => void;
}) {
  const colCount = headers.length;

  function addCol() {
    onChange(
      rows.map(r => ({ ...r, cells: [...r.cells, { value: '' }] })),
      [...headers, `Coluna ${colCount + 1}`],
    );
  }

  function removeCol(ci: number) {
    if (colCount <= 1) return;
    onChange(
      rows.map(r => ({ ...r, cells: r.cells.filter((_, i) => i !== ci) })),
      headers.filter((_, i) => i !== ci),
    );
  }

  function addRow() {
    onChange([...rows, { id: genRowId(), cells: makeCells(colCount) }], headers);
  }

  function removeRow(ri: number) {
    onChange(rows.filter((_, i) => i !== ri), headers);
  }

  function setHeader(ci: number, value: string) {
    const next = [...headers];
    next[ci] = value;
    onChange(rows, next);
  }

  function setCell(ri: number, ci: number, value: string) {
    const next = rows.map((r, i) => {
      if (i !== ri) return r;
      const cells = r.cells.map((c, j) => j === ci ? { value } : c);
      return { ...r, cells };
    });
    onChange(next, headers);
  }

  return (
    <div className="tabela-editor">
      <div className="tabela-editor__scroll">
        <table className="tabela-editor__table">
          <thead>
            <tr>
              <th className="tabela-editor__row-num" />
              {headers.map((h, ci) => (
                <th key={ci} className="tabela-editor__th">
                  <div className="tabela-editor__th-inner">
                    <input
                      className="tabela-editor__header-input"
                      value={h}
                      onChange={e => setHeader(ci, e.target.value)}
                      placeholder={`Coluna ${ci + 1}`}
                    />
                    {colCount > 1 && (
                      <button className="tabela-editor__col-del" type="button" title="Remover coluna"
                        onClick={() => removeCol(ci)}>
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="tabela-editor__add-col-th">
                <button className="tabela-editor__add-col" type="button" title="Adicionar coluna" onClick={addCol}>
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>add</span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row.id}>
                <td className="tabela-editor__row-num">{ri + 1}</td>
                {row.cells.map((cell, ci) => (
                  <td key={ci} className="tabela-editor__td">
                    <input
                      className="tabela-editor__cell-input"
                      value={cell.value}
                      onChange={e => setCell(ri, ci, e.target.value)}
                      placeholder="—"
                    />
                  </td>
                ))}
                <td className="tabela-editor__row-actions">
                  <button className="tabela-editor__row-del" type="button" title="Remover linha"
                    onClick={() => removeRow(ri)} disabled={rows.length <= 1}>
                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>delete</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="tabela-editor__add-row" type="button" onClick={addRow}>
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
        Nova linha
      </button>
    </div>
  );
}

/* ── Section editor ───────────────────────────────────────── */
function SectionEditor({ section, index, onRemove, onUpdateSection, portalDbId, locale, primaryLocale, isFlatShow }: {
  section: ContentSection;
  index: number;
  onRemove: () => void;
  onUpdateSection: (patch: Partial<ContentSection>) => void;
  portalDbId: string | null;
  locale: LocaleCode;
  primaryLocale: LocaleCode;
  isFlatShow: boolean;
}) {
  const sectionImageUrl = imageFor(section.imageUrl, locale, primaryLocale);
  const sectionImageShared = sectionImageUrl != null && locale !== primaryLocale && !isImageOverridden(section.imageUrl, locale);
  const sectionImageNote = sectionImageShared ? 'Mesma imagem usada nos demais idiomas — envie outra aqui para usar só neste.' : undefined;
  const updateSectionImage = (imageUrl: string | null) => onUpdateSection({ imageUrl: withLocalizedImage(section.imageUrl, locale, primaryLocale, imageUrl) });

  return (
    <div className="sec-editor" id={`sec-${section.id}`}>
      <div className="sec-editor__head">
        <span className="sec-editor__num">{index + 1}</span>
        <span className="sec-editor__label">{SECTION_LABEL[section.type]}</span>
        {/* Um bloco de Imagem pura não tem fundo/texto — é só a imagem, sem
            nenhum container que essas cores afetariam. */}
        {section.type !== 'image' && (
          <div className="sec-editor__colors">
            {/* Sem cor definida a seção herda o tema do portal — por isso o
                botão de limpar, e não um valor padrão fixo. */}
            <span className="sec-editor__colors-label" title="Cor de fundo da seção">Fundo</span>
            <ColorPickerPopover value={section.bgColor || '#ffffff'} onChange={bgColor => onUpdateSection({ bgColor })} />
            {/* Num bloco de texto simples, a cor do texto já é definida
                trecho a trecho na própria barra de ferramentas do editor
                logo abaixo — duplicar esse controle aqui em cima, como
                "cor padrão da seção", só confundia (dois lugares para a
                mesma coisa). Os outros tipos de bloco continuam com o
                controle aqui, já que muitos não têm um editor de texto
                próprio com essa opção. */}
            {section.type !== 'text' && (
              <>
                <span className="sec-editor__colors-label" title="Cor padrão do texto da seção — trechos com cor própria (aplicada no editor de texto abaixo) não são afetados">Texto</span>
                <ColorPickerPopover value={section.textColor || '#141414'} onChange={textColor => onUpdateSection({ textColor })} />
              </>
            )}
            {(section.bgColor || (section.type !== 'text' && section.textColor)) && (
              <button type="button" className="sec-editor__del" title="Voltar às cores do tema"
                onClick={() => onUpdateSection({ bgColor: '', textColor: '' })}>
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>format_color_reset</span>
              </button>
            )}
          </div>
        )}
        <button type="button" className="sec-editor__del" onClick={onRemove} title="Remover">
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>delete</span>
        </button>
      </div>
      <div className="sec-editor__body">
        {section.type === 'text' && (
          <>
            <RichTextEditor value={htmlFor(section.html, locale, primaryLocale)}
              onChange={html => onUpdateSection({ html: withLocalizedHtml(section.html, locale, primaryLocale, html) })} />
            {/* Only on Tabs/Sidebar layouts, where "Bloco de texto" is the
                only block type authors have — an image stacked below the
                text, not a separate block, since these portals don't offer
                the Banner layout's dedicated image-text/text-image pairing. */}
            {isFlatShow && (
              <ImageUpload label="Imagem (opcional, abaixo do texto)" ratio="16/9" value={sectionImageUrl}
                onChange={updateSectionImage} portalDbId={portalDbId} sharedNote={sectionImageNote} />
            )}
          </>
        )}

        {(section.type === 'image-text' || section.type === 'text-image') && (
          <div className="sec-two-panel">
            <p className="sec-two-panel__hint">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="8" height="18" rx="1"/><rect x="13" y="3" width="8" height="18" rx="1"/></svg>
              No site, {section.type === 'image-text' ? 'a imagem fica à esquerda e o texto à direita' : 'o texto fica à esquerda e a imagem à direita'}
            </p>
            <ImageUpload label="Imagem" ratio="4/3" value={sectionImageUrl}
              onChange={updateSectionImage} portalDbId={portalDbId} sharedNote={sectionImageNote} />
            <RichTextEditor placeholder="Texto da seção..." value={htmlFor(section.html, locale, primaryLocale)}
              onChange={html => onUpdateSection({ html: withLocalizedHtml(section.html, locale, primaryLocale, html) })} />
          </div>
        )}

        {section.type === 'bg-image' && (
          <div className="sec-bgimg">
            <ImageUpload label="Imagem de fundo" ratio="21/5" value={sectionImageUrl}
              onChange={updateSectionImage} portalDbId={portalDbId} sharedNote={sectionImageNote} />
            <RichTextEditor placeholder="Texto de destaque sobre a imagem..." value={htmlFor(section.html, locale, primaryLocale)}
              onChange={html => onUpdateSection({ html: withLocalizedHtml(section.html, locale, primaryLocale, html) })} />
          </div>
        )}

        {section.type === 'two-col' && (
          <div className="sec-cols">
            <p className="sec-cols__hint">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="8" height="18" rx="1"/><rect x="13" y="3" width="8" height="18" rx="1"/></svg>
              No site, as colunas ficam lado a lado
            </p>
            <RichTextEditor placeholder="Coluna 1..." value={htmlFor(section.html, locale, primaryLocale)}
              onChange={html => onUpdateSection({ html: withLocalizedHtml(section.html, locale, primaryLocale, html) })} />
            <RichTextEditor placeholder="Coluna 2..." value={htmlFor(section.html2, locale, primaryLocale)}
              onChange={html2 => onUpdateSection({ html2: withLocalizedHtml(section.html2, locale, primaryLocale, html2) })} />
          </div>
        )}

        {section.type === 'three-col' && (
          <div className="sec-cols">
            <p className="sec-cols__hint">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="6" height="18" rx="1"/><rect x="9" y="3" width="6" height="18" rx="1"/><rect x="16" y="3" width="6" height="18" rx="1"/></svg>
              No site, as colunas ficam lado a lado
            </p>
            <RichTextEditor placeholder="Coluna 1..." value={htmlFor(section.html, locale, primaryLocale)}
              onChange={html => onUpdateSection({ html: withLocalizedHtml(section.html, locale, primaryLocale, html) })} />
            <RichTextEditor placeholder="Coluna 2..." value={htmlFor(section.html2, locale, primaryLocale)}
              onChange={html2 => onUpdateSection({ html2: withLocalizedHtml(section.html2, locale, primaryLocale, html2) })} />
            <RichTextEditor placeholder="Coluna 3..." value={htmlFor(section.html3, locale, primaryLocale)}
              onChange={html3 => onUpdateSection({ html3: withLocalizedHtml(section.html3, locale, primaryLocale, html3) })} />
          </div>
        )}

        {section.type === 'image' && (
          <div className="sec-image-container">
            <ImageEditor value={sectionImageUrl} alt={section.imageAlt ?? ''}
              onChange={updateSectionImage}
              onAltChange={imageAlt => onUpdateSection({ imageAlt })}
              portalDbId={portalDbId} sharedNote={sectionImageNote} />
          </div>
        )}

        {section.type === 'image-full' && (
          <div className="sec-image-full">
            <ImageUpload label="Imagem full width" ratio="21/6" value={sectionImageUrl}
              onChange={updateSectionImage} portalDbId={portalDbId} sharedNote={sectionImageNote} />
          </div>
        )}

        {section.type === 'galeria' && (
          <GaleriaEditor
            cards={section.cards ?? []}
            onChange={(cards) => onUpdateSection({ cards })}
            portalDbId={portalDbId}
          />
        )}

        {section.type === 'kpis' && (
          <ListBlockEditor<KpiItem>
            items={section.kpiItems ?? []}
            itemLabel="Indicador" addLabel="Adicionar indicador" makeItem={newKpi}
            onChange={kpiItems => onUpdateSection({ kpiItems })}
            renderFields={(item, update) => (
              <div className="galeria-card-editor__col-fields">
                <input className="nm-field--sm" type="text" placeholder="Valor (ex: R$ 2,4 bi)" value={item.valor}
                  onChange={e => update({ valor: e.target.value })} />
                <input className="nm-field--sm" type="text" placeholder="Rótulo (ex: Receita líquida)" value={item.rotulo}
                  onChange={e => update({ rotulo: e.target.value })} />
                <input className="nm-field--sm" type="text" placeholder="Variação (opcional — ex: +18% a/a)" value={item.variacao}
                  onChange={e => update({ variacao: e.target.value })} />
              </div>
            )}
          />
        )}

        {section.type === 'accordion' && (
          <ListBlockEditor<AccordionItem>
            items={section.accordionItems ?? []}
            itemLabel="Pergunta" addLabel="Adicionar pergunta" makeItem={newAccordionItem}
            onChange={accordionItems => onUpdateSection({ accordionItems })}
            renderFields={(item, update) => (
              <div className="galeria-card-editor__col-fields">
                <input className="nm-field--sm" type="text" placeholder="Pergunta" value={item.pergunta}
                  onChange={e => update({ pergunta: e.target.value })} />
                <RichTextEditor placeholder="Resposta..." value={item.resposta}
                  onChange={resposta => update({ resposta })} />
              </div>
            )}
          />
        )}

        {section.type === 'tabs' && (
          <ListBlockEditor<TabItem>
            items={section.tabItems ?? []}
            itemLabel="Aba" addLabel="Adicionar aba" makeItem={newTab}
            onChange={tabItems => onUpdateSection({ tabItems })}
            renderFields={(item, update) => (
              <div className="galeria-card-editor__col-fields">
                <input className="nm-field--sm" type="text" placeholder="Título da aba" value={item.titulo}
                  onChange={e => update({ titulo: e.target.value })} />
                <RichTextEditor placeholder="Conteúdo desta aba..." value={item.html}
                  onChange={html => update({ html })} />
              </div>
            )}
          />
        )}

        {section.type === 'pessoas' && (
          <ListBlockEditor<PessoaItem>
            items={section.pessoaItems ?? []}
            itemLabel="Pessoa" addLabel="Adicionar pessoa" makeItem={newPessoa}
            onChange={pessoaItems => onUpdateSection({ pessoaItems })}
            renderFields={(item, update) => (
              <>
                <div className="galeria-card-editor__col-img">
                  {item.imageUrl ? (
                    <div className="galeria-card-img-preview">
                      <img src={item.imageUrl} alt="" className="galeria-card-img-preview__img" />
                      <div className="galeria-card-img-preview__actions">
                        <label className="btn-action btn-action--enter galeria-img-label">
                          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>cached</span>
                          <input type="file" accept="image/*" style={{ display: 'none' }}
                            onChange={async e => { const f = e.target.files?.[0]; if (f) { const r = await processImage(f, 'gallery-card'); const url = await uploadMateriaImage(r.file, r.objectUrl, portalDbId, 'pessoa'); update({ imageUrl: url }); } }} />
                        </label>
                        <MediaPickerButton portalDbId={portalDbId} icon onSelect={url => update({ imageUrl: url })} />
                        <button type="button" className="btn-action btn-action--danger" onClick={() => update({ imageUrl: null })}>
                          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>delete</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <label className="galeria-card-img-empty galeria-img-label">
                        <input type="file" accept="image/*" style={{ display: 'none' }}
                          onChange={async e => { const f = e.target.files?.[0]; if (f) { const r = await processImage(f, 'gallery-card'); const url = await uploadMateriaImage(r.file, r.objectUrl, portalDbId, 'pessoa'); update({ imageUrl: url }); } }} />
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>person</span>
                        <span>Foto (opcional)</span>
                      </label>
                      <MediaPickerButton portalDbId={portalDbId} onSelect={url => update({ imageUrl: url })} />
                    </>
                  )}
                </div>
                <div className="galeria-card-editor__col-fields">
                  <input className="nm-field--sm" type="text" placeholder="Nome" value={item.nome}
                    onChange={e => update({ nome: e.target.value })} />
                  <input className="nm-field--sm" type="text" placeholder="Cargo" value={item.cargo}
                    onChange={e => update({ cargo: e.target.value })} />
                  <textarea className="nm-field--sm nm-textarea" rows={3} placeholder="Mini-bio (opcional)" value={item.bio}
                    onChange={e => update({ bio: e.target.value })} />
                </div>
              </>
            )}
          />
        )}

        {section.type === 'timeline' && (
          <TimelineEditor
            items={section.timelineItems ?? []}
            orientation={section.timelineOrientation ?? 'vertical'}
            onChangeItems={(timelineItems) => onUpdateSection({ timelineItems })}
            onChangeOrientation={(timelineOrientation) => onUpdateSection({ timelineOrientation })}
            portalDbId={portalDbId}
          />
        )}
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────── */
export default function NovaMateriaPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { publish } = usePublish();
  const routeState = location.state as { editing?: StoredMateria & { pagina: string }; pageType?: 'show' | 'galeria' | 'tabela' | 'html' | 'timeline' } | null;
  const editing = routeState?.editing ?? null;
  const pageType = editing ? (editing.pageType as 'show' | 'galeria' | 'tabela' | 'html' | 'timeline' | undefined) ?? 'show' : (routeState?.pageType ?? 'show');
  const isGaleria = pageType === 'galeria';
  const isTabela = pageType === 'tabela';
  const isHtml = pageType === 'html';
  const isTimeline = pageType === 'timeline';

  const { destinos: allDestinos, untypedCount } = useCanaisDestinos(user?.activePortalId ?? undefined);

  // Sidebar/Tabmenu's "Show" is deliberately a much simpler page than the
  // Banner layout's Show (which allows the full block palette — KPIs, tabs,
  // people, etc.): just a text section (subtítulo + corpo). The block
  // picker below filters down to that single block type when the portal
  // is a flat layout and this matéria targets a 'show' page.
  const [portalLayout, setPortalLayout] = useState<'sidebar' | 'tabmenu' | 'banner'>('banner');
  useEffect(() => {
    const portalKey = user?.activePortalId;
    if (!portalKey) return;
    fetchPortalConfig(portalKey).then(data => {
      if (data?.layout && typeof data.layout === 'string') {
        setPortalLayout(data.layout as 'sidebar' | 'tabmenu' | 'banner');
      }
    }).catch(console.error);
  }, [user?.activePortalId]);
  const isFlatShow = pageType === 'show' && (portalLayout === 'sidebar' || portalLayout === 'tabmenu');

  // Resolved once up front so gallery image uploads can go straight to
  // Storage as they're picked, instead of staying as ephemeral blob: URLs
  // until the final save (which only had access to it after an async
  // resolvePortalId() call at submit time).
  const [portalDbId, setPortalDbId] = useState<string | null>(null);
  useEffect(() => {
    const portalKey = user?.activePortalId;
    if (!portalKey) return;
    resolvePortalId(portalKey).then(setPortalDbId).catch(() => {});
  }, [user?.activePortalId]);

  // Filter destinations by article type compatibility — useCanaisDestinos
  // already excludes pages with no pageType chosen yet in Canais, so 'show'
  // here only ever matches a page explicitly typed as such.
  const compatiblePageTypes: (string | undefined)[] = isGaleria
    ? ['galeria', 'lista-agrupada', 'lista', 'blog']
    : isTabela
    ? ['tabela']
    : isHtml
    ? ['show']
    : isTimeline
    ? ['timeline']
    : ['show'];
  const destinos = allDestinos.filter(d => compatiblePageTypes.includes(d.pageType));

  const [title, setTitle] = useState(editing?.titulo ?? (isGaleria && !editing ? 'Comunicados ao Mercado' : ''));
  // No longer editable (the in-content title/subtitle card was removed —
  // headings come from the page name and the content blocks), but whatever
  // an older matéria already had is preserved on re-save rather than wiped.
  const subtitle = editing?.subtitulo ?? '';
  // The header image itself now lives on the page/canal node (Canais →
  // editar canal/página), not on the matéria — this screen only displays
  // the effective (own or inherited) image read-only, via `selectedDestino`
  // below.
  const editingContent = editing?.content as unknown;
  const [sections, setSections] = useState<ContentSection[]>(() => {
    if (!isGaleria && !isTabela && !isHtml && !isTimeline) {
      if (editing && Array.isArray(editingContent)) return editingContent as ContentSection[];
      return [{ id: 'init', type: 'text' }];
    }
    return [];
  });
  const [htmlContent, setHtmlContent] = useState(() =>
    isHtml && editing && typeof editingContent === 'string' ? editingContent : ''
  );
  const [galeriaCards, setGaleriaCards] = useState<GaleriaCard[]>(() => {
    if (isGaleria && editing && Array.isArray(editingContent) && editingContent.length > 0) {
      const first = editingContent[0] as { type?: string; cards?: GaleriaCard[] };
      if (first?.type === 'galeria' && Array.isArray(first.cards)) return first.cards;
    }
    return isGaleria && !editing ? SAMPLE_GALERIA_CARDS : [newCard()];
  });
  const editingTabela = isTabela && editing && editingContent && typeof editingContent === 'object' && !Array.isArray(editingContent)
    ? editingContent as { headers?: string[]; rows?: TabelaRow[] }
    : null;
  const [tabelaHeaders, setTabelaHeaders] = useState<string[]>(
    editingTabela?.headers ?? ['Coluna 1', 'Coluna 2', 'Coluna 3']
  );
  const [tabelaRows, setTabelaRows] = useState<TabelaRow[]>(
    editingTabela?.rows ?? [
      { id: genRowId(), cells: [{ value: '' }, { value: '' }, { value: '' }] },
      { id: genRowId(), cells: [{ value: '' }, { value: '' }, { value: '' }] },
    ]
  );
  // Standalone "Linha do tempo" matéria — same shape used when a timeline
  // is embedded as one section inside a Show matéria (a single-item array
  // wrapping { type: 'timeline', timelineItems, timelineOrientation }), so
  // materias.js's renderBlock() handles both without a separate code path.
  const editingTimeline = isTimeline && editing && Array.isArray(editingContent) && editingContent.length > 0
    ? (editingContent[0] as { type?: string; timelineItems?: TimelineItem[]; timelineOrientation?: 'vertical' | 'horizontal' })
    : null;
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>(
    editingTimeline?.type === 'timeline' && Array.isArray(editingTimeline.timelineItems) ? editingTimeline.timelineItems : [newTimelineItem()]
  );
  const [timelineOrientation, setTimelineOrientation] = useState<'vertical' | 'horizontal'>(
    editingTimeline?.timelineOrientation ?? 'vertical'
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCat, setPickerCat] = useState<'all' | SectionCategory>('all');
  const [locale, setLocale] = useState<LocaleCode>(PORTAL_CONFIG.languages[0]);
  const [page, setPage] = useState(editing?.pageId ?? '');
  const selectedDestino = destinos.find(d => d.id === page);

  // `selectedDestino.hasPublishedMateria` comes from useCanaisDestinos, which
  // is localStorage-only — it can go stale (e.g. a page's linked matéria was
  // unlinked via Canais' "excluir canal" flow, which updates Supabase but
  // not this cache) and keep reporting a page as occupied forever. Supabase
  // is the actual source of truth once a portal is resolved, so re-check it
  // directly for the selected page and let that override the local guess.
  const [remoteOccupied, setRemoteOccupied] = useState<boolean | null>(null);
  useEffect(() => {
    setRemoteOccupied(null);
    if (!page || !portalDbId || !isSupabaseConfigured || !supabase) return;
    let cancelled = false;
    supabase.from('portal_materias')
      .select('id', { count: 'exact', head: true })
      .eq('portal_id', portalDbId).eq('page_id', page).eq('status', 'publicado')
      .then(({ count }) => {
        if (cancelled) return;
        const occupiedByOther = (count ?? 0) > (editing && editing.pageId === page ? 1 : 0);
        setRemoteOccupied(occupiedByOther);
      });
    return () => { cancelled = true; };
  }, [page, portalDbId, editing]);

  const localOccupied = selectedDestino?.hasPublishedMateria ?? false;
  const pageOccupied = !isGaleria && !isTabela && !isHtml && !isTimeline && (remoteOccupied ?? localOccupied);

  // Same staleness problem as `remoteOccupied` above, but for every option in
  // the destino dropdown, not just the one currently selected — `d.hasPublishedMateria`
  // (from useCanaisDestinos) is localStorage-only, so a page published from a
  // different device/session never shows "(ocupada)" here even though it
  // genuinely has a live matéria. Batch-fetch every occupied 'show' page id
  // from Supabase once portalDbId is known, and let it override the local
  // per-option guess the same way the single-page check does.
  const [remoteOccupiedIds, setRemoteOccupiedIds] = useState<Set<string> | null>(null);
  useEffect(() => {
    if (!portalDbId || !isSupabaseConfigured || !supabase) { setRemoteOccupiedIds(null); return; }
    let cancelled = false;
    supabase.from('portal_materias')
      .select('page_id')
      .eq('portal_id', portalDbId).eq('status', 'publicado')
      .then(({ data }) => {
        if (cancelled) return;
        setRemoteOccupiedIds(new Set((data ?? []).map((r: { page_id: string }) => r.page_id)));
      });
    return () => { cancelled = true; };
  }, [portalDbId]);

  function destinoOccupied(d: Destino): boolean {
    if (d.pageType !== 'show') return false;
    if (editing && editing.pageId === d.id) return false; // editing this matéria's own page doesn't occupy it
    if (remoteOccupiedIds) return remoteOccupiedIds.has(d.id);
    return d.hasPublishedMateria;
  }
  const canPublish = title.trim().length > 0 && page.length > 0 && !pageOccupied;
  // A rascunho só precisa de um título — a página de destino só passa a ser
  // obrigatória quando o autor tenta de fato publicar.
  const canSaveDraft = title.trim().length > 0;
  const STATUS_FROM_STORED: Record<string, PublishStatus> = { publicado: 'published', rascunho: 'draft', agendado: 'scheduled' };
  const [status, setStatus] = useState<PublishStatus>(editing ? (STATUS_FROM_STORED[editing.status] ?? 'draft') : 'draft');
  // Reopening a scheduled matéria has to show the schedule it already has,
  // or saving again would silently drop it back to "publish now".
  const editingSchedule = editing?.scheduleAt ? new Date(editing.scheduleAt) : null;
  const [scheduleDate, setScheduleDate] = useState(
    editingSchedule ? `${editingSchedule.getFullYear()}-${String(editingSchedule.getMonth() + 1).padStart(2, '0')}-${String(editingSchedule.getDate()).padStart(2, '0')}` : ''
  );
  const [scheduleTime, setScheduleTime] = useState(
    editingSchedule ? editingSchedule.toTimeString().slice(0, 5) : ''
  );
  // Local date, not toISOString() — that's UTC, so late evening in BRT
  // (UTC-3) would already report tomorrow and block scheduling for today.
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  // A date with no time means midnight of that day. `new Date('YYYY-MM-DDTHH:mm')`
  // parses as LOCAL time, so toISOString() lands on the right UTC instant
  // for the cron to compare against now().
  const scheduleAtIso = (() => {
    if (!scheduleDate) return null;
    const d = new Date(`${scheduleDate}T${scheduleTime || '00:00'}`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  })();
  // Only defer publication for a moment that hasn't passed yet — a date in
  // the past would leave the matéria stuck as 'agendado' forever, since the
  // cron would publish it on its next tick anyway.
  const scheduleInPast = !!scheduleAtIso && new Date(scheduleAtIso).getTime() <= Date.now();
  const willSchedule = !!scheduleAtIso && !scheduleInPast;
  // The matéria lives at its destination page's URL, so the slug mirrors
  // that page's name — it follows along if the page is renamed in Canais,
  // instead of drifting from whatever the matéria happened to be called.
  const slug = (selectedDestino?.label ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [contentType, setContentType] = useState(isGaleria && !editing ? 'Notícia' : '');
  const [dirty, setDirty] = useState(false);

  function markDirty() { setDirty(true); }

  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  // Every one of these mutates the matéria's content, so they all have to
  // mark it dirty — when editing an existing matéria the Publicar button is
  // gated on `dirty`, and without this writing in a text block (or adding,
  // removing, reordering sections) left it disabled with no way to save.
  function addSection(type: SectionType) {
    const base: ContentSection = { id: Math.random().toString(36).slice(2), type };
    if (type === 'galeria') base.cards = [newCard()];
    if (type === 'timeline') { base.timelineItems = [newTimelineItem()]; base.timelineOrientation = 'vertical'; }
    if (type === 'kpis') base.kpiItems = [newKpi()];
    if (type === 'accordion') base.accordionItems = [newAccordionItem()];
    if (type === 'tabs') base.tabItems = [newTab()];
    if (type === 'pessoas') base.pessoaItems = [newPessoa()];
    setSections((prev) => [...prev, base]);
    setPickerOpen(false);
    markDirty();
  }

  // Flat layouts' simplified Show has exactly one block type available —
  // skip the WordPress-style picker overlay entirely (nothing to actually
  // pick) and add the text section directly.
  function openAddSection() {
    if (isFlatShow) { addSection('text'); return; }
    setPickerOpen(true);
  }

  function removeSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
    markDirty();
  }

  function updateSection(id: string, patch: Partial<ContentSection>) {
    setSections((prev) => prev.map(s => s.id === id ? { ...s, ...patch } : s));
    markDirty();
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex.current === null || dragIndex.current === targetIndex) {
      dragIndex.current = null;
      setDragOver(null);
      return;
    }
    setSections((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex.current!, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    dragIndex.current = null;
    setDragOver(null);
    markDirty();
  }

  function scrollTo(id: string) {
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handlePublish(newStatus: PublishStatus) {
    // "Salvar rascunho" only requires a título (canSaveDraft) — the page
    // picker can still be empty here, unlike Publicar (canPublish, which
    // gates the button that reaches this with newStatus !== 'draft'). An
    // unassigned draft still needs to persist SOMETHING, so pageId/pageLabel
    // fall back to '' instead of skipping the save outright — same
    // placeholder CanaisPage already writes when a page gets deleted out
    // from under a matéria that was previously linked to it.
    const dest = page ? destinos.find(d => d.id === page) : undefined;
    const today = new Date().toLocaleDateString('pt-BR');
    const m = {
      id: editing?.id ?? Math.random().toString(36).slice(2),
      titulo: title || 'Sem título',
      subtitulo: subtitle,
      pageId: page || '',
      pageLabel: dest?.label ?? page ?? '',
      pageType: (isGaleria ? 'galeria' : isTabela ? 'tabela' : isHtml ? 'html' : isTimeline ? 'timeline' : 'show') as MateriaPageType,
      pageSlugType: dest?.pageType,
      status: newStatus === 'published' ? 'publicado' as const : newStatus === 'scheduled' ? 'agendado' as const : 'rascunho' as const,
      data: today,
      autor: user?.name ?? user?.email ?? 'Usuário',
      ultimaEdicao: today,
      ultimoEditor: user?.name ?? user?.email ?? 'Usuário',
      // Built from the local date+time the admin picked; toISOString()
      // converts to UTC so the cron fires at the intended local moment
      // rather than three hours off. Only meaningful when scheduling —
      // a draft or an immediate publish clears it.
      scheduleAt: newStatus === 'scheduled' ? scheduleAtIso : null,
      // Galeria/timeline are saved wrapped as a single-item block array
      // (not the bare cards/items) so the site's existing renderBlock()
      // in materias.js — built for sections inside a 'show' page — can
      // render them identically without a separate code path, whether
      // they're the whole matéria or just one section among others.
      content: isGaleria ? [{ id: 'galeria', type: 'galeria', cards: galeriaCards }]
        : isTabela ? { headers: tabelaHeaders, rows: tabelaRows }
        : isHtml ? htmlContent
        : isTimeline ? [{ id: 'timeline', type: 'timeline', timelineItems, timelineOrientation }]
        : sections,
    };
    const portalKey = user?.activePortalId ?? undefined;
    persistMateria(m, portalKey);
    setSaveError('');
    // Synced to Supabase regardless of whether a página was picked yet —
    // MateriasPage lists exclusively from portal_materias, never from this
    // module's localStorage cache, so gating this on `page` (as this used
    // to) meant an unassigned draft saved fine locally, showed "Salvo!",
    // and then simply never appeared in Matérias — indistinguishable from
    // the save silently doing nothing.
    if (portalKey) {
      const portalDbId = await resolvePortalId(portalKey);
      if (portalDbId) {
        const { error } = await syncMateriaToSupabase(m, portalDbId);
        if (error) {
          // Saved to the local cache, but MateriasPage lists exclusively
          // from Supabase — a swallowed error here used to leave the
          // button reading "Salvo!" while the matéria never actually
          // appeared in the list. Surface it and stop instead of
          // pretending this succeeded.
          setSaveError(`Não foi possível salvar no banco: ${error}. A matéria NÃO aparecerá na lista até isso ser resolvido.`);
          return;
        }
        // Scheduled counts as published for the page itself: the cron only
        // flips the matéria's status in Supabase, it can't create the page
        // or push the site. So the destination page has to be live and
        // deployed now — it just shows "Em construção" until the scheduled
        // moment, when the matéria starts being returned by the query the
        // site already makes on every load.
        if ((m.status === 'publicado' || m.status === 'agendado') && m.pageSlugType === 'show') {
          await activatePageInSupabase(m.pageId, portalDbId);
        }
      } else {
        setSaveError('Não foi possível resolver o portal atual — a matéria foi salva só localmente e NÃO aparecerá na lista. Recarregue a página e tente novamente.');
        return;
      }
    }
    // Match the sidebar's global publish button's real-site effect.
    if (newStatus === 'published' || newStatus === 'scheduled') await publish();

    // Status/dirty only flip once the save above has actually finished —
    // setting them synchronously at the top of this function made the
    // Status badge show "Publicado" (and the button gray out as "no
    // unsaved changes") the instant the user clicked, even if the
    // Supabase upsert or publish() below was still running or failed.
    setStatus(newStatus);
    setDirty(false);

    // Only flip to "Salvo!"/"Publicado!" once the async work above has
    // actually finished — showing it immediately was misleading while
    // publish() was still running.
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const statusLabel: Record<PublishStatus, string> = {
    draft: 'Rascunho',
    published: 'Publicado',
    scheduled: 'Agendado',
  };

  const badgeClass: Record<PublishStatus, string> = {
    draft: 'badge--gray',
    published: 'badge--success',
    scheduled: 'badge--warning',
  };

  return (
    <div className="nm-editor">
      {/* ── Top bar ── */}
      <div className="nm-topbar">
        <button type="button" className="nm-back" onClick={() => navigate('/portal/materias')}>
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>chevron_left</span>
          Matérias
        </button>

        <div className="nm-topbar-actions">
          {!canPublish && !pageOccupied && (
            <span className="nm-validation-hint">
              {!title.trim() ? 'Título obrigatório' :
               'Selecione uma página para publicar'}
            </span>
          )}
          {editing ? (
            <>
              <button
                type="button"
                className="btn-outline"
                disabled={!canSaveDraft}
                onClick={() => handlePublish('draft')}
              >
                Salvar rascunho
              </button>
              <PublishButton
                disabled={!dirty || !canPublish}
                onClick={() => handlePublish(willSchedule ? 'scheduled' : 'published')}
              />
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn-outline"
                disabled={!canSaveDraft}
                onClick={() => handlePublish('draft')}
              >
                {saved && status === 'draft' ? 'Salvo!' : 'Salvar como Rascunho'}
              </button>
              <PublishButton
                disabled={!dirty || !canPublish}
                onClick={() => handlePublish(willSchedule ? 'scheduled' : 'published')}
              />
            </>
          )}
        </div>
      </div>

      {saveError && (
        <div className="save-error-banner" role="alert">
          {saveError}
        </div>
      )}

      {/* ── Locale tab bar ── */}
      <LangTabs active={locale} onChange={setLocale} />

      {/* ── Body: 3 columns (show) or 2 columns (galeria/html) ── */}
      <div className={`nm-body${isGaleria || isTabela || isHtml || isTimeline ? ' nm-body--galeria' : ''}`}>
        {/* Left: sections list (show only) */}
        {!isGaleria && !isTabela && !isHtml && !isTimeline && (
          <aside className="nm-sections-panel">
            <p className="nm-panel-heading">Seções</p>

            <div className="nm-sections-list">
              {sections.map((s, i) => (
                <div
                  key={s.id}
                  className={`nm-section-item${dragOver === i ? ' nm-section-item--over' : ''}`}
                  draggable
                  onDragStart={() => { dragIndex.current = i; }}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(i); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={() => handleDrop(i)}
                  onClick={() => scrollTo(s.id)}
                >
                  <span className="material-symbols-outlined nm-section-item__grip" style={{ fontSize: '12px' }}>drag_indicator</span>
                  <span className="nm-section-item__num">{i + 1}</span>
                  <span className="nm-section-item__label">{SECTION_LABEL[s.type]}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="nm-add-section"
              onClick={openAddSection}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>add</span>
              Nova seção
            </button>
          </aside>
        )}

        {/* Center: content editor */}
        <main className="nm-main">
          <div key={locale} className="lang-fade nm-content-wrap">
            {/* The page's own name (from Canais) is its heading on the live
                site — this field doesn't change what's published there, it's
                still just this matéria's name in the Matérias listing (same
                `title` state as the compact input in the top bar). But
                buried as small text in the top bar it read as an
                afterthought; a large title ahead of the first content block
                gives editors the "this is what I'm writing" anchor they
                expect, matching how the rest of the editor is laid out. */}
            <input
              className="nm-title-input-large"
              value={title}
              onChange={e => { setTitle(e.target.value); markDirty(); }}
              placeholder="Título da matéria..."
            />
            {selectedDestino?.headerImageUrl && (
              <div className="nm-global">
                <div className="nm-header-inherited" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                  <img src={selectedDestino.headerImageUrl} alt="" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 8 }} />
                  <span>
                    <span className="material-symbols-outlined" style={{ fontSize: '15px', color: 'var(--color-gray-400)', verticalAlign: 'middle', marginRight: 4 }}>photo_library</span>
                    {selectedDestino.headerImageInherited ? 'Herdada do canal' : 'Própria desta página'} — para trocar, edite em <strong>Canais</strong>.
                  </span>
                </div>
              </div>
            )}

            {isTabela ? (
              <TabelaEditor
                rows={tabelaRows}
                headers={tabelaHeaders}
                onChange={(rows, headers) => { setTabelaRows(rows); setTabelaHeaders(headers); markDirty(); }}
              />
            ) : isGaleria ? (
              <GaleriaEditor cards={galeriaCards} onChange={(cards) => { setGaleriaCards(cards); markDirty(); }} portalDbId={portalDbId} />
            ) : isTimeline ? (
              <TimelineEditor
                items={timelineItems}
                orientation={timelineOrientation}
                onChangeItems={(items) => { setTimelineItems(items); markDirty(); }}
                onChangeOrientation={(o) => { setTimelineOrientation(o); markDirty(); }}
                portalDbId={portalDbId}
              />
            ) : isHtml ? (
              <div className="nm-html-editor">
                <div className="nm-html-editor__header">
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>code</span>
                  <span>Conteúdo HTML</span>
                  <a
                    className="nm-html-editor__ref-link"
                    href="/portal/materias/html-referencia"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>open_in_new</span>
                    Ver referência de classes
                  </a>
                </div>
                <textarea
                  className="nm-html-editor__textarea"
                  value={htmlContent}
                  onChange={(e) => { setHtmlContent(e.target.value); markDirty(); }}
                  placeholder={'<section class="wl-section">\n  <div class="wl-container">\n    <h2 class="wl-heading-2">Título da seção</h2>\n    <p class="wl-body">Conteúdo...</p>\n  </div>\n</section>'}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                />
                <p className="nm-html-editor__hint">
                  Cole aqui o HTML completo da matéria. Use as classes do Workr Lite para garantir consistência visual com o restante do portal.
                </p>
              </div>
            ) : (
              <>
                {sections.map((s, i) => (
                  <SectionEditor
                    key={s.id}
                    section={s}
                    index={i}
                    onRemove={() => removeSection(s.id)}
                    onUpdateSection={(patch) => updateSection(s.id, patch)}
                    portalDbId={portalDbId}
                    locale={locale}
                    primaryLocale={PORTAL_CONFIG.languages[0]}
                    isFlatShow={isFlatShow}
                  />
                ))}
                <button
                  type="button"
                  className="nm-add-inline"
                  onClick={openAddSection}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
                  Adicionar seção
                </button>
              </>
            )}
          </div>
        </main>

        {/* Right: meta */}
        <aside className="nm-meta-panel">
          {/* Publish */}
          <div className="nm-meta-block">
            <p className="nm-meta-block__title">Publicação</p>
            <div className="nm-meta-row">
              <span className="nm-meta-label">Status</span>
              <span className={`badge ${badgeClass[status]}`}>{statusLabel[status]}</span>
            </div>
            <div className="nm-meta-row">
              <span className="nm-meta-label">Agendar publicação</span>
            </div>
            <DatePicker
              value={scheduleDate}
              min={todayStr}
              placeholder="dd/mm/aaaa"
              onChange={(date) => {
                setScheduleDate(date);
                // Clearing the date clears the time too — an orphan time
                // with no date can't schedule anything.
                if (!date) setScheduleTime('');
                markDirty();
              }}
            />
            <input
              type="time"
              className="nm-date-input"
              style={{ marginTop: 'var(--space-2)' }}
              value={scheduleTime}
              disabled={!scheduleDate}
              onChange={(e) => { setScheduleTime(e.target.value); markDirty(); }}
            />
            {scheduleInPast ? (
              <p className="nm-page-conflict">
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>warning</span>
                Esta data já passou — a matéria será publicada imediatamente.
              </p>
            ) : willSchedule ? (
              <p className="nm-meta-hint">
                Será publicada automaticamente em{' '}
                <strong>{new Date(scheduleAtIso!).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>.
              </p>
            ) : (
              <p className="nm-meta-hint">
                Deixe em branco para publicar imediatamente ao clicar em Publicar.
              </p>
            )}
          </div>

          {/* Page destination */}
          <div className="nm-meta-block">
            <p className="nm-meta-block__title">Página de destino</p>
            <select
              className="filter-select nm-meta-select"
              value={page}
              onChange={(e) => { setPage(e.target.value); markDirty(); }}
            >
              <option value="">Selecionar canal...</option>
              {(() => {
                const groups: Record<string, typeof destinos> = {};
                const ungrouped: typeof destinos = [];
                for (const d of destinos) {
                  if (d.parentLabel) {
                    (groups[d.parentLabel] ??= []).push(d);
                  } else {
                    ungrouped.push(d);
                  }
                }
                return (
                  <>
                    {ungrouped.map((d) => (
                      <option key={d.id} value={d.id} disabled={destinoOccupied(d)}>
                        {d.label}{destinoOccupied(d) ? ' (ocupada)' : ''}
                      </option>
                    ))}
                    {Object.entries(groups).map(([parent, items]) => (
                      <optgroup key={parent} label={parent}>
                        {items.map((d) => (
                          <option key={d.id} value={d.id} disabled={destinoOccupied(d)}>
                            {d.label}{destinoOccupied(d) ? ' (ocupada)' : ''}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </>
                );
              })()}
            </select>
            {pageOccupied && (
              <p className="nm-page-conflict">
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>warning</span>
                Esta página já tem uma matéria publicada. Remova-a antes de publicar outra.
              </p>
            )}
            {destinos.length === 0 && (
              <p className="nm-page-conflict nm-page-conflict--info">
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>info</span>
                Nenhuma página compatível com este tipo de matéria foi encontrada.
              </p>
            )}
            {untypedCount > 0 && (
              <p className="nm-page-conflict nm-page-conflict--info">
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>info</span>
                {untypedCount} página(s) não aparecem aqui por ainda não terem um formato definido em Canais.
              </p>
            )}
          </div>

          {/* Content type — only meaningful for galeria: a card grid that can
              be filtered by this type on the site. 'show'/'tabela'/'html'
              matérias have no such filter, so the chips had no effect there. */}
          {isGaleria && (
            <div className="nm-meta-block">
              <p className="nm-meta-block__title">Tipo de conteúdo</p>
              <div className="nm-type-chips">
                {['Podcast', 'Vídeo', 'Notícia', 'Blog', 'Apresentação', 'Relatório'].map(t => (
                  <button
                    key={t}
                    type="button"
                    className={`nm-type-chip${contentType === t ? ' nm-type-chip--active' : ''}`}
                    onClick={() => { setContentType(prev => prev === t ? '' : t); markDirty(); }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SEO */}
          <div className="nm-meta-block">
            <p className="nm-meta-block__title">SEO & Metadados</p>
            <label className="nm-meta-label">Slug</label>
            {/* Derived from the destination page, never the matéria's own
                name — the page's URL is what it is, and a matéria doesn't
                get its own address. Read-only until we decide whether
                editing it is worth supporting. */}
            <input
              className="nm-field nm-field--sm"
              type="text"
              readOnly
              placeholder="Selecione a página de destino"
              value={slug}
            />
            <label className="nm-meta-label" style={{ marginTop: 'var(--space-3)' }}>Descrição (SEO)</label>
            <textarea
              className="nm-field nm-field--sm nm-textarea"
              placeholder="Breve descrição para mecanismos de busca..."
              rows={3}
            />
          </div>

        </aside>
      </div>

      {/* ── Section type picker overlay (WordPress-style) ── */}
      {pickerOpen && (
        <div className="nm-bp-overlay" role="dialog" aria-modal="true" aria-label="Adicionar seção">
          <div className="nm-bp-panel">
            {/* Sidebar */}
            <aside className="nm-bp-sidebar">
              <div className="nm-bp-search-wrap">
                <span className="material-symbols-outlined nm-bp-search-icon">search</span>
                <input
                  className="nm-bp-search"
                  type="text"
                  placeholder="Pesquisar tipo..."
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <nav className="nm-bp-cats">
                {([['all', 'Tudo'], ['texto', 'Texto'], ['layout', 'Layout'], ['midia', 'Mídia'], ['dados', 'Dados'], ['institucional', 'Institucional']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className={`nm-bp-cat${pickerCat === val ? ' nm-bp-cat--active' : ''}`}
                    onClick={() => setPickerCat(val)}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </aside>

            {/* Content area */}
            <div className="nm-bp-content">
              <div className="nm-bp-header">
                <h3 className="nm-bp-title">Adicionar seção</h3>
                <button
                  type="button"
                  className="nm-bp-close"
                  onClick={() => { setPickerOpen(false); setPickerSearch(''); setPickerCat('all'); }}
                  aria-label="Fechar"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="nm-bp-grid">
                {SECTION_DEFS
                  .filter(def => isGaleria ? def.type === 'galeria' : def.type !== 'galeria')
                  .filter(def => !isFlatShow || def.type === 'text')
                  .filter(def => pickerCat === 'all' || def.cat === pickerCat)
                  .filter(def => !pickerSearch || def.label.toLowerCase().includes(pickerSearch.toLowerCase()) || def.desc.toLowerCase().includes(pickerSearch.toLowerCase()))
                  .map(def => (
                    <button
                      key={def.type}
                      type="button"
                      className="nm-bp-card"
                      onClick={() => { addSection(def.type); setPickerSearch(''); setPickerCat('all'); }}
                    >
                      <div className="nm-bp-thumb">{def.thumb}</div>
                      <div className="nm-bp-card-info">
                        <span className="nm-bp-card-label">{def.label}</span>
                        <span className="nm-bp-card-desc">{def.desc}</span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
