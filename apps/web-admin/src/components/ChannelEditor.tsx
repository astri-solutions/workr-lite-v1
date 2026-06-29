import { useState } from 'react';
import './ChannelEditor.css';

export const CANAIS_KEY = 'portal_canais';

export interface SubCanal {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
}

export interface Canal {
  id: string;
  label: string;
  href?: string;
  enabled: boolean;
  children: SubCanal[];
}

export const DEFAULT_CANAIS: Canal[] = [
  { id: 'a-companhia', label: 'A Companhia', href: '/a-companhia.html', enabled: true, children: [] },
  {
    id: 'governanca', label: 'Governança', enabled: true, children: [
      { id: 'composicao', label: 'Composição Acionária', href: '/composicao-acionaria.html', enabled: true },
      { id: 'atas', label: 'Atas e Assembleias', href: '/atas-assembleias.html', enabled: true },
      { id: 'docs-cvm', label: 'Documentos CVM', href: '/documentos-cvm.html', enabled: true },
    ],
  },
  {
    id: 'investidores', label: 'Investidores', enabled: true, children: [
      { id: 'resultados', label: 'Central de Resultados', href: '/central-resultados.html', enabled: true },
      { id: 'calendario', label: 'Calendário de Eventos', href: '/calendario-eventos.html', enabled: true },
      { id: 'ratings', label: 'Ratings', href: '/ratings.html', enabled: true },
    ],
  },
  {
    id: 'contato', label: 'Contato', enabled: true, children: [
      { id: 'fale-ri', label: 'Fale com RI', href: '/fale-com-ri.html', enabled: true },
      { id: 'mailing', label: 'Mailing', href: '/mailing.html', enabled: true },
    ],
  },
];

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

interface Props {
  value: Canal[];
  onChange: (canais: Canal[]) => void;
}

export default function ChannelEditor({ value, onChange }: Props) {
  const [editing, setEditing] = useState<{ cid: string; sid?: string } | null>(null);
  const [editLabel, setEditLabel] = useState('');

  function startEdit(cid: string, label: string, sid?: string) {
    setEditing({ cid, sid });
    setEditLabel(label);
  }

  function commitEdit() {
    if (!editing) return;
    const label = editLabel.trim();
    if (!label) { setEditing(null); return; }
    onChange(value.map(c => {
      if (c.id !== editing.cid) return c;
      if (!editing.sid) return { ...c, label };
      return { ...c, children: c.children.map(s => s.id === editing.sid ? { ...s, label } : s) };
    }));
    setEditing(null);
  }

  function toggleCanal(cid: string) {
    onChange(value.map(c => c.id === cid ? { ...c, enabled: !c.enabled } : c));
  }

  function toggleSub(cid: string, sid: string) {
    onChange(value.map(c => c.id !== cid ? c : {
      ...c, children: c.children.map(s => s.id === sid ? { ...s, enabled: !s.enabled } : s),
    }));
  }

  function moveCanal(idx: number, dir: -1 | 1) {
    const next = [...value];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  function moveSub(cid: string, idx: number, dir: -1 | 1) {
    onChange(value.map(c => {
      if (c.id !== cid) return c;
      const ch = [...c.children];
      const target = idx + dir;
      if (target < 0 || target >= ch.length) return c;
      [ch[idx], ch[target]] = [ch[target], ch[idx]];
      return { ...c, children: ch };
    }));
  }

  function addCanal() {
    const c: Canal = { id: genId(), label: 'Nova seção', enabled: true, children: [] };
    onChange([...value, c]);
    startEdit(c.id, c.label);
  }

  function removeCanal(cid: string) {
    onChange(value.filter(c => c.id !== cid));
  }

  function addSub(cid: string) {
    const s: SubCanal = { id: genId(), label: 'Nova página', href: `/${genId()}.html`, enabled: true };
    onChange(value.map(c => c.id !== cid ? c : { ...c, children: [...c.children, s] }));
    startEdit(cid, s.label, s.id);
  }

  function removeSub(cid: string, sid: string) {
    onChange(value.map(c => c.id !== cid ? c : { ...c, children: c.children.filter(s => s.id !== sid) }));
  }

  return (
    <div className="ce-root">
      <div className="ce-list">
        {value.map((canal, ci) => (
          <div key={canal.id} className={`ce-canal${canal.enabled ? '' : ' ce-canal--disabled'}`}>
            <div className="ce-canal__header">
              <button className="ce-toggle" type="button" onClick={() => toggleCanal(canal.id)} title={canal.enabled ? 'Desativar' : 'Ativar'}>
                <div className={`ce-toggle__track${canal.enabled ? ' ce-toggle__track--on' : ''}`}>
                  <div className="ce-toggle__thumb" />
                </div>
              </button>

              {editing?.cid === canal.id && !editing.sid ? (
                <input
                  className="ce-inline-input"
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null); }}
                  autoFocus
                />
              ) : (
                <span className="ce-canal__label" onDoubleClick={() => startEdit(canal.id, canal.label)}>
                  {canal.label}
                </span>
              )}

              <div className="ce-canal__actions">
                <button className="ce-action" type="button" title="Renomear" onClick={() => startEdit(canal.id, canal.label)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button className="ce-action" type="button" title="Mover para cima" onClick={() => moveCanal(ci, -1)} disabled={ci === 0}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>
                </button>
                <button className="ce-action" type="button" title="Mover para baixo" onClick={() => moveCanal(ci, 1)} disabled={ci === value.length - 1}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                </button>
                <button className="ce-action ce-action--danger" type="button" title="Remover" onClick={() => removeCanal(canal.id)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {canal.children.length > 0 && (
              <div className="ce-subs">
                {canal.children.map((sub, si) => (
                  <div key={sub.id} className={`ce-sub${sub.enabled ? '' : ' ce-sub--disabled'}`}>
                    <button className="ce-toggle ce-toggle--sm" type="button" onClick={() => toggleSub(canal.id, sub.id)}>
                      <div className={`ce-toggle__track${sub.enabled ? ' ce-toggle__track--on' : ''}`}>
                        <div className="ce-toggle__thumb" />
                      </div>
                    </button>

                    {editing?.cid === canal.id && editing.sid === sub.id ? (
                      <input
                        className="ce-inline-input"
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null); }}
                        autoFocus
                      />
                    ) : (
                      <span className="ce-sub__label" onDoubleClick={() => startEdit(canal.id, sub.label, sub.id)}>
                        {sub.label}
                      </span>
                    )}

                    <div className="ce-sub__actions">
                      <button className="ce-action" type="button" title="Renomear" onClick={() => startEdit(canal.id, sub.label, sub.id)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button className="ce-action" type="button" title="Mover para cima" onClick={() => moveSub(canal.id, si, -1)} disabled={si === 0}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>
                      </button>
                      <button className="ce-action" type="button" title="Mover para baixo" onClick={() => moveSub(canal.id, si, 1)} disabled={si === canal.children.length - 1}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                      </button>
                      <button className="ce-action ce-action--danger" type="button" title="Remover" onClick={() => removeSub(canal.id, sub.id)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button className="ce-add-sub" type="button" onClick={() => addSub(canal.id)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Adicionar página
            </button>
          </div>
        ))}
      </div>

      <button className="ce-add-canal" type="button" onClick={addCanal}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        Adicionar seção
      </button>
    </div>
  );
}
