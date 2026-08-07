import { useState, useEffect, useRef } from 'react';
import { processImageToDataUrl } from '../../utils/imageProcessor';
import StickyPageHeader from '../../components/StickyPageHeader';
import LangTabs from '../../components/LangTabs';
import Modal from '../../components/Modal';
import PORTAL_CONFIG, { LocaleCode } from '../../portalConfig';
import { usePortalName } from '../../hooks/usePortalName';
import { usePortalState } from '../../hooks/usePortalState';
import { savePortalConfig } from '../../lib/portalConfigApi';
import { useActivePortalId } from '../../hooks/useActivePortalId';
import { resolvePortalId } from '../../lib/portalDb';
import { usePublish } from '../../contexts/PublishContext';
import PublishButton from '../../components/PublishButton';
import MediaPicker from '../../components/MediaPicker';
import '../admin/AdminPages.css';
import './SplashPage.css';
import './PersonalizarPages.css';

export const SPLASH_KEY = 'portal_splash';
const SPLASH_HISTORY_KEY = 'portal_splash_history';
const SPLASH_TEMPLATES_KEY = 'portal_splash_templates';
// Splash used to live across two routes (Novo / Templates) — every portal
// that bookmarked or linked the old templates URL lands on a redirect to
// here now (see App.tsx), so nothing else needs to know this ever existed.

export type SplashSize = 'sm' | 'md' | 'lg';

export interface SplashBtn {
  label: string;
  url: string;
  variant: 'primary' | 'outline';
}

// Title/intro/body/caption AND the header image are all per-locale — each
// site language shows genuinely different content, same pattern as Footer's
// address/copyright/etc and NovaMateriaPage's per-locale section images.
// `string` legacy shape below (reviveSplash) is every splash saved before
// this existed, when LangTabs was purely cosmetic — content stayed the same
// no matter which language tab was active. `imageUrl` too: only one header
// image existed for every language.
export interface SplashTexts {
  titulo: string;
  texto: string;
  conteudo: string;
  legenda: string;
  imageUrl: string | null;
}

// A splash is now a scheduled "campaign", not a single always-on record —
// `id` lets a card in "Últimos modelos usados" recognize whether it IS the
// one currently configured (comparing ids), `publishAt`/`unpublishAt` gate
// visibility on the live site by date, and `updatedAt` orders the history
// list (most recently saved first).
export interface SplashConfig {
  id: string;
  enabled: boolean;
  size: SplashSize;
  buttons: SplashBtn[];
  content: Partial<Record<string, SplashTexts>>;
  publishAt: string | null;
  unpublishAt: string | null;
  updatedAt: string;
}

export interface SplashTemplate {
  id: string;
  nome: string;
  // Everything but `enabled`/schedule — a saved template is reusable
  // text/button content, not "turn this splash on from this date". Per-locale
  // text, but never an image (a template is text you reapply across
  // portals/announcements, not someone else's specific header photo).
  config: {
    size: SplashSize;
    buttons: SplashBtn[];
    content: Partial<Record<string, Omit<SplashTexts, 'imageUrl'>>>;
  };
}

