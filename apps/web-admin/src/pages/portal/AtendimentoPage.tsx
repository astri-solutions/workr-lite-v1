import { useState } from 'react';
import StickyPageHeader from '../../components/StickyPageHeader';
import '../admin/AdminPages.css';
import './AtendimentoPage.css';

type Assunto =
  | ''
  | 'duvida-tecnica'
  | 'duvida-plataforma'
  | 'solicitacao-recurso'
  | 'relatar-problema'
  | 'financeiro'
  | 'outro';

const ASSUNTO_LABEL: Record<Assunto, string> = {
  '': 'Selecione um assunto',
  'duvida-tecnica': 'Dúvida técnica',
  'duvida-plataforma': 'Dúvida sobre a plataforma',
  'solicitacao-recurso': 'Solicitação de recurso',
  'relatar-problema': 'Relatar um problema',
  'financeiro': 'Financeiro / cobrança',
  'outro': 'Outro',
};

const PRIORIDADE_LABEL = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};

type Prioridade = keyof typeof PRIORIDADE_LABEL;

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function AtendimentoPage() {
  const [assunto, setAssunto] = useState<Assunto>('');
  const [prioridade, setPrioridade] = useState<Prioridade>('media');
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assunto || !titulo.trim() || !mensagem.trim()) return;
    setStatus('sending');
    setTimeout(() => {
      setStatus('sent');
      setAssunto('');
      setPrioridade('media');
      setTitulo('');
      setMensagem('');
    }, 1200);
  }

  const canSubmit = assunto !== '' && titulo.trim().length > 0 && mensagem.trim().length > 0;

  return (
    <div className="page">
      <StickyPageHeader
        title="Atendimento"
        description="Envie uma mensagem para a equipe da Astri"
      />

      <div className="atend-layout">
        {/* ── Formulário ── */}
        <div className="atend-card">
          {status === 'sent' ? (
            <div className="atend-success">
              <span className="material-symbols-outlined atend-success__icon">check_circle</span>
              <h2>Mensagem enviada!</h2>
              <p>Nossa equipe responderá em até 1 dia útil no e-mail cadastrado na sua conta.</p>
              <button className="btn-primary" onClick={() => setStatus('idle')}>
                Enviar nova mensagem
              </button>
            </div>
          ) : (
            <form className="atend-form" onSubmit={handleSubmit} noValidate>
              <div className="atend-form__row atend-form__row--two">
                <div className="atend-field">
                  <label className="atend-label" htmlFor="assunto">Assunto</label>
                  <select
                    id="assunto"
                    className="filter-select atend-select"
                    value={assunto}
                    onChange={(e) => setAssunto(e.target.value as Assunto)}
                    required
                  >
                    {(Object.keys(ASSUNTO_LABEL) as Assunto[]).map((k) => (
                      <option key={k} value={k} disabled={k === ''}>
                        {ASSUNTO_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="atend-field">
                  <label className="atend-label">Prioridade</label>
                  <div className="atend-priority">
                    {(Object.keys(PRIORIDADE_LABEL) as Prioridade[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={`atend-priority__btn atend-priority__btn--${p}${prioridade === p ? ' atend-priority__btn--active' : ''}`}
                        onClick={() => setPrioridade(p)}
                      >
                        {PRIORIDADE_LABEL[p]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="atend-field">
                <label className="atend-label" htmlFor="titulo">Título</label>
                <input
                  id="titulo"
                  type="text"
                  className="atend-input"
                  placeholder="Descreva brevemente o seu problema ou dúvida"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  maxLength={120}
                  required
                />
              </div>

              <div className="atend-field">
                <label className="atend-label" htmlFor="mensagem">Mensagem</label>
                <textarea
                  id="mensagem"
                  className="atend-textarea"
                  placeholder="Descreva com detalhes o que aconteceu, o que esperava que acontecesse e quaisquer passos para reproduzir o problema..."
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  rows={8}
                  required
                />
              </div>

              <div className="atend-form__footer">
                <p className="atend-form__hint">
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>schedule</span>
                  {' '}Tempo médio de resposta: <strong>1 dia útil</strong>
                </p>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!canSubmit || status === 'sending'}
                >
                  {status === 'sending' ? (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', animation: 'spin 0.8s linear infinite', display: 'inline-block' }}>progress_activity</span>
                      Enviando…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>send</span>
                      Enviar mensagem
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ── Info lateral ── */}
        <aside className="atend-aside">
          <div className="atend-info-card">
            <h3 className="atend-info-card__title">Canais de contato</h3>
            <ul className="atend-contact-list">
              <li className="atend-contact-item">
                <span className="material-symbols-outlined atend-contact-item__icon">mail</span>
                <div>
                  <p className="atend-contact-item__label">E-mail</p>
                  <p className="atend-contact-item__value">suporte@astri.solutions</p>
                </div>
              </li>
              <li className="atend-contact-item">
                <span className="material-symbols-outlined atend-contact-item__icon">schedule</span>
                <div>
                  <p className="atend-contact-item__label">Horário de atendimento</p>
                  <p className="atend-contact-item__value">Seg – Sex, 9h às 18h (BRT)</p>
                </div>
              </li>
              <li className="atend-contact-item">
                <span className="material-symbols-outlined atend-contact-item__icon">timer</span>
                <div>
                  <p className="atend-contact-item__label">Tempo médio de resposta</p>
                  <p className="atend-contact-item__value">1 dia útil</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="atend-info-card atend-info-card--tip">
            <h3 className="atend-info-card__title">
              <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle' }}>lightbulb</span>
              {' '}Dicas para um atendimento mais rápido
            </h3>
            <ul className="atend-tip-list">
              <li>Informe o nome do portal afetado</li>
              <li>Anexe prints ou vídeos quando possível</li>
              <li>Descreva os passos que levaram ao problema</li>
              <li>Indique se o problema é recorrente ou pontual</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
