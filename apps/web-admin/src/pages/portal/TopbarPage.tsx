import { useState, useEffect } from 'react';
import StickyPageHeader from '../../components/StickyPageHeader';
import UnsavedModal from '../../components/UnsavedModal';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { usePortalName } from '../../hooks/usePortalName';
import { usePortalState } from '../../hooks/usePortalState';
import { savePortalConfig } from '../../lib/portalConfigApi';
import { useActivePortalId } from '../../hooks/useActivePortalId';
import { usePublish } from '../../contexts/PublishContext';
import PublishButton from '../../components/PublishButton';
import '../admin/AdminPages.css';
import './TickerPage.css';
import './CentralDeResultadosPage.css';

interface TopbarLink {
  label: string;
  url: string;
}

interface TopbarDraft {
  institucional: TopbarLink;
  ri: TopbarLink;
  showTicker: boolean;
}

const DEFAULT: TopbarDraft = {
  institucional: { label: 'Institucional', url: '#' },
  ri: { label: 'Relações com Investidores', url: '/' },
  showTicker: true,
};

const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: 'pt-BR', label: 'Português' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
];
const DEFAULT_LANGUAGES = ['pt-BR'];

export const TOPBAR_KEY = 'portal_topbar';

export default function TopbarPage() {
  const portalName = usePortalName();
  const activePortalId = useActivePortalId();
  const { publish } = usePublish();
  const [saved, setSaved] = useState(false);
  const [persisted, setPersisted, { hydrated }] = usePortalState<TopbarDraft>(TOPBAR_KEY, 'topbar', DEFAULT);
  const [draft, setDraft] = useState<TopbarDraft>(persisted);

  const [langPersisted, setLangPersisted, { hydrated: langHydrated }] =
    usePortalState<string[]>('portal_idiomas', 'idiomas', DEFAULT_LANGUAGES);
  const [langDraft, setLangDraft] = useState<string[]>(langPersisted);

  useEffect(() => {
    if (hydrated) setDraft({ ...DEFAULT, ...persisted });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (langHydrated) setLangDraft(langPersisted.length > 0 ? langPersisted : DEFAULT_LANGUAGES);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langHydrated]);

  const isDirty = !saved && (
    JSON.stringify(draft) !== JSON.stringify(persisted)
    || JSON.stringify(langDraft) !== JSON.stringify(langPersisted)
  );
  const blocker = useUnsavedChanges(isDirty);

  function toggleLanguage(code: string) {
    setLangDraft(prev => {
      const has = prev.includes(code);
      // The primary language (first in the list) can't be removed — every
      // portal needs at least one language selected.
      if (has && prev.length === 1) return prev;
      return has ? prev.filter(c => c !== code) : [...prev, code];
    });
    setSaved(false);
  }

  function handleSave() {
    setPersisted(draft);
    setLangPersisted(langDraft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handlePublish() {
    setPersisted(draft);
    setLangPersisted(langDraft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    if (activePortalId) {
      try { await savePortalConfig(activePortalId, { topbar: draft, idiomas: langDraft }); } catch (e) { console.error(e); }
    }
    await publish();
  }

  function patchLink(key: 'institucional' | 'ri', patch: Partial<TopbarLink>) {
    setDraft(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    setSaved(false);
  }

  return (
    <div className="page">
      <StickyPageHeader
        title="Topbar"
        description={<>Configure a barra de utilitários do portal <strong>{portalName}</strong>.</>}
        action={
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <button className="btn-outline" type="button" onClick={handleSave} disabled={!isDirty && saved}>
              {saved ? 'Salvo!' : 'Salvar rascunho'}
            </button>
            <PublishButton onClick={handlePublish} disabled={!isDirty} />
          </div>
        }
      />

      <div className="ticker-section">
        <h2 className="ticker-section__title">Links institucionais</h2>
        <p className="ticker-section__desc">
          Exibidos à esquerda da topbar. Os textos e destinos são livres — use para apontar
          para o site institucional da empresa ou uma página de RI externa, por exemplo.
        </p>

        <div className="cdr-modal-form">
          <div className="cdr-modal-form__row">
            <label className="cdr-modal-form__label">
              Rótulo
              <input
                className="cdr-modal-form__input"
                type="text"
                value={draft.ri.label}
                onChange={e => patchLink('ri', { label: e.target.value })}
                placeholder="Relações com Investidores"
              />
            </label>
            <label className="cdr-modal-form__label">
              Link
              <input
                className="cdr-modal-form__input"
                type="text"
                value={draft.ri.url}
                onChange={e => patchLink('ri', { url: e.target.value })}
                placeholder="/"
              />
            </label>
          </div>
          <div className="cdr-modal-form__row">
            <label className="cdr-modal-form__label">
              Rótulo
              <input
                className="cdr-modal-form__input"
                type="text"
                value={draft.institucional.label}
                onChange={e => patchLink('institucional', { label: e.target.value })}
                placeholder="Institucional"
              />
            </label>
            <label className="cdr-modal-form__label">
              Link
              <input
                className="cdr-modal-form__input"
                type="text"
                value={draft.institucional.url}
                onChange={e => patchLink('institucional', { url: e.target.value })}
                placeholder="https://empresa.com.br"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="ticker-section">
        <h2 className="ticker-section__title">Ticker de cotação</h2>
        <p className="ticker-section__desc">
          Controla se o widget de cotação (configurado em Personalização → Ticker) aparece na topbar.
          Desativar aqui não apaga a configuração do ticker — apenas o esconde.
        </p>
        <div className="ticker-type-cards">
          <button
            type="button"
            className={`ticker-type-card${draft.showTicker ? ' ticker-type-card--active' : ''}`}
            onClick={() => { setDraft(prev => ({ ...prev, showTicker: true })); setSaved(false); }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 28 }}>visibility</span>
            <span className="ticker-type-card__label">Exibir</span>
            <span className="ticker-type-card__desc">Mostra o ticker na topbar, se configurado</span>
          </button>
          <button
            type="button"
            className={`ticker-type-card${!draft.showTicker ? ' ticker-type-card--active' : ''}`}
            onClick={() => { setDraft(prev => ({ ...prev, showTicker: false })); setSaved(false); }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 28 }}>visibility_off</span>
            <span className="ticker-type-card__label">Ocultar</span>
            <span className="ticker-type-card__desc">Remove o ticker da topbar</span>
          </button>
        </div>
      </div>

      <div className="ticker-section">
        <h2 className="ticker-section__title">Idiomas</h2>
        <p className="ticker-section__desc">
          O seletor de idioma só aparece na topbar do site quando mais de um idioma está marcado aqui.
          O primeiro idioma da lista é o principal e não pode ser removido.
        </p>
        <div className="ticker-type-cards">
          {LANGUAGE_OPTIONS.map(opt => {
            const active = langDraft.includes(opt.code);
            const isPrimary = langDraft[0] === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                className={`ticker-type-card${active ? ' ticker-type-card--active' : ''}`}
                onClick={() => toggleLanguage(opt.code)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 28 }}>translate</span>
                <span className="ticker-type-card__label">{opt.label}</span>
                <span className="ticker-type-card__desc">
                  {isPrimary ? 'Idioma principal' : active ? 'Ativado' : 'Desativado'}
                </span>
              </button>
            );
          })}
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