// Ready-made content for the announcements a splash is actually used for
// most — pick one, land in the editor with it pre-filled, tweak the text.
// Not stored per-portal (unlike a saved template): these ship with the app,
// the same for every portal.
const splashPrimaryLang = PORTAL_CONFIG.languages[0];
const BUILT_IN_TEMPLATES: SplashTemplate[] = [
  {
    id: 'builtin-fato-relevante',
    nome: 'Fato Relevante',
    config: {
      size: 'md',
      content: { [splashPrimaryLang]: {
        titulo: 'Fato Relevante',
        texto: 'A Companhia comunica aos seus acionistas e ao mercado em geral o seguinte Fato Relevante:',
        conteudo: 'Descreva aqui o conteúdo completo do Fato Relevante, incluindo contexto, decisão tomada e seus efeitos esperados.',
        legenda: '',
      } },
      buttons: [{ label: 'Ver documento completo', url: '', variant: 'primary' }],
    },
  },
  {
    id: 'builtin-comunicado-mercado',
    nome: 'Comunicado ao Mercado',
    config: {
      size: 'md',
      content: { [splashPrimaryLang]: {
        titulo: 'Comunicado ao Mercado',
        texto: 'A Companhia vem a público prestar o seguinte esclarecimento:',
        conteudo: 'Descreva aqui o conteúdo do comunicado.',
        legenda: '',
      } },
      buttons: [{ label: 'Saiba mais', url: '', variant: 'primary' }],
    },
  },
  {
    id: 'builtin-convocacao-ago',
    nome: 'Convocação AGO',
    config: {
      size: 'lg',
      content: { [splashPrimaryLang]: {
        titulo: 'Convocação para Assembleia Geral Ordinária',
        texto: 'Ficam os senhores acionistas convocados para a Assembleia Geral Ordinária a ser realizada conforme os termos abaixo.',
        conteudo: 'Data, horário, local (ou modalidade digital) e ordem do dia da assembleia.',
        legenda: 'Dúvidas: fale com a área de Relações com Investidores.',
      } },
      buttons: [{ label: 'Ver edital de convocação', url: '', variant: 'primary' }],
    },
  },
  {
    id: 'builtin-aviso-manutencao',
    nome: 'Aviso de Manutenção',
    config: {
      size: 'sm',
      content: { [splashPrimaryLang]: {
        titulo: 'Manutenção Programada',
        texto: 'Este site passará por uma manutenção programada e pode ficar temporariamente indisponível.',
        conteudo: '',
        legenda: '',
      } },
      buttons: [],
    },
  },
];

const SIZE_OPTIONS: { id: SplashSize; label: string; desc: string; thumb: React.ReactNode }[] = [
  {
    id: 'sm',
    label: 'Pequeno',
    desc: 'Comunicados curtos e alertas rápidos.',
    thumb: (
      <svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg" className="splash-thumb-svg">
        <rect width="160" height="100" fill="#e5e7eb" rx="4" />
        <rect width="160" height="100" fill="#141414" opacity="0.55" rx="4" />
        <rect x="48" y="22" width="64" height="56" rx="5" fill="#fff" />
        <rect x="48" y="22" width="64" height="18" rx="5" fill="#d1d5db" />
        <rect x="48" y="35" width="64" height="5" rx="2" fill="#d1d5db" />
        <rect x="54" y="46" width="52" height="4" rx="2" fill="#e5e7eb" />
        <rect x="54" y="54" width="44" height="4" rx="2" fill="#e5e7eb" />
        <rect x="54" y="62" width="36" height="4" rx="2" fill="#e5e7eb" />
        <rect x="62" y="70" width="36" height="6" rx="3" fill="#0B5B68" />
      </svg>
    ),
  },
  {
    id: 'md',
    label: 'Médio',
    desc: 'Formato padrão para comunicados completos.',
    thumb: (
      <svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg" className="splash-thumb-svg">
        <rect width="160" height="100" fill="#e5e7eb" rx="4" />
        <rect width="160" height="100" fill="#141414" opacity="0.55" rx="4" />
        <rect x="24" y="14" width="112" height="72" rx="5" fill="#fff" />
        <rect x="24" y="14" width="112" height="22" rx="5" fill="#d1d5db" />
        <rect x="24" y="29" width="112" height="7" rx="2" fill="#d1d5db" />
        <rect x="32" y="44" width="96" height="4" rx="2" fill="#e5e7eb" />
        <rect x="32" y="52" width="80" height="4" rx="2" fill="#e5e7eb" />
        <rect x="32" y="60" width="88" height="4" rx="2" fill="#e5e7eb" />
        <rect x="40" y="70" width="36" height="6" rx="3" fill="#0B5B68" />
        <rect x="82" y="70" width="36" height="6" rx="3" fill="#fff" stroke="#d1d5db" strokeWidth="1" />
      </svg>
    ),
  },
  {
    id: 'lg',
    label: 'Largo',
    desc: 'Conteúdo extenso com muito espaço para texto.',
    thumb: (
      <svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg" className="splash-thumb-svg">
        <rect width="160" height="100" fill="#e5e7eb" rx="4" />
        <rect width="160" height="100" fill="#141414" opacity="0.55" rx="4" />
        <rect x="8" y="10" width="144" height="80" rx="5" fill="#fff" />
        <rect x="8" y="10" width="144" height="24" rx="5" fill="#d1d5db" />
        <rect x="8" y="27" width="144" height="7" rx="2" fill="#d1d5db" />
        <rect x="18" y="42" width="124" height="4" rx="2" fill="#e5e7eb" />
        <rect x="18" y="50" width="110" height="4" rx="2" fill="#e5e7eb" />
        <rect x="18" y="58" width="116" height="4" rx="2" fill="#e5e7eb" />
        <rect x="18" y="66" width="100" height="4" rx="2" fill="#e5e7eb" />
        <rect x="36" y="76" width="36" height="6" rx="3" fill="#0B5B68" />
        <rect x="80" y="76" width="36" height="6" rx="3" fill="#fff" stroke="#d1d5db" strokeWidth="1" />
      </svg>
    ),
  },
];

