import { useState, useEffect, useCallback } from 'react';
import { useBlocker } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import PORTAL_CONFIG from '../../portalConfig';
import '../admin/AdminPages.css';
import './PersonalizarPages.css';
import './FooterPage.css';

type FooterModel = 'completo' | 'reduzido' | 'mapa';

interface SocialLink { platform: string; url: string; icon: React.ReactNode }
interface LegalLink  { id: string; label: string; enabled: boolean }

interface FooterConfig {
  model: FooterModel;
  // Bottom bar
  copyright: string;
  poweredBy: boolean;
  disclaimer: string;
  legalLinks: LegalLink[];
  // Completo only
  address: string;
  email: string;
  phone: string;
  hours: string;
  socials: SocialLink[];
}

const SOCIAL_PLATFORMS: { platform: string; icon: React.ReactNode }[] = [
  {
    platform: 'LinkedIn',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
        <rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
      </svg>
    ),
  },
  {
    platform: 'Instagram',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
      </svg>
    ),
  },
  {
    platform: 'X (Twitter)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    platform: 'YouTube',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
        <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/>
      </svg>
    ),
  },
  {
    platform: 'Facebook',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
      </svg>
    ),
  },
];

const DEFAULT: FooterConfig = {
  model: 'completo',
  copyright: `©Copyright Workr Lite - ${PORTAL_CONFIG.name} ${new Date().getFullYear()}`,
  poweredBy: true,
  disclaimer: 'As informações contidas neste site são de caráter meramente informativo e não constituem oferta de valores mobiliários.',
  legalLinks: [
    { id: 'termos', label: 'Termos e Condições', enabled: true },
    { id: 'privacidade', label: 'Política de Privacidade', enabled: true },
    { id: 'cookies', label: 'Definições de Cookies', enabled: true },
  ],
  address: 'Av. Brigadeiro Faria Lima, 2.277, 17º andar — São Paulo/SP, CEP 01452-000',
  email: 'workrlite@astri.com',
  phone: '(11) 1234-5678',
  hours: 'Segunda a sexta, das 08h às 18h, exceto feriados.',
  socials: SOCIAL_PLATFORMS.map(s => ({ platform: s.platform, url: '', icon: s.icon })),
};

