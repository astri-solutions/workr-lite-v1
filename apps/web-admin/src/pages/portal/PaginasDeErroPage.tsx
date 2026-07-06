import { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import '../admin/AdminPages.css';
import './PaginasDeErroPage.css';

interface ErrorPage {
  code: number;
  desc: string;
  custom: string | null;
}

const DEFAULT_PAGES: ErrorPage[] = [
  { code: 400, desc: 'Bad Request', custom: null },
  { code: 401, desc: 'Authorization Required', custom: null },
  { code: 403, desc: 'Forbidden', custom: null },
  { code: 404, desc: 'Not Found', custom: null },
  { code: 500, desc: 'Internal Server Error', custom: null },
  { code: 502, desc: 'Bad Gateway', custom: null },
  { code: 503, desc: 'Service Unavailable', custom: null },
];

export default function PaginasDeErroPage() {
  const [pages, setPages] = useState<ErrorPage[]>(DEFAULT_PAGES);
  const [editing, setEditing] = useState<ErrorPage | null>(null);
  const [editValue, setEditValue] = useState('');
  const [resetConfirm, setResetConfirm] = useState<number | null>(null);

  function openEdit(p: ErrorPage) {
    setEditing(p);
    setEditValue(p.custom ?? '');
  }

  function saveEdit() {
    if (!editing) return;
    setPages(prev => prev.map(p =>
      p.code === editing.code ? { ...p, custom: editValue.trim() || null } : p
    ));
    setEditing(null);
  }

  function resetPage(code: number) {
    setPages(prev => prev.map(p => p.code === code ? { ...p, custom: null } : p));
    setResetConfirm(null);
  }

  return (
    <div className="page">
      <PageHeader
        title="Páginas de erro"
        description="Personalize as páginas exibidas quando ocorre um erro no portal."
      />

      <div className="ep-list">
        {pages.map((p, i) => (
          <div key={p.code} className={`ep-item${i === pages.length - 1 ? ' ep-item--last' : ''}`}>
            <div className="ep-item__row">
              <span className="ep-item__key">Código de erro</span>
              <span className="ep-item__code">{p.code}</span>
            </div>
            <div className="ep-item__row">
              <span className="ep-item__key">Descrição</span>
              <span className="ep-item__val">{p.desc}</span>
            </div>
            {p.custom && (
              <div className="ep-item__row">
                <span className="ep-item__key">Página personalizada</span>
                <span className="ep-item__val ep-item__val--custom">{p.custom}</span>
              </div>
            )}
            <div className="ep-item__row">
              <span className="ep-item__key">Ações</span>
              <div className="ep-item__actions">
                <button className="ep-action-btn" type="button" onClick={() => openEdit(p)}>
                  Editar
                </button>
                {p.custom && (
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
        title={`Editar página de erro ${editing?.code}`}
        description={`Informe o caminho ou URL da página personalizada para o erro ${editing?.code} — ${editing?.desc}.`}
        size="sm"
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
        <div className="ep-modal-field">
          <label className="ep-modal-label">URL ou caminho da página</label>
          <input
            className="ep-modal-input"
            type="text"
            placeholder="ex: /erro/404.html"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            autoFocus
          />
          <p className="ep-modal-hint">Deixe em branco para usar a página padrão do servidor.</p>
        </div>
      </Modal>

      {/* Reset confirm modal */}
      <Modal
        open={resetConfirm !== null}
        onClose={() => setResetConfirm(null)}
        title="Redefinir página de erro"
        description={`Tem certeza que deseja remover a página personalizada para o erro ${resetConfirm}? A página padrão do servidor será restaurada.`}
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
