import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LangTabs from '../../components/LangTabs';
import PORTAL_CONFIG, { LocaleCode } from '../../portalConfig';
import '../admin/AdminPages.css';
import './NovaMateriaPage.css';
import './NovoFormularioPage.css';

type FieldType = 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'date';
type PublishStatus = 'draft' | 'published' | 'scheduled';

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder: string;
  required: boolean;
  options: string; // comma-separated, for select type
}

const FIELD_DEFS: { type: FieldType; label: string; icon: string }[] = [
  { type: 'text',     label: 'Texto curto',   icon: 'short_text' },
  { type: 'email',    label: 'E-mail',         icon: 'alternate_email' },
  { type: 'phone',    label: 'Telefone',       icon: 'phone' },
  { type: 'textarea', label: 'Texto longo',    icon: 'notes' },
  { type: 'select',   label: 'Seleção',        icon: 'list' },
  { type: 'checkbox', label: 'Checkbox',       icon: 'check_box' },
  { type: 'date',     label: 'Data',           icon: 'calendar_today' },
];

const FIELD_ICON: Record<FieldType, string> = {
  text: 'short_text', email: 'alternate_email', phone: 'phone',
  textarea: 'notes', select: 'list', checkbox: 'check_box', date: 'calendar_today',
};

function newField(type: FieldType = 'text'): FormField {
  return { id: Math.random().toString(36).slice(2), type, label: '', placeholder: '', required: false, options: '' };
}

const DEFAULT_FIELDS: FormField[] = [
  { id: 'f1', type: 'text',     label: 'Nome',      placeholder: 'Seu nome completo',     required: true,  options: '' },
  { id: 'f2', type: 'email',    label: 'E-mail',    placeholder: 'seu@email.com',         required: true,  options: '' },
  { id: 'f3', type: 'phone',    label: 'Telefone',  placeholder: '(11) 90000-0000',       required: false, options: '' },
  { id: 'f4', type: 'textarea', label: 'Mensagem',  placeholder: 'Escreva sua mensagem…', required: true,  options: '' },
];

