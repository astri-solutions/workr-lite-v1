import { useState } from 'react';
import { Marcador, genMarcadorId } from './ChannelEditor';
import './MarcadorListEditor.css';

interface Props {
  groups: Marcador[];
  onChange: (next: Marcador[]) => void;
  /** Currently active locale tab in the surrounding form (LangTabs). */
  locale: string;
  fallbackLocale: string;
  placeholder?: string;
  addLabel?: string;
  emptyHint?: string;
}

/** Editor for "lista-agrupada" markers — reorderable rows with a per-locale
 * name, styled to match ChannelEditor's own rename/reorder/remove pattern
 * for real tree nodes, since markers are meant to feel like sub-pages even
 * though they never appear in the site's nav. */
export default function MarcadorListEditor({
  groups, onChange, locale, fallbackLocale,
  placeholder = 'Ex: Demonstrações Financeiras',
  addLabel = 'Adicionar',
  emptyHint = 'Pressione Enter ou clique em "Adicionar" para incluir um item.',
}: Props) {
  const [input, setInput] = useState('');

  function labelFor(m: Marcador): string {
    return locale === fallbackLocale ? m.label : (m.labels?.[locale] ?? '');
  }

  function renameAt(i: number, value: string) {
    onChange(groups.map((m, j) => {
      if (j !== i) return m;
      return locale === fallbackLocale
        ? { ...m, label: value, labels: { ...m.labels, [locale]: value } }
        : { ...m, labels: { ...m.labels, [locale]: value } };
    }));
  }

  function add() {
    const label = input.trim();
    if (!label) return;
    onChange([...groups, { id: genMarcadorId(), label, labels: { [locale]: label } }]);
    setInput('');
  }

  function remove(i: number) {
    onChange(groups.filter((_, j) => j !== i));
  }

  function move(i: number, dir: -1 | 1) {
    const target = i + dir;
    if (target < 0 || target >= groups.length) return;
    const next = [...groups];
    [next[i], next[target]] = [next[target], next[i]];
    onChange(next);
  }

  return (
    <div className="mk-editor">
      <div className="mk-editor__add">
        <input
          className="canais-edit-form__input"
          type="text"
          placeholder={placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <button className="btn-outline" type="button" disabled={!input.trim()} onClick={add}>{addLabel}</button>
      </div>

      {groups.length > 0 ? (
        <div className="mk-editor__list">
          {groups.map((m, i) => (
            <div key={m.id} className="mk-editor__row">
              <span className="mk-editor__reorder">
                <button type="button" title="Mover para cima" disabled={i === 0} onClick={() => move(i, -1)}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>expand_less</span>
                </button>
                <button type="button" title="Mover para baixo" disabled={i === groups.length - 1} onClick={() => move(i, 1)}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>expand_more</span>
                </button>
              </span>
              <input
                className="mk-editor__input lang-fade"
                key={locale}
                type="text"
                placeholder={locale === fallbackLocale ? undefined : '(sem tradução — usa o nome padrão)'}
                value={labelFor(m)}
                onChange={e => renameAt(i, e.target.value)}
              />
              <button type="button" className="mk-editor__remove" title="Remover" onClick={() => remove(i)}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="ct-la-cat-hint">{emptyHint}</p>
      )}
    </div>
  );
}
