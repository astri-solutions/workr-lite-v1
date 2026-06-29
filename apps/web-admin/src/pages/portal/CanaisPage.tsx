import { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import { Canal, SubCanal, DEFAULT_CANAIS } from '../../components/ChannelEditor';
import '../admin/AdminPages.css';
import './CanaisPage.css';

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

interface EditState {
  canalId: string;
  subId: string;
  label: string;
  href: string;
  targetCanalId: string;
}

export default function CanaisPage() {
  const [canais, setCanais] = useState<Canal[]>(DEFAULT_CANAIS);
  const [isDirty, setIsDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editModal, setEditModal] = useState<EditState | null>(null);

  // Block browser refresh / tab close
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirty) return;
      e.preventDefault();
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const mutate = useCallback((fn: (prev: Canal[]) => Canal[]) => {
    setCanais(fn);
    setIsDirty(true);
  }, []);

  function handleSave() {
    setIsDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  // ── Canal-level actions ──────────────────────────────
  function toggleCanal(cid: string) {
    mutate(prev => prev.map(c => c.id === cid ? { ...c, enabled: !c.enabled } : c));
  }

  function removeCanal(cid: string) {
    mutate(prev => prev.filter(c => c.id !== cid));
  }

  function moveCanal(idx: number, dir: -1 | 1) {
    mutate(prev => {
      const next = [...prev];
      const t = idx + dir;
      if (t < 0 || t >= next.length) return prev;
      [next[idx], next[t]] = [next[t], next[idx]];
      return next;
    });
  }

  function addCanal() {
    const c: Canal = { id: genId(), label: 'Nova seção', enabled: true, children: [] };
    mutate(prev => [...prev, c]);
  }

  // ── Page-level actions ───────────────────────────────
  function toggleSub(cid: string, sid: string) {
    mutate(prev => prev.map(c => c.id !== cid ? c : {
      ...c, children: c.children.map(s => s.id === sid ? { ...s, enabled: !s.enabled } : s),
    }));
  }

  function removeSub(cid: string, sid: string) {
    mutate(prev => prev.map(c => c.id !== cid ? c : {
      ...c, children: c.children.filter(s => s.id !== sid),
    }));
  }

  function moveSub(cid: string, idx: number, dir: -1 | 1) {
    mutate(prev => prev.map(c => {
      if (c.id !== cid) return c;
      const ch = [...c.children];
      const t = idx + dir;
      if (t < 0 || t >= ch.length) return c;
      [ch[idx], ch[t]] = [ch[t], ch[idx]];
      return { ...c, children: ch };
    }));
  }

  function addSub(cid: string) {
    const s: SubCanal = { id: genId(), label: 'Nova página', href: `/${genId()}.html`, enabled: true };
    mutate(prev => prev.map(c => c.id !== cid ? c : { ...c, children: [...c.children, s] }));
  }

  function openEdit(cid: string, sub: SubCanal) {
    setEditModal({ canalId: cid, subId: sub.id, label: sub.label, href: sub.href, targetCanalId: cid });
  }

  function commitEdit() {
    if (!editModal) return;
    const { canalId, subId, label, href, targetCanalId } = editModal;
    setCanais(prev => {
      // find sub
      let movingSub: SubCanal | null = null;
      const without = prev.map(c => {
        if (c.id !== canalId) return c;
        const sub = c.children.find(s => s.id === subId);
        if (sub) movingSub = { ...sub, label: label.trim() || sub.label, href: href.trim() || sub.href };
        return { ...c, children: c.children.filter(s => s.id !== subId) };
      });
      if (!movingSub) return prev;
      const ms = movingSub as SubCanal;
      return without.map(c => c.id !== targetCanalId ? c : { ...c, children: [...c.children, ms] });
    });
    setEditModal(null);
  }

  return (
    <div className="page">
      <PageHeader
        title="Árvore de canais"
        description="Configure a navegação do portal — ative, renomeie e reorganize seções e páginas."
        action={
          <button className="btn-primary" type="button" onClick={handleSave}>
            {saved
              ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>Salvo!</>
              : 'Salvar alterações'}
          </button>
        }
      />

      <div className="canais-sections">
        {canais.map((canal, ci) => (
          <div key={canal.id} className="canais-section">
            {/* Section header */}
            <div className="canais-section__head">
              <div className="canais-section__left">
                <span className={`canais-section__dot${canal.enabled ? ' canais-section__dot--on' : ''}`} />
                <span className="canais-section__name">{canal.label}</span>
                <span className="canais-section__count">{canal.children.length} {canal.children.length === 1 ? 'página' : 'páginas'}</span>
              </div>
              <div className="canais-section__actions">
                <button className="ce-icon-btn" type="button" title="Mover seção para cima" onClick={() => moveCanal(ci, -1)} disabled={ci === 0}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>
                </button>
                <button className="ce-icon-btn" type="button" title="Mover seção para baixo" onClick={() => moveCanal(ci, 1)} disabled={ci === canais.length - 1}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                </button>
                <button
                  className={`btn-action ${canal.enabled ? 'btn-action--secondary' : 'btn-action--enter'}`}
                  type="button"
                  onClick={() => toggleCanal(canal.id)}
                >
                  {canal.enabled ? 'Despublicar' : 'Publicar'}
                </button>
                <button className="btn-action btn-action--danger" type="button" onClick={() => removeCanal(canal.id)}>
                  Excluir
                </button>
              </div>
            </div>

            {/* Pages table */}
            <div className="table-wrapper canais-table-wrap">
              <table className="data-table canais-table">
                <colgroup>
                  <col className="canais-col--name" />
                  <col className="canais-col--url" />
                  <col className="canais-col--status" />
                  <col className="canais-col--order" />
                  <col className="canais-col--actions" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Página</th>
                    <th>URL</th>
                    <th>Status</th>
                    <th>Ordem</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {canal.children.length === 0 ? (
                    <tr><td colSpan={5} className="table-empty">Nenhuma página nesta seção.</td></tr>
                  ) : (
                    canal.children.map((sub, si) => (
                      <tr key={sub.id} className={sub.enabled ? '' : 'canais-row--off'}>
                        <td className="table-cell--bold">{sub.label}</td>
                        <td className="table-cell--muted canais-href">{sub.href}</td>
                        <td>
                          <span className={`badge ${sub.enabled ? 'badge--success' : 'badge--gray'}`}>
                            {sub.enabled ? 'Publicado' : 'Despublicado'}
                          </span>
                        </td>
                        <td>
                          <div className="canais-order">
                            <button className="ce-icon-btn" type="button" title="Mover para cima" onClick={() => moveSub(canal.id, si, -1)} disabled={si === 0}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>
                            </button>
                            <button className="ce-icon-btn" type="button" title="Mover para baixo" onClick={() => moveSub(canal.id, si, 1)} disabled={si === canal.children.length - 1}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button className="btn-action btn-action--enter" type="button" onClick={() => openEdit(canal.id, sub)}>Editar</button>
                            <button
                              className={`btn-action ${sub.enabled ? 'btn-action--secondary' : 'btn-action--enter'}`}
                              type="button"
                              onClick={() => toggleSub(canal.id, sub.id)}
                            >
                              {sub.enabled ? 'Despublicar' : 'Publicar'}
                            </button>
                            <button className="btn-action btn-action--danger" type="button" onClick={() => removeSub(canal.id, sub.id)}>Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <button className="canais-add-page" type="button" onClick={() => addSub(canal.id)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Adicionar página
            </button>
          </div>
        ))}

        <button className="canais-add-section" type="button" onClick={addCanal}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Adicionar novo canal
        </button>
      </div>

      {/* Edit modal */}
      {editModal && (
        <Modal
          open
          onClose={() => setEditModal(null)}
          title="Editar página"
          size="sm"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <button className="btn-action btn-action--secondary" type="button" onClick={() => setEditModal(null)}>Cancelar</button>
              <button className="btn-primary" type="button" onClick={commitEdit}>Salvar</button>
            </div>
          }
        >
          <div className="canais-edit-form">
            <label className="canais-edit-form__label">
              Nome da página
              <input
                className="canais-edit-form__input"
                type="text"
                value={editModal.label}
                onChange={e => setEditModal(m => m ? { ...m, label: e.target.value } : m)}
                autoFocus
              />
            </label>
            <label className="canais-edit-form__label">
              URL (slug)
              <input
                className="canais-edit-form__input"
                type="text"
                value={editModal.href}
                onChange={e => setEditModal(m => m ? { ...m, href: e.target.value } : m)}
              />
            </label>
            <label className="canais-edit-form__label">
              Mover para seção
              <select
                className="canais-edit-form__input filter-select"
                value={editModal.targetCanalId}
                onChange={e => setEditModal(m => m ? { ...m, targetCanalId: e.target.value } : m)}
              >
                {canais.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
}