const MODEL_THUMBNAILS: Record<FooterModel, React.ReactNode> = {
  mapa: (
    <svg width="100%" height="80" viewBox="0 0 280 80" fill="none">
      <rect width="280" height="80" fill="#0b5b68"/>
      {/* Logo row */}
      <rect x="10" y="8" width="28" height="8" rx="2" fill="rgba(255,255,255,0.7)"/>
      {/* Divider */}
      <line x1="10" y1="22" x2="270" y2="22" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
      {/* 5 sitemap columns */}
      {[10, 65, 120, 175, 225].map((x, i) => (
        <g key={i}>
          <rect x={x} y="28" width="38" height="3" rx="1" fill="rgba(255,255,255,0.55)"/>
          <rect x={x} y="34" width="28" height="2" rx="1" fill="rgba(255,255,255,0.3)"/>
          <rect x={x} y="39" width="32" height="2" rx="1" fill="rgba(255,255,255,0.3)"/>
          <rect x={x} y="44" width="24" height="2" rx="1" fill="rgba(255,255,255,0.3)"/>
          <rect x={x} y="49" width="30" height="2" rx="1" fill="rgba(255,255,255,0.3)"/>
        </g>
      ))}
      {/* Divider */}
      <line x1="10" y1="58" x2="270" y2="58" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
      {/* Bottom bar */}
      <rect x="10" y="63" width="60" height="3" rx="1" fill="rgba(255,255,255,0.25)"/>
      <rect x="80" y="63" width="50" height="3" rx="1" fill="rgba(255,255,255,0.25)"/>
      <rect x="200" y="63" width="40" height="3" rx="1" fill="rgba(255,255,255,0.25)"/>
      <rect x="10" y="70" width="100" height="2" rx="1" fill="rgba(255,255,255,0.15)"/>
    </svg>
  ),
  completo: (
    <svg width="100%" height="80" viewBox="0 0 280 80" fill="none">
      <rect width="280" height="80" fill="#0b5b68"/>
      {/* Logo */}
      <rect x="10" y="8" width="28" height="8" rx="2" fill="rgba(255,255,255,0.7)"/>
      {/* Divider */}
      <line x1="10" y1="22" x2="270" y2="22" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
      {/* 4 nav columns */}
      {[10,80,150,210].map((x, i) => (
        <g key={i}>
          <rect x={x} y="28" width="40" height="4" rx="1" fill="rgba(255,255,255,0.55)"/>
          <rect x={x} y="36" width="30" height="3" rx="1" fill="rgba(255,255,255,0.3)"/>
          <rect x={x} y="42" width="35" height="3" rx="1" fill="rgba(255,255,255,0.3)"/>
          <rect x={x} y="48" width="25" height="3" rx="1" fill="rgba(255,255,255,0.3)"/>
        </g>
      ))}
      {/* Divider */}
      <line x1="10" y1="58" x2="270" y2="58" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
      {/* Bottom bar */}
      <rect x="10" y="63" width="60" height="3" rx="1" fill="rgba(255,255,255,0.25)"/>
      <rect x="80" y="63" width="50" height="3" rx="1" fill="rgba(255,255,255,0.25)"/>
      <rect x="200" y="63" width="40" height="3" rx="1" fill="rgba(255,255,255,0.25)"/>
      <rect x="10" y="70" width="100" height="2" rx="1" fill="rgba(255,255,255,0.15)"/>
    </svg>
  ),
  reduzido: (
    <svg width="100%" height="80" viewBox="0 0 280 80" fill="none">
      <rect width="280" height="80" fill="#0b5b68"/>
      {/* Single bar */}
      <rect x="10" y="32" width="50" height="3" rx="1" fill="rgba(255,255,255,0.4)"/>
      <rect x="70" y="32" width="55" height="3" rx="1" fill="rgba(255,255,255,0.4)"/>
      <rect x="135" y="32" width="50" height="3" rx="1" fill="rgba(255,255,255,0.4)"/>
      <rect x="170" y="40" width="70" height="2" rx="1" fill="rgba(255,255,255,0.25)"/>
      <rect x="210" y="45" width="40" height="8" rx="2" fill="rgba(255,255,255,0.12)"/>
      <rect x="10" y="44" width="90" height="2" rx="1" fill="rgba(255,255,255,0.2)"/>
    </svg>
  ),
};

