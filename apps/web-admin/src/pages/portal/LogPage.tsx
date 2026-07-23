import { useState, useMemo, useEffect, useCallback } from 'react';
import StickyPageHeader from '../../components/StickyPageHeader';
import SearchInput from '../../components/SearchInput';
import { useSort } from '../../hooks/useSort';
import SortIcon from '../../components/SortIcon';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { resolvePortalId } from '../../lib/portalDb';
import '../admin/AdminPages.css';
import './LogPage.css';

type LogCategory =
  | 'documento'
  | 'materia'
  | 'usuario'
  | 'configuracao'
  | 'midia'
  | 'layout'
  | 'cvm'
  | 'backup';

interface LogEntry {
  id: string;
  timestamp: string; // ISO
  user: string;
  email: string;
  action: string;
  category: LogCategory;
  entity: string;
  detail: string;
}

const CATEGORY_LABEL: Record<LogCategory, string> = {
  documento: 'Documento',
  materia: 'Matéria',
  usuario: 'Usuário',
  configuracao: 'Configuração',
  midia: 'Mídia',
  layout: 'Layout',
  cvm: 'Auto CVM',
  backup: 'Backup',
};

// Verbs used as action display names
const ACTION_LABEL: Record<string, string> = {
  publicou: 'Publicado',
  agendou: 'Agendado',
  editou: 'Editado',
  removeu: 'Removido',
  adicionou: 'Adicionado',
  pausou: 'Pausado',
  ativou: 'Ativado',
  sincronizou: 'Sincronizado',
  importou: 'Importado',
  enviou: 'Enviado',
  convidou: 'Convidado',
  alterou: 'Alterado',
  gerou: 'Gerado',
  fez_upload: 'Upload',
};

function dbToLog(r: Record<string, unknown>): LogEntry {
  return {
    id: r.id as string,
    timestamp: r.created_at as string,
    user: (r.user_name as string) || 'Sistema',
    email: (r.user_email as string) ?? '',
    action: r.action as string,
    category: r.category as LogCategory,
    entity: (r.entity as string) ?? '',
    detail: (r.detail as string) ?? '',
  };
}

function categoryClass(cat: LogCategory) {
  const map: Record<LogCategory, string> = {
    documento: 'log-cat--doc',
    materia: 'log-cat--mat',
    usuario: 'log-cat--user',
    configuracao: 'log-cat--cfg',
    midia: 'log-cat--media',
    layout: 'log-cat--layout',
    cvm: 'log-cat--cvm',
    backup: 'log-cat--backup',
  };
  return map[cat] ?? '';
}

