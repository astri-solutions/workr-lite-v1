import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/Modal';
import { useCanaisDestinos } from '../../hooks/useCanaisDestinos';
import '../admin/AdminPages.css';
import './NovaMateriaPage.css';

type SectionType = 'text' | 'image-text' | 'bg-image' | 'two-col' | 'three-col' | 'image' | 'image-full';
type PublishStatus = 'draft' | 'published' | 'scheduled';

interface ContentSection {
  id: string;
  type: SectionType;
}

const SECTION_DEFS: { type: SectionType; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    type: 'text',
    label: 'Bloco de texto',
    desc: 'Título e parágrafos com formatação rica.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="10" x2="16" y2="10"/>
        <line x1="3" y1="14" x2="21" y2="14"/><line x1="3" y1="18" x2="14" y2="18"/>
      </svg>
    ),
  },
  {
    type: 'image-text',
    label: 'Imagem + Texto',
    desc: 'Imagem à esquerda com texto à direita.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="4" width="9" height="16" rx="1"/><line x1="14" y1="8" x2="22" y2="8"/>
        <line x1="14" y1="12" x2="22" y2="12"/><line x1="14" y1="16" x2="19" y2="16"/>
      </svg>
    ),
  },
  {
    type: 'bg-image',
    label: 'Fundo com texto',
    desc: 'Imagem de fundo com sobreposição de texto.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="4" width="20" height="16" rx="1"/>
        <circle cx="8.5" cy="10.5" r="1.5"/><polyline points="22 16 16 10 7 19"/>
        <line x1="6" y1="14" x2="14" y2="14"/>
      </svg>
    ),
  },
  {
    type: 'two-col',
    label: 'Duas colunas',
    desc: 'Dois blocos de texto lado a lado.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="4" width="9" height="16" rx="1"/><rect x="13" y="4" width="9" height="16" rx="1"/>
      </svg>
    ),
  },
  {
    type: 'three-col',
    label: 'Três colunas',
    desc: 'Três blocos de texto lado a lado.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="4" width="6" height="16" rx="1"/><rect x="9" y="4" width="6" height="16" rx="1"/>
        <rect x="17" y="4" width="6" height="16" rx="1"/>
      </svg>
    ),
  },
  {
    type: 'image',
    label: 'Imagem',
    desc: 'Imagem centralizada dentro do container.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="5" width="18" height="14" rx="1"/>
        <circle cx="8.5" cy="10.5" r="1.5"/>
        <polyline points="21 16 16 11 9 18"/>
      </svg>
    ),
  },
  {
    type: 'image-full',
    label: 'Imagem full width',
    desc: 'Imagem de borda a borda, sem container.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="0" y="5" width="24" height="14" rx="0"/>
        <circle cx="8.5" cy="10.5" r="1.5"/>
        <polyline points="24 16 18 11 11 18"/>
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
    document.execCommand(cmd, false, arg);
    ref.current?.focus();
    syncEmpty();
  }

  function syncEmpty() {
    setEmpty((ref.current?.innerText ?? '').trim() === '');
  }

  function handleBlockFormat(val: string) {
    document.execCommand('formatBlock', false, val);
    ref.current?.focus();
  }

  return (
    <div className="rte">
      <div className="rte-toolbar">
        <select
          className="rte-format"
          defaultValue="p"
          onChange={(e) => handleBlockFormat(e.target.value)}
        >
          <option value="p">Parágrafo</option>
          <option value="h1">Título 1</option>
          <option value="h2">Título 2</option>
          <option value="h3">Título 3</option>
          <option value="h4">Título 4</option>
        </select>
        <div className="rte-sep" />
        <button type="button" className="rte-btn" title="Negrito"
          onMouseDown={(e) => { e.preventDefault(); exec('bold'); }}>
          <strong>B</strong>
        </button>
        <button type="button" className="rte-btn rte-btn--italic" title="Itálico"
          onMouseDown={(e) => { e.preventDefault(); exec('italic'); }}>
          <em>I</em>
        </button>
        <button type="button" className="rte-btn rte-btn--underline" title="Sublinhado"
          onMouseDown={(e) => { e.preventDefault(); exec('underline'); }}>
          <u>U</u>
        </button>
        <div className="rte-sep" />
        <button type="button" className="rte-btn" title="Lista"
          onMouseDown={(e) => { e.preventDefault(); exec('insertUnorderedList'); }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/>
            <line x1="9" y1="18" x2="20" y2="18"/>
            <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/>
            <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/>
            <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/>
          </svg>
        </button>
        <button type="button" className="rte-btn" title="Lista numerada"
          onMouseDown={(e) => { e.preventDefault(); exec('insertOrderedList'); }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/>
            <line x1="10" y1="18" x2="21" y2="18"/>
            <path d="M4 6h1v4M4 10H6" strokeLinecap="round"/>
          </svg>
        </button>
        <button type="button" className="rte-btn" title="Link"
          onMouseDown={(e) => {
            e.preventDefault();
            const url = window.prompt('URL:');
            if (url) exec('createLink', url);
          }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
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
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
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
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 2 6 8 2 8"/><polyline points="18 22 18 16 22 16"/>
                <path d="M6 8L18 8a2 2 0 0 1 2 2v8"/><path d="M18 16L6 16a2 2 0 0 1-2-2V6"/>
              </svg>
            </button>
            <button type="button" className="img-editor__btn" title="Redimensionar">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
            <button
              type="button"
              className="img-editor__btn"
              title="Substituir"
              onClick={() => inputRef.current?.click()}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
              </svg>
            </button>
            <button
              type="button"
              className="img-editor__btn img-editor__btn--danger"
              title="Excluir"
              onClick={() => setFile(null)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
              </svg>
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

/* ── Section editor ───────────────────────────────────────── */
function SectionEditor({ section, index, onRemove }: {
  section: ContentSection;
  index: number;
  onRemove: () => void;
}) {
  return (
    <div className="sec-editor" id={`sec-${section.id}`}>
      <div className="sec-editor__head">
        <span className="sec-editor__num">{index + 1}</span>
        <span className="sec-editor__label">{SECTION_LABEL[section.type]}</span>
        <button type="button" className="sec-editor__del" onClick={onRemove} title="Remover">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
          </svg>
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
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────── */
export default function NovaMateriaPage() {
  const navigate = useNavigate();
  const destinos = useCanaisDestinos();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [sections, setSections] = useState<ContentSection[]>([
    { id: 'init', type: 'text' },
  ]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [locale, setLocale] = useState('pt-BR');
  const [page, setPage] = useState('');
  const [status, setStatus] = useState<PublishStatus>('draft');
  const [scheduleDate, setScheduleDate] = useState('');
  const [saved, setSaved] = useState(false);

  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  function addSection(type: SectionType) {
    setSections((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2), type },
    ]);
    setPickerOpen(false);
  }

  function removeSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
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
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Matérias
        </button>

        <input
          className="nm-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título da matéria..."
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
                <svg className="nm-section-item__grip" width="12" height="12" viewBox="0 0 12 16" fill="currentColor">
                  <circle cx="3" cy="2" r="1.5"/><circle cx="9" cy="2" r="1.5"/>
                  <circle cx="3" cy="7" r="1.5"/><circle cx="9" cy="7" r="1.5"/>
                  <circle cx="3" cy="12" r="1.5"/><circle cx="9" cy="12" r="1.5"/>
                </svg>
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
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nova seção
          </button>
        </aside>

        {/* Center: content editor */}
        <main className="nm-main">
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
            />
          ))}

          {/* Add more */}
          <button
            type="button"
            className="nm-add-inline"
            onClick={() => setPickerOpen(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Adicionar seção
          </button>
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
              <svg className="nm-picker-item__arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
