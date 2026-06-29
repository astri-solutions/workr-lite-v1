import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Modal from '../../components/Modal';
import { useCanaisDestinos } from '../../hooks/useCanaisDestinos';
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

const SECTION_DEFS: { type: SectionType; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    type: 'text',
    label: 'Bloco de texto',
    desc: 'Título e parágrafos com formatação rica.',
    icon: <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>text_fields</span>,
  },
  {
    type: 'image-text',
    label: 'Imagem + Texto',
    desc: 'Imagem à esquerda com texto à direita.',
    icon: <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>view_sidebar</span>,
  },
  {
    type: 'bg-image',
    label: 'Fundo com texto',
    desc: 'Imagem de fundo com sobreposição de texto.',
    icon: <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>panorama</span>,
  },
  {
    type: 'two-col',
    label: 'Duas colunas',
    desc: 'Dois blocos de texto lado a lado.',
    icon: <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>view_column</span>,
  },
  {
    type: 'three-col',
    label: 'Três colunas',
    desc: 'Três blocos de texto lado a lado.',
    icon: <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>view_week</span>,
  },
  {
    type: 'image',
    label: 'Imagem',
    desc: 'Imagem centralizada dentro do container.',
    icon: <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>image</span>,
  },
  {
    type: 'image-full',
    label: 'Imagem full width',
    desc: 'Imagem de borda a borda, sem container.',
    icon: <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>panorama_wide_angle</span>,
  },
  {
    type: 'galeria',
    label: 'Galeria',
    desc: 'Cards com título, descrição, data, link e imagem opcional.',
    icon: <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>grid_view</span>,
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

const LOCALES = [
  { code: 'pt-BR', label: 'PT-BR', flag: '🇧🇷' },
  { code: 'en', label: 'EN', flag: '🇺🇸' },
  { code: 'es', label: 'ES', flag: '🇪🇸' },
];


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
  return (
    <div className="img-upload" style={{ aspectRatio: ratio }}>
      <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>image</span>
      <span className="img-upload__label">{label}</span>
      <button type="button" className="img-upload__btn">Escolher arquivo</button>
    </div>
  );
}

