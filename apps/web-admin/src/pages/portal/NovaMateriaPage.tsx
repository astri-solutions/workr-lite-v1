import { useState, useRef } from 'react';
import { processImage } from '../../utils/imageProcessor';
import { useNavigate, useLocation } from 'react-router-dom';
import LangTabs from '../../components/LangTabs';
import { useCanaisDestinos } from '../../hooks/useCanaisDestinos';
import { persistMateria, syncMateriaToSupabase, type MateriaPageType } from '../../hooks/useMateriasStore';
import { useAuth } from '../../contexts/AuthContext';
import { resolvePortalId } from '../../lib/portalDb';
import PORTAL_CONFIG, { LocaleCode } from '../../portalConfig';
import '../admin/AdminPages.css';
import './NovaMateriaPage.css';

type SectionType = 'text' | 'image-text' | 'bg-image' | 'two-col' | 'three-col' | 'image' | 'image-full' | 'galeria';
type PublishStatus = 'draft' | 'published' | 'scheduled';

interface GaleriaCard {
  id: string;
  titulo: string;
  descricao: string;
  data: string;
  link: string;
  imageUrl: string | null;
}

interface ContentSection {
  id: string;
  type: SectionType;
  cards?: GaleriaCard[];
}

type SectionCategory = 'texto' | 'layout' | 'midia';

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
];

const SECTION_LABEL: Record<SectionType, string> = {
  text: 'Bloco de texto',
  'image-text': 'Imagem + Texto',
  'bg-image': 'Fundo com texto',
  'two-col': 'Duas colunas',
  'three-col': 'Três colunas',
  image: 'Imagem',
  'image-full': 'Imagem full width',
  galeria: 'Galeria',
};



