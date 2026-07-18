import { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import { usePortalState } from '../../hooks/usePortalState';
import Modal from '../../components/Modal';
import '../admin/AdminPages.css';
import './PaginasDeErroPage.css';

export const ERROR_PAGES_KEY = 'portal_error_pages';

interface ErrorPageTexts {
  title: string;
  description: string;
  cta: string;
}

interface ErrorPage {
  code: number;
  desc: string;
  descPt: string;
  texts: ErrorPageTexts | null;
}

const DEFAULT_TEXTS: Record<number, ErrorPageTexts> = {
  400: { title: 'Requisição inválida.', description: 'Os dados enviados não puderam ser processados. Verifique as informações e tente novamente.', cta: 'Voltar para home' },
  401: { title: 'Acesso não autorizado.', description: 'Você precisa estar autenticado para acessar esta página.', cta: 'Fazer login' },
  403: { title: 'Acesso negado.', description: 'Você não tem permissão para acessar este conteúdo.', cta: 'Voltar para home' },
  404: { title: 'Ops! Não conseguimos encontrar essa página.', description: 'Não conseguimos encontrar a página que você está procurando. Provavelmente o link está quebrado.', cta: 'Voltar para home' },
  500: { title: 'Erro interno do servidor.', description: 'Algo deu errado do nosso lado. Já estamos trabalhando para resolver. Tente novamente em instantes.', cta: 'Voltar para home' },
  502: { title: 'Gateway inválido.', description: 'O servidor recebeu uma resposta inválida. Tente novamente em alguns instantes.', cta: 'Voltar para home' },
  503: { title: 'Serviço temporariamente indisponível.', description: 'O servidor está em manutenção ou sobrecarregado. Tente novamente em alguns minutos.', cta: 'Voltar para home' },
};

const ERROR_ICONS: Record<number, JSX.Element> = {
  400: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" /><circle cx="12" cy="16" r=".5" fill="currentColor" />
    </svg>
  ),
  401: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  403: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  ),
  404: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
      <line x1="9" y1="14" x2="15" y2="14" /><line x1="9" y1="18" x2="12" y2="18" />
      <line x1="9" y1="10" x2="10" y2="10" />
    </svg>
  ),
  500: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
      <path d="M9 10l2 2 4-4" />
    </svg>
  ),
  502: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      <line x1="4" y1="4" x2="20" y2="20" />
    </svg>
  ),
  503: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  ),
};

function getErrorIcon(code: number): JSX.Element {
  return ERROR_ICONS[code] ?? (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><circle cx="12" cy="16" r=".5" fill="currentColor" />
    </svg>
  );
}

const DEFAULT_PAGES: ErrorPage[] = [
  { code: 400, desc: 'Bad Request',            descPt: 'Requisição inválida',      texts: null },
  { code: 401, desc: 'Authorization Required',  descPt: 'Não autorizado',           texts: null },
  { code: 403, desc: 'Forbidden',               descPt: 'Acesso negado',            texts: null },
  { code: 404, desc: 'Not Found',               descPt: 'Página não encontrada',    texts: null },
  { code: 500, desc: 'Internal Server Error',   descPt: 'Erro interno do servidor', texts: null },
  { code: 502, desc: 'Bad Gateway',             descPt: 'Gateway inválido',         texts: null },
  { code: 503, desc: 'Service Unavailable',     descPt: 'Serviço indisponível',     texts: null },
];