/* ── Inline image editor (container-width image) ──────────── */
function ImageEditor() {
  const [file, setFile] = useState<{ name: string; url: string; w: number; h: number } | null>(null);
  const [alt, setAlt] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => setFile({ name: f.name, url, w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
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

function GaleriaEditor({ cards, onChange }: { cards: GaleriaCard[]; onChange: (cards: GaleriaCard[]) => void }) {
  function update(id: string, patch: Partial<GaleriaCard>) {
    onChange(cards.map(c => c.id === id ? { ...c, ...patch } : c));
  }
  function remove(id: string) { onChange(cards.filter(c => c.id !== id)); }
  function add() { onChange([...cards, newCard()]); }

  return (
    <div className="galeria-editor">
      {cards.map((card, i) => (
        <div key={card.id} className="galeria-card-editor">
          <div className="galeria-card-editor__header">
            <span className="galeria-card-editor__num">Card {i + 1}</span>
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
                        onChange={e => { const f = e.target.files?.[0]; if (f) update(card.id, { imageUrl: URL.createObjectURL(f) }); }} />
                    </label>
                    <button type="button" className="btn-action btn-action--danger" onClick={() => update(card.id, { imageUrl: null })}>
                      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>delete</span>
                    </button>
                  </div>
                </div>
              ) : (
                <label className="galeria-card-img-empty galeria-img-label">
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) update(card.id, { imageUrl: URL.createObjectURL(f) }); }} />
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
            <ImageUpload label="Imagem" ratio="4/3" />
            <RichTextEditor placeholder="Texto da seção..." />
          </div>
        )}

        {section.type === 'bg-image' && (
          <div className="sec-bgimg">
            <ImageUpload label="Imagem de fundo" ratio="21/5" />
            <input className="nm-field" type="text" placeholder="Texto de destaque sobre a imagem..." />
          </div>
        )}

        {section.type === 'two-col' && (
          <div className="sec-cols sec-cols--2">
            <RichTextEditor placeholder="Coluna 1..." />
            <RichTextEditor placeholder="Coluna 2..." />
          </div>
        )}

        {section.type === 'three-col' && (
          <div className="sec-cols sec-cols--3">
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
  const editing = (location.state as { editing?: { id: string; titulo: string; pagina: string; status: string } } | null)?.editing ?? null;

  const destinos = useCanaisDestinos();
  const [title, setTitle] = useState(editing?.titulo ?? '');
  const [subtitle, setSubtitle] = useState('');
  const [sections, setSections] = useState<ContentSection[]>([
    { id: 'init', type: 'text' },
  ]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [locale, setLocale] = useState('pt-BR');
  const [page, setPage] = useState(editing?.pagina ?? '');
  const [status, setStatus] = useState<PublishStatus>((editing?.status as PublishStatus | undefined) ?? 'draft');
  const [scheduleDate, setScheduleDate] = useState('');
  const [saved, setSaved] = useState(false);

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

  function handlePublish(newStatus: PublishStatus) {
    setStatus(newStatus);
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

        <input
          className="nm-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={editing ? '' : 'Título da matéria...'}
        />

        <div className="nm-topbar-actions">
          <span className={`badge ${badgeClass[status]}`}>{statusLabel[status]}</span>
          <button
            type="button"
            className="btn-action btn-action--secondary"
            onClick={() => handlePublish('draft')}
          >
            Salvar rascunho
          </button>
          <button
            type="button"
            className="btn-action btn-action--secondary"
            onClick={() => handlePublish('scheduled')}
          >
            Agendar
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => handlePublish('published')}
          >
            {saved && status === 'published' ? 'Publicado!' : 'Publicar'}
          </button>
        </div>
      </div>

      {/* ── Locale tab bar ── */}
      <div className="nm-locale-bar">
        {LOCALES.map((l) => (
          <button
            key={l.code}
            type="button"
            className={`nm-locale-tab${locale === l.code ? ' nm-locale-tab--active' : ''}`}
            onClick={() => setLocale(l.code)}
          >
            <span className="nm-locale-tab__flag">{l.flag}</span>
            {l.label}
          </button>
        ))}
      </div>

      {/* ── Body: 3 columns ── */}
      <div className="nm-body">
        {/* Left: sections list */}
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

        {/* Center: content editor */}
        <main className="nm-main">
          <div key={locale} className="nm-locale-fade nm-content-wrap">
            {/* Global fields */}
            <div className="nm-global">
              <ImageUpload label="Imagem de header" ratio="21/5" />
              <input
                className="nm-field nm-field--title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título..."
              />
              <input
                className="nm-field nm-field--subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Subtítulo..."
              />
            </div>

            {/* Section editors */}
            {sections.map((s, i) => (
              <SectionEditor
                key={s.id}
                section={s}
                index={i}
                onRemove={() => removeSection(s.id)}
                onUpdateSection={(patch) => updateSection(s.id, patch)}
              />
            ))}

            {/* Add more */}
            <button
              type="button"
              className="nm-add-inline"
              onClick={() => setPickerOpen(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
              Adicionar seção
            </button>
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
              onChange={(e) => setScheduleDate(e.target.value)}
            />
          </div>

          {/* Page destination */}
          <div className="nm-meta-block">
            <p className="nm-meta-block__title">Página de destino</p>
            <select
              className="filter-select nm-meta-select"
              value={page}
              onChange={(e) => setPage(e.target.value)}
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
                      <option key={d.id} value={d.id}>{d.label}</option>
                    ))}
                    {Object.entries(groups).map(([parent, items]) => (
                      <optgroup key={parent} label={parent}>
                        {items.map((d) => (
                          <option key={d.id} value={d.id}>{d.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </>
                );
              })()}
            </select>
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

      {/* ── Section type picker modal ── */}
      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Escolher tipo de seção"
        size="md"
      >
        <div className="nm-picker">
          {SECTION_DEFS.map((def) => (
            <button
              key={def.type}
              type="button"
              className="nm-picker-item"
              onClick={() => addSection(def.type)}
            >
              <span className="nm-picker-item__icon">{def.icon}</span>
              <div className="nm-picker-item__info">
                <span className="nm-picker-item__label">{def.label}</span>
                <span className="nm-picker-item__desc">{def.desc}</span>
              </div>
              <span className="material-symbols-outlined nm-picker-item__arrow" style={{ fontSize: '14px' }}>chevron_right</span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