const SIZE_PX: Record<SplashSize, number> = { sm: 360, md: 540, lg: 740 };
const SIZE_LABEL: Record<SplashSize, string> = { sm: 'Pequeno', md: 'Médio', lg: 'Largo' };

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function emptyBtn(): SplashBtn {
  return { label: '', url: '', variant: 'primary' };
}

function emptySplashTexts(): SplashTexts {
  return { titulo: '', texto: '', conteudo: '', legenda: '', imageUrl: null };
}

function textsOf(cfg: SplashConfig, lang: string): SplashTexts {
  return cfg.content[lang] ?? cfg.content[splashPrimaryLang] ?? emptySplashTexts();
}

export const DEFAULT_SPLASH: SplashConfig = {
  id: 'default',
  enabled: false,
  size: 'md',
  buttons: [],
  content: {},
  publishAt: null,
  unpublishAt: null,
  updatedAt: '',
};

function emptyCampaign(): SplashConfig {
  return {
    id: genId(),
    enabled: false,
    size: 'md',
    buttons: [],
    content: {},
    publishAt: null,
    unpublishAt: null,
    updatedAt: new Date().toISOString(),
  };
}

// Every splash saved before content became per-locale (or before scheduling
// existed) had a flatter shape — normalize both gaps once, on read, instead
// of teaching every read site to understand every past shape.
function reviveSplash(stored: unknown): SplashConfig {
  const s = (stored ?? {}) as Partial<SplashConfig> & Partial<SplashTexts>;
  let content = s.content;
  if (!content) {
    const hasLegacyText = s.titulo != null || s.texto != null || s.conteudo != null || s.legenda != null || s.imageUrl != null;
    content = hasLegacyText
      ? { [splashPrimaryLang]: { titulo: s.titulo ?? '', texto: s.texto ?? '', conteudo: s.conteudo ?? '', legenda: s.legenda ?? '', imageUrl: s.imageUrl ?? null } }
      : {};
  }
  return {
    id: s.id ?? 'legacy',
    enabled: s.enabled ?? false,
    size: s.size ?? 'md',
    buttons: s.buttons ?? [],
    content,
    publishAt: s.publishAt ?? null,
    unpublishAt: s.unpublishAt ?? null,
    updatedAt: s.updatedAt ?? '',
  };
}

// Same legacy shape as reviveSplash above, but for a saved/built-in
// template's `config` (no `enabled`/schedule, no `imageUrl`). Templates
// persisted before content became per-locale crash every reader that
// assumes `config.content` exists without this.
export function reviveTemplateConfig(stored: unknown): SplashTemplate['config'] {
  const s = (stored ?? {}) as Partial<SplashTemplate['config']> & Partial<Omit<SplashTexts, 'imageUrl'>>;
  if (s.content) {
    return { size: s.size ?? 'md', buttons: s.buttons ?? [], content: s.content };
  }
  const hasLegacyText = s.titulo != null || s.texto != null || s.conteudo != null || s.legenda != null;
  return {
    size: s.size ?? 'md',
    buttons: s.buttons ?? [],
    content: hasLegacyText
      ? { [splashPrimaryLang]: { titulo: s.titulo ?? '', texto: s.texto ?? '', conteudo: s.conteudo ?? '', legenda: s.legenda ?? '' } }
      : {},
  };
}