export default function FooterPage() {
  const [config, setConfig] = useState<FooterConfig>(DEFAULT);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    dirty && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const markDirty = useCallback(() => {
    setDirty(true);
    setSaved(false);
  }, []);

  function set<K extends keyof FooterConfig>(key: K, val: FooterConfig[K]) {
    setConfig(prev => ({ ...prev, [key]: val }));
    markDirty();
  }

  function setLegal(id: string, field: 'label' | 'enabled', val: string | boolean) {
    setConfig(prev => ({
      ...prev,
      legalLinks: prev.legalLinks.map(l => l.id === id ? { ...l, [field]: val } : l),
    }));
    markDirty();
  }

  function setSocialUrl(platform: string, url: string) {
    setConfig(prev => ({
      ...prev,
      socials: prev.socials.map(s => s.platform === platform ? { ...s, url } : s),
    }));
    markDirty();
  }

  function handleSave() {
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="page">
      <PageHeader
        title="Footer"
        description={<>Configuração do rodapé do portal <strong>{PORTAL_CONFIG.name}</strong>.</>}
        action={
          <button className="btn-primary" type="button" onClick={handleSave} disabled={!dirty}>
            {saved ? 'Salvo!' : 'Salvar alterações'}
          </button>
        }
      />

      {/* Model selector */}
      <div className="pers-section">
        <h2 className="pers-section__title">Modelo do footer</h2>
        <p className="pers-section__desc">Escolha o estilo de rodapé que será exibido no portal.</p>
        <div className="footer-models">
          {(['completo', 'reduzido', 'mapa'] as FooterModel[]).map(m => (
            <button
              key={m}
              type="button"
              className={`footer-model-card${config.model === m ? ' footer-model-card--active' : ''}`}
              onClick={() => set('model', m)}
            >
              <div className="footer-model-card__thumb">{MODEL_THUMBNAILS[m]}</div>
              <div className="footer-model-card__label">
                {m === 'completo' ? 'Completo' : m === 'reduzido' ? 'Reduzido' : 'Mapa do site'}
                {config.model === m && (
                  <span className="footer-model-card__check">
                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>check</span>
                  </span>
                )}
              </div>
              <div className="footer-model-card__desc">
                {m === 'completo'
                  ? 'Logo, colunas de navegação, endereço, contato, redes sociais e rodapé inferior.'
                  : m === 'reduzido'
                  ? 'Barra única com links legais, copyright e selo Powered by.'
                  : 'Mapa completo do site com todas as seções e páginas organizadas em colunas.'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Completo/Mapa: contact & social */}
      {(config.model === 'completo' || config.model === 'mapa') && (
        <>
          <div className="pers-section">
            <h2 className="pers-section__title">Endereço e contato</h2>
            <p className="pers-section__desc">Informações exibidas na seção de rodapé.</p>
            <div className="footer-fields">
              <label className="footer-field">
                <span className="footer-field__label">Endereço</span>
                <input
                  className="footer-field__input"
                  type="text"
                  value={config.address}
                  onChange={e => set('address', e.target.value)}
                />
              </label>
              <div className="footer-fields-row">
                <label className="footer-field">
                  <span className="footer-field__label">E-mail</span>
                  <input
                    className="footer-field__input"
                    type="email"
                    value={config.email}
                    onChange={e => set('email', e.target.value)}
                  />
                </label>
                <label className="footer-field">
                  <span className="footer-field__label">Telefone</span>
                  <input
                    className="footer-field__input"
                    type="text"
                    value={config.phone}
                    onChange={e => set('phone', e.target.value)}
                  />
                </label>
              </div>
              <label className="footer-field">
                <span className="footer-field__label">Horário de atendimento</span>
                <input
                  className="footer-field__input"
                  type="text"
                  value={config.hours}
                  onChange={e => set('hours', e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="pers-section">
            <h2 className="pers-section__title">Redes sociais</h2>
            <p className="pers-section__desc">Deixe o campo em branco para ocultar o ícone no footer.</p>
            <div className="footer-socials">
              {config.socials.map(s => {
                const def = SOCIAL_PLATFORMS.find(p => p.platform === s.platform);
                return (
                  <label key={s.platform} className="footer-social-row">
                    <span className="footer-social-row__icon">{def?.icon}</span>
                    <span className="footer-social-row__platform">{s.platform}</span>
                    <input
                      className="footer-field__input"
                      type="url"
                      placeholder="https://..."
                      value={s.url}
                      onChange={e => setSocialUrl(s.platform, e.target.value)}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Legal links */}
      <div className="pers-section">
        <h2 className="pers-section__title">Links legais</h2>
        <p className="pers-section__desc">Configure os links exibidos na barra inferior do footer.</p>
        <div className="footer-legal-links">
          {config.legalLinks.map(l => (
            <div key={l.id} className="footer-legal-row">
              <label className="footer-legal-toggle">
                <input
                  type="checkbox"
                  checked={l.enabled}
                  onChange={e => setLegal(l.id, 'enabled', e.target.checked)}
                />
              </label>
              <input
                className={`footer-field__input${!l.enabled ? ' footer-field__input--muted' : ''}`}
                type="text"
                value={l.label}
                disabled={!l.enabled}
                onChange={e => setLegal(l.id, 'label', e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar settings */}
      <div className="pers-section">
        <h2 className="pers-section__title">Rodapé inferior</h2>
        <p className="pers-section__desc">Texto de copyright, identificação e aviso legal.</p>
        <div className="footer-fields">
          <label className="footer-field">
            <span className="footer-field__label">Copyright</span>
            <input
              className="footer-field__input"
              type="text"
              value={config.copyright}
              onChange={e => set('copyright', e.target.value)}
            />
          </label>
          <label className="footer-field">
            <span className="footer-field__label">Aviso legal / Disclaimer</span>
            <textarea
              className="footer-field__input footer-field__textarea"
              rows={3}
              value={config.disclaimer}
              onChange={e => set('disclaimer', e.target.value)}
            />
          </label>
          <label className="footer-toggle-row">
            <input
              type="checkbox"
              checked={config.poweredBy}
              onChange={e => set('poweredBy', e.target.checked)}
            />
            <span>Exibir selo <strong>Powered by Astri</strong></span>
          </label>
        </div>
      </div>

      {/* Live preview */}
      <div className="pers-section">
        <h2 className="pers-section__title">Pré-visualização</h2>
        <div className="footer-preview">
          {config.model === 'mapa' ? (
            <div className="fp fp--completo">
              <div className="fp__top">
                <svg width="72" height="20" viewBox="0 0 72 20" fill="none">
                  <rect width="16" height="16" rx="2" fill="rgba(255,255,255,0.9)"/>
                  <rect x="20" y="4" width="52" height="6" rx="2" fill="rgba(255,255,255,0.8)"/>
                  <rect x="20" y="12" width="36" height="4" rx="1" fill="rgba(255,255,255,0.4)"/>
                </svg>
              </div>
              <div className="fp__divider"/>
              <div className="fp__nav fp__nav--mapa">
                {[
                  { title: 'A COMPANHIA', links: ['A Companhia'] },
                  { title: 'GOVERNANÇA', links: ['Composição Acionária', 'Atas e Assembleias', 'Documentos CVM'] },
                  { title: 'INVESTIDORES', links: ['Central de Resultados', 'Calendário de Eventos', 'Ratings'] },
                  { title: 'CONTATO', links: ['Fale com RI', 'Mailing'] },
                ].map(col => (
                  <div key={col.title} className="fp__nav-col">
                    <div className="fp__nav-title">{col.title}</div>
                    {col.links.map(l => <div key={l} className="fp__nav-link">{l}</div>)}
                  </div>
                ))}
              </div>
              <div className="fp__divider"/>
              <div className="fp__bottom">
                <div className="fp__bottom-left">
                  {config.legalLinks.filter(l => l.enabled).map((l, i) => (
                    <span key={l.id}>
                      {i > 0 && <span className="fp__sep">·</span>}
                      {l.label}
                    </span>
                  ))}
                </div>
                <div className="fp__bottom-right">
                  <span>{config.copyright}</span>
                  {config.poweredBy && (
                    <span className="fp__powered">
                      Powered by <svg width="36" height="10" viewBox="0 0 72 20" fill="none"><rect width="12" height="12" rx="1" fill="rgba(255,255,255,0.6)"/><rect x="16" y="3" width="40" height="5" rx="1" fill="rgba(255,255,255,0.6)"/></svg>
                    </span>
                  )}
                </div>
              </div>
              {config.disclaimer && <div className="fp__disclaimer">{config.disclaimer}</div>}
            </div>
          ) : config.model === 'completo' ? (
            <div className="fp fp--completo">
              <div className="fp__top">
                <svg width="72" height="20" viewBox="0 0 72 20" fill="none">
                  <rect width="16" height="16" rx="2" fill="rgba(255,255,255,0.9)"/>
                  <rect x="20" y="4" width="52" height="6" rx="2" fill="rgba(255,255,255,0.8)"/>
                  <rect x="20" y="12" width="36" height="4" rx="1" fill="rgba(255,255,255,0.4)"/>
                </svg>
              </div>
              <div className="fp__divider"/>
              <div className="fp__nav">
                <div className="fp__nav-col">
                  <div className="fp__nav-title">A COMPANHIA</div>
                  <div className="fp__nav-link">A Companhia</div>
                </div>
                <div className="fp__nav-col">
                  <div className="fp__nav-title">GOVERNANÇA</div>
                  <div className="fp__nav-link">Composição Acionária</div>
                  <div className="fp__nav-link">Atas e Assembleias</div>
                </div>
                <div className="fp__nav-col">
                  <div className="fp__nav-title">INVESTIDORES</div>
                  <div className="fp__nav-link">Central de Resultados</div>
                  <div className="fp__nav-link">Calendário de Eventos</div>
                </div>
                <div className="fp__nav-col">
                  <div className="fp__nav-title">CONTATO</div>
                  <div className="fp__nav-link">Fale com RI</div>
                  <div className="fp__nav-link">Mailing</div>
                </div>
              </div>
              <div className="fp__divider"/>
              <div className="fp__contact">
                {config.address && (
                  <div className="fp__contact-group">
                    <div className="fp__contact-title">ENDEREÇO</div>
                    <div className="fp__contact-text">{config.address}</div>
                  </div>
                )}
                {(config.email || config.phone || config.hours) && (
                  <div className="fp__contact-group">
                    <div className="fp__contact-title">ENTRE EM CONTATO</div>
                    {config.email && <div className="fp__contact-text">{config.email}</div>}
                    {config.phone && <div className="fp__contact-text">{config.phone}</div>}
                    {config.hours && <div className="fp__contact-text">{config.hours}</div>}
                  </div>
                )}
                {config.socials.some(s => s.url) && (
                  <div className="fp__contact-group">
                    <div className="fp__contact-title">REDES SOCIAIS</div>
                    <div className="fp__socials">
                      {config.socials.filter(s => s.url).map(s => {
                        const def = SOCIAL_PLATFORMS.find(p => p.platform === s.platform);
                        return <span key={s.platform} className="fp__social-icon">{def?.icon}</span>;
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="fp__divider"/>
              <div className="fp__bottom">
                <div className="fp__bottom-left">
                  {config.legalLinks.filter(l => l.enabled).map((l, i) => (
                    <span key={l.id}>
                      {i > 0 && <span className="fp__sep">·</span>}
                      {l.label}
                    </span>
                  ))}
                </div>
                <div className="fp__bottom-right">
                  <span>{config.copyright}</span>
                  {config.poweredBy && (
                    <span className="fp__powered">
                      Powered by <svg width="36" height="10" viewBox="0 0 72 20" fill="none"><rect width="12" height="12" rx="1" fill="rgba(255,255,255,0.6)"/><rect x="16" y="3" width="40" height="5" rx="1" fill="rgba(255,255,255,0.6)"/></svg>
                    </span>
                  )}
                </div>
              </div>
              {config.disclaimer && <div className="fp__disclaimer">{config.disclaimer}</div>}
            </div>
          ) : (
            <div className="fp fp--reduzido">
              <div className="fp__bottom">
                <div className="fp__bottom-left">
                  {config.legalLinks.filter(l => l.enabled).map((l, i) => (
                    <span key={l.id}>
                      {i > 0 && <span className="fp__sep">·</span>}
                      {l.label}
                    </span>
                  ))}
                </div>
                <div className="fp__bottom-right">
                  <span>{config.copyright}</span>
                  {config.poweredBy && (
                    <span className="fp__powered">
                      Powered by <svg width="36" height="10" viewBox="0 0 72 20" fill="none"><rect width="12" height="12" rx="1" fill="rgba(255,255,255,0.6)"/><rect x="16" y="3" width="40" height="5" rx="1" fill="rgba(255,255,255,0.6)"/></svg>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Modal
        open={blocker.state === 'blocked'}
        title="Alterações não salvas"
        onClose={() => blocker.state === 'blocked' && blocker.reset()}
          footer={
            <div className="modal-footer">
              <button className="btn-outline" type="button" onClick={() => blocker.state === 'blocked' && blocker.reset()}>
                Continuar editando
              </button>
              <button className="btn-outline btn-outline--danger" type="button" onClick={() => blocker.state === 'blocked' && blocker.proceed()}>
                Sair sem salvar
              </button>
            </div>
          }
        >
          <p style={{ margin: 0, color: 'var(--color-gray-600)', fontSize: 'var(--text-sm)' }}>
            Você tem alterações não salvas no Footer. Se sair agora, as alterações serão perdidas.
          </p>
        </Modal>
    </div>
  );
}
