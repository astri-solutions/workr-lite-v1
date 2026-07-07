import { useState } from 'react';
import StickyPageHeader from '../../components/StickyPageHeader';
import UnsavedModal from '../../components/UnsavedModal';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { usePortalName } from '../../hooks/usePortalName';
import '../admin/AdminPages.css';
import './TickerPage.css';

type TickerType = 'static' | 'iframe';

interface StaticTicker {
  symbol: string;
  price: string;
  change: string;
  direction: 'up' | 'down';
}

interface TickerDraft {
  type: TickerType;
  iframeUrl: string;
  items: StaticTicker[];
}

const DEFAULT: TickerDraft = {
  type: 'static',
  iframeUrl: '',
  items: [{ symbol: 'XPTO3', price: 'R$ 00,00', change: '0,00%', direction: 'up' }],
};

export default function TickerPage() {
  const portalName = usePortalName();
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState<TickerDraft>(DEFAULT);

  const isDirty = !saved && (
    draft.type !== DEFAULT.type ||
    draft.iframeUrl !== DEFAULT.iframeUrl
  );
  const blocker = useUnsavedChanges(isDirty);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function setType(t: TickerType) {
    setDraft(prev => ({ ...prev, type: t }));
    setSaved(false);
  }

  return (
    <div className="page">
      <StickyPageHeader
        title="Ticker de Cotação"
        description={<>Configure o widget de cotação do portal <strong>{portalName}</strong>.</>}
        action={
          <button className="btn-primary" type="button" onClick={handleSave}>
            {saved ? 'Salvo!' : 'Salvar'}
          </button>
        }
      />

      {/* Tipo */}
      <div className="ticker-section">
        <h2 className="ticker-section__title">Tipo de ticker</h2>
        <p className="ticker-section__desc">
          Escolha entre cotação estática (placeholder) ou widget externo via iframe.
        </p>
        <div className="ticker-type-cards">
          <button
            type="button"
            className={`ticker-type-card${draft.type === 'static' ? ' ticker-type-card--active' : ''}`}
            onClick={() => setType('static')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 28 }}>show_chart</span>
            <span className="ticker-type-card__label">Estático</span>
            <span className="ticker-type-card__desc">Valores configurados manualmente no CMS</span>
          </button>
          <button
            type="button"
            className={`ticker-type-card${draft.type === 'iframe' ? ' ticker-type-card--active' : ''}`}
            onClick={() => setType('iframe')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 28 }}>integration_instructions</span>
            <span className="ticker-type-card__label">Widget Enfoque</span>
            <span className="ticker-type-card__desc">Cotação em tempo real via iframe externo</span>
          </button>
        </div>
      </div>

      {/* Iframe URL */}
      {draft.type === 'iframe' && (
        <div className="ticker-section">
          <h2 className="ticker-section__title">URL do widget</h2>
          <p className="ticker-section__desc">
            Cole a URL fornecida pela <strong>Enfoque</strong> (ou outro provedor).
            Ela será incorporada como <code>&lt;iframe&gt;</code> na barra superior do portal.
          </p>
          <div className="ticker-iframe-input-wrap">
            <input
              type="url"
              className="ticker-iframe-input"
              placeholder="https://ri.enfoque.com.br/RIWeb/Empresas/cotacao?token=..."
              value={draft.iframeUrl}
              onChange={e => {
                setDraft(prev => ({ ...prev, iframeUrl: e.target.value }));
                setSaved(false);
              }}
            />
          </div>

          {draft.iframeUrl && (
            <div className="ticker-preview-section">
              <div className="ticker-preview-label">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>visibility</span>
                Preview do widget
              </div>
              <div className="ticker-preview-topbar">
                <div className="ticker-preview-topbar__left">
                  <span className="ticker-preview-topbar__link ticker-preview-topbar__link--active">Relações com Investidores</span>
                  <span className="ticker-preview-topbar__sep" />
                  <span className="ticker-preview-topbar__link">Institucional</span>
                </div>
                <div className="ticker-preview-iframe-wrap">
                  <iframe
                    src={draft.iframeUrl}
                    className="ticker-preview-iframe"
                    title="Preview ticker"
                    loading="lazy"
                    frameBorder={0}
                    scrolling="no"
                  />
                </div>
                <div className="ticker-preview-topbar__right">PT | EN</div>
              </div>
            </div>
          )}

          <div className="ticker-info-box">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>info</span>
            <div>
              <strong>Como obter a URL Enfoque</strong><br />
              Acesse o portal da Enfoque RI, selecione sua empresa e copie o link da cotação
              no formato <code>https://ri.enfoque.com.br/RIWeb/Empresas/cotacao?token=SEU_TOKEN</code>.
              A URL é gerada com um token único por empresa.
            </div>
          </div>
        </div>
      )}

      {/* Estático */}
      {draft.type === 'static' && (
        <div className="ticker-section">
          <h2 className="ticker-section__title">Cotação placeholder</h2>
          <p className="ticker-section__desc">
            No modo estático, o ticker exibe valores configurados manualmente.
            Útil para portais sem acesso ao widget Enfoque.
          </p>
          <div className="ticker-static-preview">
            <div className="ticker-static-item">
              <span className="ticker-static-item__symbol">{draft.items[0]?.symbol}</span>
              <span className="ticker-static-item__dot">·</span>
              <span className="ticker-static-item__price">{draft.items[0]?.price}</span>
              <span className="ticker-static-item__change ticker-static-item__change--up">
                ▲ {draft.items[0]?.change}
              </span>
            </div>
          </div>
          <p className="ticker-section__hint">
            Os valores do ticker estático são atualizados no arquivo <code>site.config.js</code> durante a geração do portal.
          </p>
        </div>
      )}

      <UnsavedModal
        open={blocker.state === 'blocked'}
        onStay={() => blocker.reset?.()}
        onLeave={() => blocker.proceed?.()}
      />
    </div>
  );
}