function actionClass(action: string) {
  if (['removeu'].includes(action)) return 'log-action--danger';
  if (['publicou', 'adicionou', 'ativou', 'importou'].includes(action)) return 'log-action--success';
  if (['pausou', 'agendou'].includes(action)) return 'log-action--warn';
  return 'log-action--default';
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

function initials(nome: string) {
  if (nome === 'Sistema') return 'SYS';
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export default function LogPage() {
  const { user } = useAuth();
  const [portalDbId, setPortalDbId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => {
    const portalKey = user?.activePortalId;
    if (!portalKey) return;
    resolvePortalId(portalKey).then(id => setPortalDbId(id));
  }, [user?.activePortalId]);

  const loadLogs = useCallback(async () => {
    if (!portalDbId || !isSupabaseConfigured || !supabase) return;
    const { data } = await supabase
      .from('portal_activity_log')
      .select('*')
      .eq('portal_id', portalDbId)
      .order('created_at', { ascending: false })
      .limit(500);
    if (data) setLogs((data as Record<string, unknown>[]).map(dbToLog));
  }, [portalDbId]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const ALL_USERS = useMemo(() => Array.from(new Set(logs.map(l => l.user))), [logs]);

  const { sorted, col, dir, toggle } = useSort(logs, 'timestamp', 'desc');

  const filtered = useMemo(() => {
    return sorted.filter(l => {
      if (filterUser && l.user !== filterUser) return false;
      if (filterCategory && l.category !== filterCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!l.user.toLowerCase().includes(q) && !l.entity.toLowerCase().includes(q) && !l.action.toLowerCase().includes(q) && !l.detail.toLowerCase().includes(q)) return false;
      }
      if (filterDateFrom && l.timestamp < filterDateFrom) return false;
      if (filterDateTo && l.timestamp.slice(0, 10) > filterDateTo) return false;
      return true;
    });
  }, [sorted, filterUser, filterCategory, search, filterDateFrom, filterDateTo]);

  return (
    <div className="page">
      <StickyPageHeader
        title="Log de Atividades"
        description="Registro de todas as ações realizadas no portal — publicações, edições, configurações e operações do sistema."
      />

      <div className="toolbar">
        <div className="toolbar__filters">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por usuário, entidade ou detalhe…" />

          <div className="filter-wrap">
            <select className="filter-select" value={filterUser} onChange={e => setFilterUser(e.target.value)}>
              <option value="">Todos os usuários</option>
              {ALL_USERS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <svg className="filter-wrap__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
          </div>

          <div className="filter-wrap">
            <select className="filter-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="">Todas as categorias</option>
              {(Object.keys(CATEGORY_LABEL) as LogCategory[]).map(c => (
                <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
              ))}
            </select>
            <svg className="filter-wrap__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
          </div>

          <div className="log-date-range">
            <input
              className="log-date-input"
              type="date"
              value={filterDateFrom}
              onChange={e => setFilterDateFrom(e.target.value)}
              title="Data inicial"
            />
            <span className="log-date-sep">—</span>
            <input
              className="log-date-input"
              type="date"
              value={filterDateTo}
              onChange={e => setFilterDateTo(e.target.value)}
              title="Data final"
            />
          </div>
        </div>
        <div className="toolbar__actions">
          <span className="toolbar__count">{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="th-sort" onClick={() => toggle('timestamp')}>
                <span className="th-sort-inner">
                  Data/Hora <SortIcon dir={col === 'timestamp' ? dir : null} />
                </span>
              </th>
              <th className="th-sort" onClick={() => toggle('user')}>
                <span className="th-sort-inner">
                  Usuário <SortIcon dir={col === 'user' ? dir : null} />
                </span>
              </th>
              <th className="th-sort" onClick={() => toggle('category')}>
                <span className="th-sort-inner">
                  Categoria <SortIcon dir={col === 'category' ? dir : null} />
                </span>
              </th>
              <th className="th-sort" onClick={() => toggle('action')}>
                <span className="th-sort-inner">
                  Ação <SortIcon dir={col === 'action' ? dir : null} />
                </span>
              </th>
              <th>Entidade / Objeto</th>
              <th>Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="log-empty">
                  {sorted.length === 0
                    ? 'Ainda não há registros de atividade neste portal.'
                    : 'Nenhum registro encontrado para os filtros selecionados.'}
                </td>
              </tr>
            ) : filtered.map(log => (
              <tr key={log.id}>
                <td className="log-ts" title={fmtDateTime(log.timestamp)}>
                  <span className="log-ts__date">{fmtDate(log.timestamp)}</span>
                  <span className="log-ts__time">{new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </td>
                <td>
                  <div className="log-user">
                    <span className={`log-user__avatar${log.user === 'Sistema' ? ' log-user__avatar--system' : ''}`}>
                      {initials(log.user)}
                    </span>
                    <div className="log-user__info">
                      <span className="log-user__name">{log.user}</span>
                      {log.user !== 'Sistema' && (
                        <span className="log-user__email">{log.email}</span>
                      )}
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`log-cat ${categoryClass(log.category)}`}>
                    {CATEGORY_LABEL[log.category]}
                  </span>
                </td>
                <td>
                  <span className={`log-action ${actionClass(log.action)}`}>
                    {ACTION_LABEL[log.action] ?? log.action}
                  </span>
                </td>
                <td className="log-entity">{log.entity}</td>
                <td className="log-detail">{log.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