/* ── Rich text editor (uncontrolled) ─────────────────────── */
function RichTextEditor({ placeholder = 'Escreva aqui...' }: { placeholder?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = useState(true);

  function exec(cmd: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    syncEmpty();
  }

  function syncEmpty() {
    setEmpty((ref.current?.innerText ?? '').trim() === '');
  }

  function md(e: React.MouseEvent, cmd: string, arg?: string) {
    e.preventDefault();
    exec(cmd, arg);
  }

  function handleBlockFormat(val: string) {
    ref.current?.focus();
    document.execCommand('formatBlock', false, val);
  }

  function handleLink(e: React.MouseEvent) {
    e.preventDefault();
    ref.current?.focus();
    const url = window.prompt('URL do link:');
    if (url) exec('createLink', url);
  }

  return (
    <div className="rte">
      {/* Row 1 */}
      <div className="rte-toolbar">
        <select className="rte-format" defaultValue="p" onChange={(e) => handleBlockFormat(e.target.value)}>
          <option value="p">Parágrafo</option>
          <option value="h1">Título 1</option>
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
          onInput={syncEmpty}
          onFocus={() => setEmpty(false)}
          onBlur={syncEmpty}
        />
      </div>
    </div>
  );
}

/* ── Image upload placeholder ─────────────────────────────── */
function ImageUpload({ label = 'Imagem', ratio = '16/9' }: { label?: string; ratio?: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const result = await processImage(file, 'article-image');
    setPreview(result.objectUrl);
  }

  return (
    <div
      className={`img-upload${preview ? ' img-upload--filled' : ''}`}
      style={{ aspectRatio: ratio }}
      onClick={() => !preview && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      {preview ? (
        <>
          <img src={preview} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
          <button
            type="button"
            className="img-upload__change-btn"
            onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
            Alterar imagem
          </button>
        </>
      ) : (
        <>
          <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>image</span>
          <span className="img-upload__label">{label}</span>
          <button type="button" className="img-upload__btn" onClick={() => inputRef.current?.click()}>Escolher arquivo</button>
        </>
      )}
    </div>
  );
}

/* ── Inline image editor (container-width image) ──────────── */
function ImageEditor() {
  const [file, setFile] = useState<{ name: string; url: string; w: number; h: number } | null>(null);
  const [alt, setAlt] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(f: File) {
    const result = await processImage(f, 'article-image');
    const img = new Image();
    img.onload = () => setFile({ name: result.file.name, url: result.objectUrl, w: img.naturalWidth, h: img.naturalHeight });
    img.src = result.objectUrl;
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) handleFile(f);
  }

  if (!file) {
    return (
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
      </div>
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
              className="img-editor__btn img-editor__btn--danger"
              title="Excluir"
              onClick={() => setFile(null)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>delete</span>
            </button>
          </div>
        </div>
        <div className="img-editor__alt-wrap">
          <label className="img-editor__alt-label">Alt text</label>
          <input
            className="img-editor__alt-input"
            type="text"
            placeholder="Short description for the visually impaired"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
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

function GaleriaEditor({ cards, onChange }: { cards: GaleriaCard[]; onChange: (cards: GaleriaCard[]) => void }) {
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
                        onChange={async e => { const f = e.target.files?.[0]; if (f) { const r = await processImage(f, 'gallery-card'); update(card.id, { imageUrl: r.objectUrl }); } }} />
                    </label>
                    <button type="button" className="btn-action btn-action--danger" onClick={() => update(card.id, { imageUrl: null })}>
                      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>delete</span>
                    </button>
                  </div>
                </div>
              ) : (
                <label className="galeria-card-img-empty galeria-img-label">
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={async e => { const f = e.target.files?.[0]; if (f) { const r = await processImage(f, 'gallery-card'); update(card.id, { imageUrl: r.objectUrl }); } }} />
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>image</span>
                  <span>Imagem (opcional)</span>
                </label>
              )}
            </div>
            <div className="galeria-card-editor__col-fields">
              <input className="nm-field--sm" type="text" placeholder="Título" value={card.titulo}
                onChange={e => update(card.id, { titulo: e.target.value })} />
              <textarea className="nm-field--sm nm-textarea" rows={2} placeholder="Descrição" value={card.descricao}
                onChange={e => update(card.id, { descricao: e.target.value })} />
              <div className="galeria-card-editor__row2">
                <input className="nm-field--sm" type="date" placeholder="Data" value={card.data}
                  onChange={e => update(card.id, { data: e.target.value })} />
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
function SectionEditor({ section, index, onRemove, onUpdateSection }: {
  section: ContentSection;
  index: number;
  onRemove: () => void;
  onUpdateSection: (patch: Partial<ContentSection>) => void;
}) {
  return (
    <div className="sec-editor" id={`sec-${section.id}`}>
      <div className="sec-editor__head">
        <span className="sec-editor__num">{index + 1}</span>
        <span className="sec-editor__label">{SECTION_LABEL[section.type]}</span>
        <button type="button" className="sec-editor__del" onClick={onRemove} title="Remover">
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>delete</span>
        </button>
      </div>
      <div className="sec-editor__body">
        {section.type === 'text' && <RichTextEditor />}

        {section.type === 'image-text' && (
          <div className="sec-two-panel">
            <p className="sec-two-panel__hint">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="8" height="18" rx="1"/><rect x="13" y="3" width="8" height="18" rx="1"/></svg>
              No site, imagem e texto ficam lado a lado
            </p>
            <ImageUpload label="Imagem" ratio="4/3" />
            <RichTextEditor placeholder="Texto da seção..." />
          </div>
        )}

        {section.type === 'bg-image' && (
          <div className="sec-bgimg">
            <ImageUpload label="Imagem de fundo" ratio="21/5" />
            <RichTextEditor placeholder="Texto de destaque sobre a imagem..." />
          </div>
        )}

        {section.type === 'two-col' && (
          <div className="sec-cols">
            <p className="sec-cols__hint">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="8" height="18" rx="1"/><rect x="13" y="3" width="8" height="18" rx="1"/></svg>
              No site, as colunas ficam lado a lado
            </p>
            <RichTextEditor placeholder="Coluna 1..." />
            <RichTextEditor placeholder="Coluna 2..." />
          </div>
        )}

        {section.type === 'three-col' && (
          <div className="sec-cols">
            <p className="sec-cols__hint">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="6" height="18" rx="1"/><rect x="9" y="3" width="6" height="18" rx="1"/><rect x="16" y="3" width="6" height="18" rx="1"/></svg>
              No site, as colunas ficam lado a lado
            </p>
            <RichTextEditor placeholder="Coluna 1..." />
            <RichTextEditor placeholder="Coluna 2..." />
            <RichTextEditor placeholder="Coluna 3..." />
          </div>
        )}

        {section.type === 'image' && (
          <div className="sec-image-container">
            <ImageEditor />
          </div>
        )}

        {section.type === 'image-full' && (
          <div className="sec-image-full">
            <ImageUpload label="Imagem full width" ratio="21/6" />
          </div>
        )}

        {section.type === 'galeria' && (
          <GaleriaEditor
            cards={section.cards ?? []}
            onChange={(cards) => onUpdateSection({ cards })}
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
  const routeState = location.state as { editing?: { id: string; titulo: string; pagina: string; status: string }; pageType?: 'show' | 'galeria' | 'tabela' | 'html' } | null;
  const editing = routeState?.editing ?? null;
  const pageType = editing ? (editing as { pageType?: 'show' | 'galeria' | 'tabela' | 'html' }).pageType ?? 'show' : (routeState?.pageType ?? 'show');
  const isGaleria = pageType === 'galeria';
  const isTabela = pageType === 'tabela';
  const isHtml = pageType === 'html';

  const allDestinos = useCanaisDestinos();

  // Filter destinations by article type compatibility
  const compatiblePageTypes: (string | undefined)[] = isGaleria
    ? ['galeria', 'lista-agrupada', 'lista', 'blog']
    : isTabela
    ? ['tabela']
    : isHtml
    ? ['show', undefined]
    : ['show', undefined];
  const destinos = allDestinos.filter(d => compatiblePageTypes.includes(d.pageType));

  const [title, setTitle] = useState(editing?.titulo ?? (isGaleria && !editing ? 'Comunicados ao Mercado' : ''));
  const [subtitle, setSubtitle] = useState(isGaleria && !editing ? 'Notas, avisos e informações relevantes para investidores.' : '');
  const [sections, setSections] = useState<ContentSection[]>(
    isGaleria || isTabela || isHtml ? [] : [{ id: 'init', type: 'text' }]
  );
  const [htmlContent, setHtmlContent] = useState('');
  const [galeriaCards, setGaleriaCards] = useState<GaleriaCard[]>(
    isGaleria && !editing ? SAMPLE_GALERIA_CARDS : [newCard()]
  );
  const [tabelaHeaders, setTabelaHeaders] = useState<string[]>(['Coluna 1', 'Coluna 2', 'Coluna 3']);
  const [tabelaRows, setTabelaRows] = useState<TabelaRow[]>([
    { id: genRowId(), cells: [{ value: '' }, { value: '' }, { value: '' }] },
    { id: genRowId(), cells: [{ value: '' }, { value: '' }, { value: '' }] },
  ]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCat, setPickerCat] = useState<'all' | SectionCategory>('all');
  const [locale, setLocale] = useState<LocaleCode>(PORTAL_CONFIG.languages[0]);
  const [page, setPage] = useState(editing?.pagina ?? '');
  const selectedDestino = destinos.find(d => d.id === page);
  const pageInheritsHeaderImage = selectedDestino?.canalHasHeaderImage ?? false;
  const pageOccupied = !isGaleria && !isTabela && !isHtml && (selectedDestino?.hasPublishedMateria ?? false);
  const canPublish = title.trim().length > 0 && page.length > 0 && !pageOccupied;
  const [status, setStatus] = useState<PublishStatus>((editing?.status as PublishStatus | undefined) ?? 'draft');
  const [scheduleDate, setScheduleDate] = useState('');
  const [saved, setSaved] = useState(false);
  const [contentType, setContentType] = useState(isGaleria && !editing ? 'Notícia' : '');
  const [dirty, setDirty] = useState(false);

  function markDirty() { setDirty(true); }

  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  function addSection(type: SectionType) {
    const base: ContentSection = { id: Math.random().toString(36).slice(2), type };
    if (type === 'galeria') base.cards = [newCard()];
    setSections((prev) => [...prev, base]);
    setPickerOpen(false);
  }

  function removeSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }

  function updateSection(id: string, patch: Partial<ContentSection>) {
    setSections((prev) => prev.map(s => s.id === id ? { ...s, ...patch } : s));
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
  }

  function scrollTo(id: string) {
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handlePublish(newStatus: PublishStatus) {
    setStatus(newStatus);
    setSaved(true);
    setDirty(false);
    setTimeout(() => setSaved(false), 2500);

    if (page) {
      const dest = destinos.find(d => d.id === page);
      const today = new Date().toLocaleDateString('pt-BR');
      const m = {
        id: editing?.id ?? Math.random().toString(36).slice(2),
        titulo: title || 'Sem título',
        subtitulo: subtitle,
        pageId: page,
        pageLabel: dest?.label ?? page,
        pageType: (isGaleria ? 'galeria' : 'show') as MateriaPageType,
        pageSlugType: dest?.pageType,
        status: newStatus === 'published' ? 'publicado' as const : newStatus === 'scheduled' ? 'agendado' as const : 'rascunho' as const,
        data: today,
        autor: user?.name ?? user?.email ?? 'Usuário',
        ultimaEdicao: today,
        ultimoEditor: user?.name ?? user?.email ?? 'Usuário',
        content: sections,
      };
      persistMateria(m);
      const portalKey = user?.activePortalId;
      if (portalKey) {
        const portalDbId = await resolvePortalId(portalKey);
        if (portalDbId) syncMateriaToSupabase(m, portalDbId);
      }
    }
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

        <input
          className="nm-title-input"
          value={title}
          onChange={(e) => { setTitle(e.target.value); markDirty(); }}
          placeholder={editing ? '' : 'Título da matéria...'}
        />

        <div className="nm-topbar-actions">
          {!canPublish && !pageOccupied && (
            <span className="nm-validation-hint">
              {!title.trim() && !page ? 'Título e página são obrigatórios' :
               !title.trim() ? 'Título obrigatório' :
               'Selecione a página de destino'}
            </span>
          )}
          {editing ? (
            <>
              <button
                type="button"
                className="btn-outline"
                disabled={!canPublish}
                onClick={() => handlePublish('draft')}
              >
                Salvar rascunho
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={!dirty || !canPublish}
                onClick={() => handlePublish(scheduleDate ? 'scheduled' : 'published')}
              >
                {saved ? 'Salvo!' : 'Salvar alterações'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn-outline"
                disabled={!canPublish}
                onClick={() => handlePublish('draft')}
              >
                {saved && status === 'draft' ? 'Salvo!' : 'Salvar como Rascunho'}
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={!canPublish}
                title={pageOccupied ? 'Esta página já possui uma matéria publicada.' : undefined}
                onClick={() => handlePublish(scheduleDate ? 'scheduled' : 'published')}
              >
                {saved && status !== 'draft' ? (status === 'scheduled' ? 'Agendado!' : 'Publicado!') : (scheduleDate ? 'Agendar' : 'Publicar')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Locale tab bar ── */}
      <LangTabs active={locale} onChange={setLocale} />

      {/* ── Body: 3 columns (show) or 2 columns (galeria/html) ── */}
      <div className={`nm-body${isGaleria || isTabela || isHtml ? ' nm-body--galeria' : ''}`}>
        {/* Left: sections list (show only) */}
        {!isGaleria && !isTabela && !isHtml && (
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
              onClick={() => setPickerOpen(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>add</span>
              Nova seção
            </button>
          </aside>
        )}

        {/* Center: content editor */}
        <main className="nm-main">
          <div key={locale} className="lang-fade nm-content-wrap">
            {/* Global fields */}
            <div className="nm-global">
              {!isGaleria && !isTabela && !isHtml && (
                pageInheritsHeaderImage ? (
                  <div className="nm-header-inherited">
                    <span className="material-symbols-outlined" style={{ fontSize: '15px', color: 'var(--color-gray-400)' }}>photo_library</span>
                    <span>Esta página herda a imagem de header do canal.</span>
                  </div>
                ) : (
                  <ImageUpload label="Imagem de header" ratio="21/5" />
                )
              )}
              <input
                className="nm-field nm-field--title"
                value={title}
                onChange={(e) => { setTitle(e.target.value); markDirty(); }}
                placeholder="Título..."
              />
              <input
                className="nm-field nm-field--subtitle"
                value={subtitle}
                onChange={(e) => { setSubtitle(e.target.value); markDirty(); }}
                placeholder="Subtítulo..."
              />
            </div>

            {isTabela ? (
              <TabelaEditor
                rows={tabelaRows}
                headers={tabelaHeaders}
                onChange={(rows, headers) => { setTabelaRows(rows); setTabelaHeaders(headers); markDirty(); }}
              />
            ) : isGaleria ? (
              <GaleriaEditor cards={galeriaCards} onChange={setGaleriaCards} />
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
                  />
                ))}
                <button
                  type="button"
                  className="nm-add-inline"
                  onClick={() => setPickerOpen(true)}
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
              <span className="nm-meta-label">Data de publicação</span>
            </div>
            <input
              type="datetime-local"
              className="nm-date-input"
              value={scheduleDate}
              onChange={(e) => { setScheduleDate(e.target.value); markDirty(); }}
            />
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
                      <option key={d.id} value={d.id} disabled={d.hasPublishedMateria}>
                        {d.label}{d.hasPublishedMateria ? ' (ocupada)' : ''}
                      </option>
                    ))}
                    {Object.entries(groups).map(([parent, items]) => (
                      <optgroup key={parent} label={parent}>
                        {items.map((d) => (
                          <option key={d.id} value={d.id} disabled={d.hasPublishedMateria}>
                            {d.label}{d.hasPublishedMateria ? ' (ocupada)' : ''}
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
          </div>

          {/* Content type */}
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

          {/* SEO */}
          <div className="nm-meta-block">
            <p className="nm-meta-block__title">SEO & Metadados</p>
            <label className="nm-meta-label">Slug</label>
            <input
              className="nm-field nm-field--sm"
              type="text"
              placeholder="minha-materia"
              defaultValue={title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}
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
                {([['all', 'Tudo'], ['texto', 'Texto'], ['layout', 'Layout'], ['midia', 'Mídia']] as const).map(([val, label]) => (
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