type SplashStatus = 'ativo' | 'agendado' | 'encerrado' | 'inativo';
const STATUS_LABEL: Record<SplashStatus, string> = {
  ativo: 'Ativo agora',
  agendado: 'Agendado',
  encerrado: 'Encerrado',
  inativo: 'Desativado',
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function statusOf(entry: SplashConfig): SplashStatus {
  if (!entry.enabled) return 'inativo';
  const today = todayStr();
  if (entry.publishAt && today < entry.publishAt) return 'agendado';
  if (entry.unpublishAt && today > entry.unpublishAt) return 'encerrado';
  return 'ativo';
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function SplashPage() {
  const portalName = usePortalName();
  const activePortalId = useActivePortalId();
  const { publish } = usePublish();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [portalDbId, setPortalDbId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  useEffect(() => {
    if (!activePortalId) return;
    resolvePortalId(activePortalId).then(setPortalDbId).catch(() => {});
  }, [activePortalId]);

  const [persisted, setPersisted, { saveError }] = usePortalState<SplashConfig>(SPLASH_KEY, 'splash', DEFAULT_SPLASH);
  const current = reviveSplash(persisted);

  const [history, setHistory] = usePortalState<SplashConfig[]>(SPLASH_HISTORY_KEY, 'splash_history', []);
  const revivedHistory = history.map(reviveSplash);

  const [templatesRaw, setTemplates] = usePortalState<SplashTemplate[]>(SPLASH_TEMPLATES_KEY, 'splash_templates', []);
  const templates = templatesRaw.map(t => ({ ...t, config: reviveTemplateConfig(t.config) }));

  const [draft, setDraft] = useState<SplashConfig | null>(null);
  const draftBaseline = useRef<string>('');
  const [activeLang, setActiveLang] = useState<LocaleCode>(PORTAL_CONFIG.languages[0]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [confirmDeleteTpl, setConfirmDeleteTpl] = useState<SplashTemplate | null>(null);

  function pushHistory(entry: SplashConfig) {
    setHistory([entry, ...history.filter(h => h.id !== entry.id)].slice(0, 5));
  }

  function openDrawer(campaign: SplashConfig) {
    setDraft(campaign);
    draftBaseline.current = JSON.stringify(campaign);
    setActiveLang(PORTAL_CONFIG.languages[0]);
    setSaved(false);
  }

  function openNew() {
    openDrawer(emptyCampaign());
  }

  function openEdit(entry: SplashConfig) {
    openDrawer(JSON.parse(JSON.stringify(entry)));
  }

  function applyTemplate(tpl: SplashTemplate) {
    const base = emptyCampaign();
    const content: Partial<Record<string, SplashTexts>> = {};
    for (const [lang, t] of Object.entries(tpl.config.content)) {
      if (!t) continue;
      content[lang] = { ...emptySplashTexts(), ...t };
    }
    openDrawer({ ...base, size: tpl.config.size, buttons: tpl.config.buttons, content, enabled: true });
  }

  function isDraftDirty(): boolean {
    return !!draft && JSON.stringify(draft) !== draftBaseline.current;
  }

  function closeDrawer() {
    if (isDraftDirty()) { setConfirmCloseOpen(true); return; }
    actuallyClose();
  }

  function actuallyClose() {
    setDraft(null);
    setPreviewOpen(false);
    setConfirmCloseOpen(false);
    setSaveTemplateOpen(false);
  }

  function patchDraft<K extends keyof SplashConfig>(key: K, val: SplashConfig[K]) {
    setDraft(d => d && ({ ...d, [key]: val }));
  }

  function setDraftText<K extends keyof SplashTexts>(key: K, val: SplashTexts[K]) {
    setDraft(d => {
      if (!d) return d;
      const current = textsOf(d, activeLang);
      return { ...d, content: { ...d.content, [activeLang]: { ...current, [key]: val } } };
    });
  }

  function addBtn() {
    if (!draft || draft.buttons.length >= 2) return;
    patchDraft('buttons', [...draft.buttons, emptyBtn()]);
  }

  function removeBtn(i: number) {
    if (!draft) return;
    patchDraft('buttons', draft.buttons.filter((_, idx) => idx !== i));
  }

  function patchBtn(i: number, field: keyof SplashBtn, val: string) {
    if (!draft) return;
    patchDraft('buttons', draft.buttons.map((b, idx) => idx === i ? { ...b, [field]: val } : b));
  }

  async function saveDraft() {
    if (!draft) return;
    const updated = { ...draft, updatedAt: new Date().toISOString() };
    await setPersisted(updated);
    pushHistory(updated);
    setDraft(updated);
    draftBaseline.current = JSON.stringify(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function publishDraft() {
    if (!draft) return;
    const updated = { ...draft, updatedAt: new Date().toISOString() };
    await setPersisted(updated);
    pushHistory(updated);
    setDraft(updated);
    draftBaseline.current = JSON.stringify(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    if (activePortalId) {
      try { await savePortalConfig(activePortalId, { splash: updated }); } catch (e) { console.error(e); }
    }
    await publish();
  }

  function saveAsTemplate() {
    if (!draft) return;
    const nome = saveTemplateName.trim();
    if (!nome) return;
    const content: Partial<Record<string, Omit<SplashTexts, 'imageUrl'>>> = {};
    for (const [lang, t] of Object.entries(draft.content)) {
      if (!t) continue;
      content[lang] = { titulo: t.titulo, texto: t.texto, conteudo: t.conteudo, legenda: t.legenda };
    }
    const tpl: SplashTemplate = {
      id: genId(),
      nome,
      config: { size: draft.size, buttons: draft.buttons, content },
    };
    setTemplates([...templatesRaw, tpl]);
    setSaveTemplateOpen(false);
    setSaveTemplateName('');
  }

  function deleteTemplate(id: string) {
    setTemplates(templatesRaw.filter(t => t.id !== id));
    setConfirmDeleteTpl(null);
  }

  const texts = draft ? textsOf(draft, activeLang) : emptySplashTexts();

  function renderHistoryCard(entry: SplashConfig) {
    const isCurrent = entry.id === current.id;
    const status = statusOf(entry);
    const entryTexts = textsOf(entry, splashPrimaryLang);
    return (
      <div key={entry.id} className="splash-history-card">
        <div className="splash-history-card__head">
          <span className={`splash-status-badge splash-status-badge--${status}`}>{STATUS_LABEL[status]}</span>
          {isCurrent && <span className="splash-history-card__current">Splash atual</span>}
        </div>
        <p className="splash-history-card__title">{entryTexts.titulo || '(sem título)'}</p>
        <p className="splash-history-card__meta">
          {SIZE_LABEL[entry.size]}
          {entry.publishAt ? ` · a partir de ${fmtDate(entry.publishAt)}` : ''}
          {entry.unpublishAt ? ` · até ${fmtDate(entry.unpublishAt)}` : ''}
        </p>
        <div className="splash-history-card__actions">
          <button type="button" className="btn-outline" onClick={() => openEdit(entry)}>Editar</button>
        </div>
      </div>
    );
  }

  function renderTplCard(tpl: SplashTemplate, removable: boolean) {
    const previewTexto = tpl.config.content[splashPrimaryLang]?.texto;
    return (
      <div key={tpl.id} className="splash-tpl-card">
        <div className="splash-tpl-card__head">
          <span className="material-symbols-outlined splash-tpl-card__icon">campaign</span>
          <div className="splash-tpl-card__info">
            <span className="splash-tpl-card__nome">{tpl.nome}</span>
            <span className="splash-tpl-card__meta">{SIZE_LABEL[tpl.config.size]}{tpl.config.buttons.length > 0 ? ` · ${tpl.config.buttons.length} botão(ões)` : ''}</span>
          </div>
        </div>
        {previewTexto && <p className="splash-tpl-card__preview">{previewTexto}</p>}
        <div className="splash-tpl-card__actions">
          <button type="button" className="btn-primary" onClick={() => applyTemplate(tpl)}>Usar este modelo</button>
          {removable && (
            <button type="button" className="btn-action btn-action--danger" onClick={() => setConfirmDeleteTpl(tpl)}>
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>delete</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <StickyPageHeader
        title="Splash"
        description={<>Splash de entrada do portal <strong>{portalName}</strong>. Exibido automaticamente ao acessar o site.</>}
        action={
          <button type="button" className="btn-primary" onClick={openNew}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
            Novo Splash
          </button>
        }
      />

      {saveError && (
        <div className="save-error-banner" role="alert">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
          <span>Alteração não foi salva no banco. Se você acabou de receber acesso a este portal, saia e entre novamente para renovar a sessão.</span>
        </div>
      )}

      <p className="splash-tpl-section-label" style={{ marginTop: 0 }}>Últimos modelos usados</p>
      {revivedHistory.length === 0 ? (
        <p className="splash-tpl-empty">Nenhum splash configurado ainda. Clique em "Novo Splash" para começar.</p>
      ) : (
        <div className="splash-history-grid">
          {revivedHistory.slice(0, 5).map(renderHistoryCard)}
        </div>
      )}

      <p className="splash-tpl-section-label">Templates</p>
      <div className="splash-tpl-grid">
        {BUILT_IN_TEMPLATES.map(tpl => renderTplCard(tpl, false))}
      </div>

      <p className="splash-tpl-section-label">Meus modelos salvos</p>
      {templates.length === 0 ? (
        <p className="splash-tpl-empty">
          Nenhum modelo salvo ainda. Em "Novo Splash", ajuste o conteúdo e clique em "Salvar como modelo" para guardá-lo aqui.
        </p>
      ) : (
        <div className="splash-tpl-grid">
          {templates.map(tpl => renderTplCard(tpl, true))}
        </div>
      )}

      <Modal
        open={!!draft}
        onClose={closeDrawer}
        title="Editar Splash"
        variant="side"
        size="lg"
        footer={draft ? (
          <div className="publish-actions publish-actions--wrap" style={{ width: '100%', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-outline" onClick={() => setPreviewOpen(true)}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>visibility</span>
              Pré-visualizar
            </button>
            <button type="button" className="btn-outline" onClick={() => setSaveTemplateOpen(true)}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>bookmark_add</span>
              Salvar como modelo
            </button>
            <button type="button" className="btn-outline" onClick={saveDraft}>
              {saved ? 'Salvo!' : 'Salvar rascunho'}
            </button>
            <PublishButton onClick={publishDraft} />
          </div>
        ) : null}
      >
        {draft && (
          <div key={activeLang} className="splash-editor lang-fade">
            <LangTabs active={activeLang} onChange={setActiveLang} />

            {/* Enable toggle */}
            <div className="splash-card">
              <div className="splash-card__head">
                <span className="material-symbols-outlined splash-card__icon">campaign</span>
                <div>
                  <p className="splash-card__title">Ativação</p>
                  <p className="splash-card__desc">O splash será exibido automaticamente ao acessar o site, dentro do período agendado abaixo.</p>
                </div>
                <label className="splash-switch">
                  <input type="checkbox" checked={draft.enabled}
                    onChange={e => patchDraft('enabled', e.target.checked)} />
                  <span className="splash-switch__track" />
                </label>
              </div>
            </div>

            {/* Scheduling */}
            <div className="splash-card">
              <p className="splash-section-label">Agendamento</p>
              <div className="splash-field-row">
                <label className="splash-field">
                  <span className="splash-field__label">Publicar a partir de</span>
                  <input className="splash-field__input" type="date"
                    value={draft.publishAt ?? ''}
                    onChange={e => patchDraft('publishAt', e.target.value || null)} />
                </label>
                <label className="splash-field">
                  <span className="splash-field__label">Tirar do ar em</span>
                  <input className="splash-field__input" type="date"
                    value={draft.unpublishAt ?? ''}
                    onChange={e => patchDraft('unpublishAt', e.target.value || null)} />
                </label>
              </div>
              <p className="splash-card__desc" style={{ margin: 0 }}>
                Deixe em branco para publicar imediatamente / manter no ar indefinidamente.
              </p>
            </div>

            {/* Size picker */}
            <div className="splash-card">
              <p className="splash-section-label">Largura do modal</p>
              <div className="splash-sizes">
                {SIZE_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`splash-size-card${draft.size === opt.id ? ' splash-size-card--active' : ''}`}
                    onClick={() => patchDraft('size', opt.id)}
                  >
                    <div className="splash-size-card__thumb">{opt.thumb}</div>
                    <div className="splash-size-card__info">
                      <span className="splash-size-card__label">{opt.label}</span>
                      <span className="splash-size-card__desc">{opt.desc}</span>
                    </div>
                    {draft.size === opt.id && (
                      <span className="splash-size-card__check">
                        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>check</span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="splash-card">
              <p className="splash-section-label">Conteúdo</p>

              {/* Header image */}
              <div className="splash-field">
                <label className="splash-field__label">Imagem de header</label>
                <div
                  className={`splash-img-zone${texts.imageUrl ? ' splash-img-zone--filled' : ''}`}
                  onClick={() => imageInputRef.current?.click()}
                >
                  <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={async e => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const result = await processImageToDataUrl(f, 'splash-header');
                      setDraftText('imageUrl', result.dataUrl);
                    }} />
                  {texts.imageUrl ? (
                    <>
                      <img src={texts.imageUrl} alt="" className="splash-img-zone__img" />
                      <button type="button" className="splash-img-zone__remove"
                        onClick={e => { e.stopPropagation(); setDraftText('imageUrl', null); }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--color-gray-400)' }}>image</span>
                      <span className="splash-img-zone__label">Clique para adicionar imagem de header</span>
                      <span className="splash-img-zone__hint">Proporção recomendada 16:5 · PNG, JPG, WebP</span>
                    </>
                  )}
                </div>
                <button type="button" className="media-picker-trigger" onClick={() => setPickerOpen(true)}>
                  ou escolher da Biblioteca
                </button>
                <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={url => setDraftText('imageUrl', url)} portalDbId={portalDbId} />
              </div>

              {/* Título */}
              <div className="splash-field">
                <label className="splash-field__label">Título</label>
                <input className="splash-field__input" type="text"
                  placeholder="Ex: Nota Importante ao Mercado"
                  value={texts.titulo} onChange={e => setDraftText('titulo', e.target.value)} />
              </div>

              {/* Texto intro */}
              <div className="splash-field">
                <label className="splash-field__label">Texto introdutório</label>
                <textarea className="splash-field__input splash-field__textarea" rows={3}
                  placeholder="Breve descrição ou lead do comunicado..."
                  value={texts.texto} onChange={e => setDraftText('texto', e.target.value)} />
              </div>

              {/* Conteúdo */}
              <div className="splash-field">
                <label className="splash-field__label">Conteúdo</label>
                <textarea className="splash-field__input splash-field__textarea" rows={5}
                  placeholder="Corpo do comunicado, instruções ou informações detalhadas..."
                  value={texts.conteudo} onChange={e => setDraftText('conteudo', e.target.value)} />
              </div>

              {/* Legenda */}
              <div className="splash-field">
                <label className="splash-field__label">Legenda <span style={{ fontWeight: 400, color: 'var(--color-gray-400)' }}>(opcional)</span></label>
                <input className="splash-field__input" type="text"
                  placeholder="Ex: contato@empresa.com.br · Av. Paulista, 1000 — São Paulo"
                  value={texts.legenda} onChange={e => setDraftText('legenda', e.target.value)} />
              </div>
            </div>

            {/* Buttons */}
            <div className="splash-card">
              <div className="splash-btns-head">
                <div>
                  <p className="splash-section-label" style={{ margin: 0 }}>Botões de ação</p>
                  <p className="splash-card__desc" style={{ marginTop: 4 }}>Adicione até 2 botões para direcionar o visitante.</p>
                </div>
                {draft.buttons.length < 2 && (
                  <button type="button" className="btn-action btn-action--enter" onClick={addBtn}>
                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>add</span>
                    Adicionar botão
                  </button>
                )}
              </div>

              {draft.buttons.length === 0 && (
                <p className="splash-no-btns">Nenhum botão adicionado. O splash exibirá apenas um botão de fechar.</p>
              )}

              {draft.buttons.map((btn, i) => (
                <div key={i} className="splash-btn-editor">
                  <div className="splash-btn-editor__head">
                    <span className="splash-btn-editor__num">Botão {i + 1}</span>
                    <button type="button" className="btn-action btn-action--danger" style={{ padding: '4px 8px' }}
                      onClick={() => removeBtn(i)}>
                      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>delete</span>
                    </button>
                  </div>
                  <div className="splash-btn-editor__fields">
                    <div className="splash-field">
                      <label className="splash-field__label">Texto do botão</label>
                      <input className="splash-field__input" type="text" placeholder="Ex: Saiba mais"
                        value={btn.label} onChange={e => patchBtn(i, 'label', e.target.value)} />
                    </div>
                    <div className="splash-field">
                      <label className="splash-field__label">URL de destino</label>
                      <input className="splash-field__input" type="text" placeholder="/pagina ou https://..."
                        value={btn.url} onChange={e => patchBtn(i, 'url', e.target.value)} />
                    </div>
                    <div className="splash-field">
                      <label className="splash-field__label">Estilo</label>
                      <div className="splash-variant-pick">
                        {(['primary', 'outline'] as const).map(v => (
                          <button key={v} type="button"
                            className={`splash-variant-chip${btn.variant === v ? ' splash-variant-chip--active' : ''}`}
                            onClick={() => patchBtn(i, 'variant', v)}>
                            {v === 'primary' ? 'Preenchido' : 'Contorno'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Full preview modal */}
      {previewOpen && draft && (
        <div className="splash-fullpreview" onClick={() => setPreviewOpen(false)}>
          <div
            className="splash-fullpreview__modal"
            style={{ maxWidth: `${SIZE_PX[draft.size]}px` }}
            onClick={e => e.stopPropagation()}
          >
            {texts.imageUrl ? (
              <img src={texts.imageUrl} alt="" className="splash-fullpreview__img" />
            ) : (
              <div className="splash-fullpreview__img-placeholder">
                <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>image</span>
                <span>Imagem de header</span>
              </div>
            )}
            <div className="splash-fullpreview__body">
              <h2 className="splash-fullpreview__title">{texts.titulo || 'Título do comunicado'}</h2>
              {texts.texto && <p className="splash-fullpreview__lead">{texts.texto}</p>}
              {texts.conteudo && <p className="splash-fullpreview__content">{texts.conteudo}</p>}
              {texts.legenda && <p className="splash-fullpreview__legenda">{texts.legenda}</p>}
              {draft.buttons.length > 0 && (
                <div className="splash-fullpreview__btns">
                  {draft.buttons.map((b, i) => (
                    <button key={i} type="button"
                      className={`splash-fullpreview__btn splash-fullpreview__btn--${b.variant}`}>
                      {b.label || `Botão ${i + 1}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" className="splash-fullpreview__close" onClick={() => setPreviewOpen(false)}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
            </button>
          </div>
        </div>
      )}

      {saveTemplateOpen && (
        <Modal open onClose={() => setSaveTemplateOpen(false)} title="Salvar como modelo" size="sm"
          footer={
            <div className="modal-footer">
              <button type="button" className="btn-outline" onClick={() => setSaveTemplateOpen(false)}>Cancelar</button>
              <button type="button" className="btn-primary" disabled={!saveTemplateName.trim()} onClick={saveAsTemplate}>Salvar</button>
            </div>
          }
        >
          <div className="cdr-modal-form">
            <p className="doc-field__hint" style={{ margin: 0 }}>
              Salva o título, textos e botões atuais como um modelo reutilizável, listado em "Meus modelos salvos" abaixo. Ativação, agendamento e imagem de header não são salvos no modelo.
            </p>
            <label className="doc-field">
              <span className="doc-field__label">Nome do modelo</span>
              <input className="doc-field__input" type="text" placeholder="Ex: Fato Relevante"
                value={saveTemplateName} onChange={e => setSaveTemplateName(e.target.value)} autoFocus />
            </label>
          </div>
        </Modal>
      )}

      {confirmCloseOpen && (
        <div className="splash-tpl-confirm-overlay" onClick={() => setConfirmCloseOpen(false)}>
          <div className="splash-tpl-confirm" onClick={e => e.stopPropagation()}>
            <p>Descartar as alterações não salvas neste splash?</p>
            <div className="modal-footer">
              <button type="button" className="btn-outline" onClick={() => setConfirmCloseOpen(false)}>Continuar editando</button>
              <button type="button" className="btn-danger" onClick={actuallyClose}>Descartar</button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteTpl && (
        <div className="splash-tpl-confirm-overlay" onClick={() => setConfirmDeleteTpl(null)}>
          <div className="splash-tpl-confirm" onClick={e => e.stopPropagation()}>
            <p>Excluir o modelo <strong>"{confirmDeleteTpl.nome}"</strong>?</p>
            <div className="modal-footer">
              <button type="button" className="btn-outline" onClick={() => setConfirmDeleteTpl(null)}>Cancelar</button>
              <button type="button" className="btn-danger"
                onClick={() => deleteTemplate(confirmDeleteTpl.id)}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