export default function NovoFormularioPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as { editing?: { titulo?: string; pagina?: string; status?: string } } | null;
  const editing = routeState?.editing ?? null;

  const [locale, setLocale] = useState<LocaleCode>(PORTAL_CONFIG.languages[0]);
  const [titles, setTitles] = useState<Record<string, string>>({ [PORTAL_CONFIG.languages[0]]: editing?.titulo ?? '' });
  const [subtitles, setSubtitles] = useState<Record<string, string>>({});
  const [submitLabels, setSubmitLabels] = useState<Record<string, string>>({});
  const [successMessages, setSuccessMessages] = useState<Record<string, string>>({});
  const [fields, setFields] = useState<FormField[]>(DEFAULT_FIELDS);
  const [receiverEmail, setReceiverEmail] = useState('');
  const [replyTo, setReplyTo] = useState(false);
  const [page, setPage] = useState(editing?.pagina ?? '');
  const [status, setStatus] = useState<PublishStatus>((editing?.status as PublishStatus | undefined) ?? 'draft');
  const [scheduleDate, setScheduleDate] = useState('');
  const [saved, setSaved] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const PAGINAS = ['Início', 'Resultados', 'Governança', 'Comunicados', 'Eventos', 'Press Release', 'Sobre', 'Contato'];

  function addField(type: FieldType) {
    const f = newField(type);
    setFields(prev => [...prev, f]);
    setEditingField(f.id);
    setPickerOpen(false);
  }

  function removeField(id: string) {
    setFields(prev => prev.filter(f => f.id !== id));
    if (editingField === id) setEditingField(null);
  }

  function updateField(id: string, patch: Partial<FormField>) {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex.current === null || dragIndex.current === targetIndex) {
      dragIndex.current = null; setDragOver(null); return;
    }
    setFields(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex.current!, 1);
      next.splice(targetIndex, 0, moved);
      dragIndex.current = null; setDragOver(null);
      return next;
    });
  }

  function handleSave(nextStatus: PublishStatus) {
    setStatus(nextStatus);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const activeField = fields.find(f => f.id === editingField) ?? null;

  return (
    <div className="nm-page">
      <div className="nm-topbar">
        <button className="nm-back" type="button" onClick={() => navigate('/portal/materias')}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
          Matérias
        </button>
        <div className="nm-topbar__actions">
          <button className="btn-outline" type="button" onClick={() => handleSave('draft')}>
            {saved && status === 'draft' ? 'Salvo!' : 'Salvar rascunho'}
          </button>
          <button className="btn-primary" type="button" onClick={() => handleSave('published')}>
            {saved && status === 'published' ? 'Publicado!' : 'Publicar'}
          </button>
        </div>
      </div>

      <LangTabs active={locale} onChange={setLocale} />

      <div className="nm-layout">
        {/* ── Main editor ── */}
        <div className="nm-main">

          {/* Page info */}
          <div className="nm-meta-card" key={locale}>
            <div className="nm-meta-card__row">
              <label className="nm-meta-label">
                Título da página
                <input
                  className="nm-meta-input lang-fade"
                  type="text"
                  placeholder="Ex: Fale conosco"
                  value={titles[locale] ?? ''}
                  onChange={e => setTitles(p => ({ ...p, [locale]: e.target.value }))}
                />
              </label>
              <label className="nm-meta-label">
                Subtítulo <span className="nm-meta-optional">(opcional)</span>
                <input
                  className="nm-meta-input lang-fade"
                  type="text"
                  placeholder="Breve descrição do formulário"
                  value={subtitles[locale] ?? ''}
                  onChange={e => setSubtitles(p => ({ ...p, [locale]: e.target.value }))}
                />
              </label>
            </div>
          </div>

          {/* Fields list */}
          <div className="nf-section-header">
            <span>Campos do formulário</span>
            <button type="button" className="btn-outline nf-add-field-btn" onClick={() => setPickerOpen(true)}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>add</span>
              Adicionar campo
            </button>
          </div>

          <div className="nf-fields-list">
            {fields.map((field, idx) => (
              <div
                key={field.id}
                className={`nf-field-row${editingField === field.id ? ' nf-field-row--active' : ''}${dragOver === idx ? ' nf-field-row--drag-over' : ''}`}
                draggable
                onDragStart={() => { dragIndex.current = idx; }}
                onDragOver={e => { e.preventDefault(); setDragOver(idx); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(idx)}
              >
                <span className="nf-field-row__drag material-symbols-outlined">drag_indicator</span>
                <span className="material-symbols-outlined nf-field-row__icon">{FIELD_ICON[field.type]}</span>
                <div className="nf-field-row__body" onClick={() => setEditingField(editingField === field.id ? null : field.id)}>
                  <span className="nf-field-row__label">{field.label || <em>Sem rótulo</em>}</span>
                  <span className="nf-field-row__type">{FIELD_DEFS.find(d => d.type === field.type)?.label}</span>
                </div>
                {field.required && <span className="nf-field-row__required">Obrigatório</span>}
                <button type="button" className="nf-field-row__remove" onClick={() => removeField(field.id)}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                </button>
              </div>
            ))}

            {fields.length === 0 && (
              <div className="nf-fields-empty">Nenhum campo adicionado. Clique em "Adicionar campo" para começar.</div>
            )}
          </div>

          {/* Inline field editor */}
          {activeField && (
            <div className="nf-field-editor">
              <div className="nf-field-editor__title">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{FIELD_ICON[activeField.type]}</span>
                {FIELD_DEFS.find(d => d.type === activeField.type)?.label}
              </div>
              <div className="nf-field-editor__grid">
                <label className="nm-meta-label">
                  Rótulo
                  <input className="nm-meta-input" type="text" placeholder="Ex: Nome completo"
                    value={activeField.label}
                    onChange={e => updateField(activeField.id, { label: e.target.value })} />
                </label>
                {activeField.type !== 'checkbox' && (
                  <label className="nm-meta-label">
                    Placeholder
                    <input className="nm-meta-input" type="text" placeholder="Ex: Digite aqui…"
                      value={activeField.placeholder}
                      onChange={e => updateField(activeField.id, { placeholder: e.target.value })} />
                  </label>
                )}
                {activeField.type === 'select' && (
                  <label className="nm-meta-label nf-field-editor__full">
                    Opções <span className="nm-meta-optional">(separadas por vírgula)</span>
                    <input className="nm-meta-input" type="text" placeholder="Opção 1, Opção 2, Opção 3"
                      value={activeField.options}
                      onChange={e => updateField(activeField.id, { options: e.target.value })} />
                  </label>
                )}
                <label className="nf-field-editor__check">
                  <input type="checkbox" checked={activeField.required}
                    onChange={e => updateField(activeField.id, { required: e.target.checked })} />
                  Campo obrigatório
                </label>
              </div>
            </div>
          )}

          {/* Field type picker */}
          {pickerOpen && (
            <div className="nf-picker">
              <div className="nf-picker__header">
                <span>Escolher tipo de campo</span>
                <button type="button" onClick={() => setPickerOpen(false)}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                </button>
              </div>
              <div className="nf-picker__grid">
                {FIELD_DEFS.map(d => (
                  <button key={d.type} type="button" className="nf-picker__btn" onClick={() => addField(d.type)}>
                    <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>{d.icon}</span>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Submit label + success message (per language) */}
          <div className="nf-section-header" style={{ marginTop: 'var(--space-4)' }}>Textos do formulário</div>
          <div className="nm-meta-card" key={`texts-${locale}`}>
            <div className="nm-meta-card__row">
              <label className="nm-meta-label">
                Texto do botão de envio
                <input className="nm-meta-input lang-fade" type="text" placeholder="Ex: Enviar mensagem"
                  value={submitLabels[locale] ?? ''}
                  onChange={e => setSubmitLabels(p => ({ ...p, [locale]: e.target.value }))} />
              </label>
              <label className="nm-meta-label">
                Mensagem de sucesso
                <input className="nm-meta-input lang-fade" type="text" placeholder="Ex: Mensagem enviada com sucesso!"
                  value={successMessages[locale] ?? ''}
                  onChange={e => setSuccessMessages(p => ({ ...p, [locale]: e.target.value }))} />
              </label>
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <aside className="nm-sidebar">

          {/* Publicação */}
          <div className="nm-sidebar-card">
            <div className="nm-sidebar-card__title">Publicação</div>
            <label className="nm-meta-label">
              Página destino
              <select className="nm-meta-select" value={page} onChange={e => setPage(e.target.value)}>
                <option value="">Selecionar página</option>
                {PAGINAS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="nm-meta-label" style={{ marginTop: 'var(--space-3)' }}>
              Status
              <select className="nm-meta-select" value={status} onChange={e => setStatus(e.target.value as PublishStatus)}>
                <option value="draft">Rascunho</option>
                <option value="published">Publicado</option>
                <option value="scheduled">Agendado</option>
              </select>
            </label>
            {status === 'scheduled' && (
              <label className="nm-meta-label" style={{ marginTop: 'var(--space-3)' }}>
                Data de publicação
                <input className="nm-meta-input" type="datetime-local" value={scheduleDate}
                  onChange={e => setScheduleDate(e.target.value)} />
              </label>
            )}
          </div>

          {/* Recebimento */}
          <div className="nm-sidebar-card">
            <div className="nm-sidebar-card__title">Recebimento de respostas</div>
            <label className="nm-meta-label">
              E-mail de recebimento
              <input className="nm-meta-input" type="email" placeholder="contato@empresa.com.br"
                value={receiverEmail}
                onChange={e => setReceiverEmail(e.target.value)} />
            </label>
            <label className="nf-field-editor__check" style={{ marginTop: 'var(--space-3)' }}>
              <input type="checkbox" checked={replyTo} onChange={e => setReplyTo(e.target.checked)} />
              <span>Responder para o e-mail do remetente <span className="nm-meta-optional">(se o formulário tiver campo e-mail)</span></span>
            </label>
          </div>

        </aside>
      </div>
    </div>
  );
}