export default function PaginasDeErroPage() {
  const [persisted, setPersisted] = usePortalState<ErrorPage[]>(ERROR_PAGES_KEY, 'error_pages', DEFAULT_PAGES);
  // Merge persisted entries over defaults so new default pages always appear
  const pages: ErrorPage[] = DEFAULT_PAGES.map(p => ({ ...p, ...persisted.find(s => s.code === p.code) }));
  const [editing, setEditing] = useState<ErrorPage | null>(null);
  const [editTexts, setEditTexts] = useState<ErrorPageTexts>({ title: '', description: '', cta: '' });
  const [resetConfirm, setResetConfirm] = useState<number | null>(null);

  function openEdit(p: ErrorPage) {
    setEditing(p);
    setEditTexts(p.texts ?? DEFAULT_TEXTS[p.code] ?? { title: '', description: '', cta: 'Voltar para home' });
  }

  function saveEdit() {
    if (!editing) return;
    const hasChanges =
      editTexts.title !== (DEFAULT_TEXTS[editing.code]?.title ?? '') ||
      editTexts.description !== (DEFAULT_TEXTS[editing.code]?.description ?? '') ||
      editTexts.cta !== (DEFAULT_TEXTS[editing.code]?.cta ?? '');
    setPersisted(pages.map(p =>
      p.code === editing.code ? { ...p, texts: hasChanges ? { ...editTexts } : null } : p
    ));
    setEditing(null);
  }

  function resetPage(code: number) {
    setPersisted(pages.map(p => p.code === code ? { ...p, texts: null } : p));
    setResetConfirm(null);
  }

  const isCustomized = (p: ErrorPage) => p.texts !== null;

  return (
    <div className="page">
      <PageHeader
        title="Páginas de erro"
        description="Personalize as páginas exibidas quando ocorre um erro no portal."
      />

      <div className="ep-list">
        {pages.map((p, i) => (
          <div key={p.code} className={`ep-item${i === pages.length - 1 ? ' ep-item--last' : ''}`}>
            <div className="ep-item__icon-col">
              <div className="ep-item__icon">{getErrorIcon(p.code)}</div>
            </div>
            <div className="ep-item__body">
              <div className="ep-item__header">
                <span className="ep-item__code">{p.code}</span>
                <span className="ep-item__desc-pt">{p.descPt}</span>
                <span className="ep-item__desc-en">{p.desc}</span>
                {isCustomized(p) && <span className="ep-item__badge">Personalizado</span>}
              </div>
              <div className="ep-item__actions">
                <button className="ep-action-btn" type="button" onClick={() => openEdit(p)}>
                  Editar
                </button>
                {isCustomized(p) && (
                  <button
                    className="ep-action-btn ep-action-btn--reset"
                    type="button"
                    onClick={() => setResetConfirm(p.code)}
                  >
                    Redefinir
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit modal */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Editar página ${editing?.code}`}
        description={`${editing?.code} — ${editing?.descPt}`}
        size="md"
        footer={
          <div className="modal-footer">
            <button className="btn-outline" type="button" onClick={() => setEditing(null)}>
              Cancelar
            </button>
            <button className="btn-primary" type="button" onClick={saveEdit}>
              Salvar
            </button>
          </div>
        }
      >
        <div className="ep-modal-fields">
          <div className="ep-modal-field">
            <label className="ep-modal-label">Título</label>
            <input
              className="ep-modal-input"
              type="text"
              value={editTexts.title}
              onChange={e => setEditTexts(t => ({ ...t, title: e.target.value }))}
              autoFocus
            />
          </div>
          <div className="ep-modal-field">
            <label className="ep-modal-label">Descrição</label>
            <textarea
              className="ep-modal-input ep-modal-textarea"
              value={editTexts.description}
              onChange={e => setEditTexts(t => ({ ...t, description: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="ep-modal-field">
            <label className="ep-modal-label">Texto do botão</label>
            <input
              className="ep-modal-input"
              type="text"
              value={editTexts.cta}
              onChange={e => setEditTexts(t => ({ ...t, cta: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* Reset confirm modal */}
      <Modal
        open={resetConfirm !== null}
        onClose={() => setResetConfirm(null)}
        title="Redefinir página de erro"
        description={`Tem certeza que deseja restaurar o texto padrão para o erro ${resetConfirm}?`}
        size="sm"
        footer={
          <div className="modal-footer">
            <button className="btn-outline" type="button" onClick={() => setResetConfirm(null)}>
              Cancelar
            </button>
            <button
              className="btn-action btn-action--danger"
              type="button"
              onClick={() => resetPage(resetConfirm!)}
            >
              Redefinir
            </button>
          </div>
        }
      >
        <></>
      </Modal>
    </div>
  );
}
