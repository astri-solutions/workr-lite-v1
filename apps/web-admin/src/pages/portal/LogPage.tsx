import { useState, useMemo } from 'react';
import StickyPageHeader from '../../components/StickyPageHeader';
import SearchInput from '../../components/SearchInput';
import { useSort } from '../../hooks/useSort';
import SortIcon from '../../components/SortIcon';
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

const MOCK_LOGS: LogEntry[] = [
  {
    id: 'l001', timestamp: '2026-07-07T09:15:00Z', user: 'Carlos Souza', email: 'carlos@imc.com.br',
    action: 'publicou', category: 'documento', entity: 'Apresentação de Resultados 1T26',
    detail: 'Documento publicado no canal "Documentos CVM".',
  },
  {
    id: 'l002', timestamp: '2026-07-07T09:08:00Z', user: 'Ana Lima', email: 'ana@imc.com.br',
    action: 'editou', category: 'materia', entity: 'Destaques do trimestre',
    detail: 'Texto e imagem de capa atualizados.',
  },
  {
    id: 'l003', timestamp: '2026-07-07T08:55:00Z', user: 'Sistema', email: 'sistema@workrlite',
    action: 'sincronizou', category: 'cvm', entity: 'International Meal Company',
    detail: '3 documentos encontrados · 2 importados.',
  },
  {
    id: 'l004', timestamp: '2026-07-06T18:40:00Z', user: 'Carlos Souza', email: 'carlos@imc.com.br',
    action: 'convidou', category: 'usuario', entity: 'Beatriz Oliveira (beatriz@imc.com.br)',
    detail: 'Convite enviado com perfil Visualizador.',
  },
  {
    id: 'l005', timestamp: '2026-07-06T17:22:00Z', user: 'Ana Lima', email: 'ana@imc.com.br',
    action: 'fez_upload', category: 'midia', entity: 'relatorio-anual-2025.pdf',
    detail: 'Arquivo enviado para Biblioteca de Mídia.',
  },
  {
    id: 'l006', timestamp: '2026-07-06T15:10:00Z', user: 'Carlos Souza', email: 'carlos@imc.com.br',
    action: 'alterou', category: 'configuracao', entity: 'Cores do portal',
    detail: 'Cor primária alterada de #0b5b68 para #1a7a8a.',
  },
  {
    id: 'l007', timestamp: '2026-07-06T14:48:00Z', user: 'Sistema', email: 'sistema@workrlite',
    action: 'gerou', category: 'backup', entity: 'Backup automático',
    detail: 'Backup diário concluído. Tamanho: 142 MB.',
  },
  {
    id: 'l008', timestamp: '2026-07-06T11:30:00Z', user: 'Ana Lima', email: 'ana@imc.com.br',
    action: 'publicou', category: 'materia', entity: 'Nota de esclarecimento — Dividendos 2T26',
    detail: 'Matéria publicada na página "Informações ao Investidor".',
  },
  {
    id: 'l009', timestamp: '2026-07-06T10:02:00Z', user: 'Carlos Souza', email: 'carlos@imc.com.br',
    action: 'pausou', category: 'cvm', entity: 'IMC Crédito Estruturado FII',
    detail: 'Importação automática pausada manualmente.',
  },
  {
    id: 'l010', timestamp: '2026-07-05T17:55:00Z', user: 'Carlos Souza', email: 'carlos@imc.com.br',
    action: 'adicionou', category: 'cvm', entity: 'IMC Recebíveis FII',
    detail: 'Entidade criada com CNPJ 44.123.456/0001-77 e código CVM 45012.',
  },
  {
    id: 'l011', timestamp: '2026-07-05T16:20:00Z', user: 'Fernanda Costa', email: 'fernanda@imc.com.br',
    action: 'editou', category: 'documento', entity: 'Formulário de Referência 2025',
    detail: 'Data de publicação ajustada.',
  },
  {
    id: 'l012', timestamp: '2026-07-05T14:05:00Z', user: 'Ana Lima', email: 'ana@imc.com.br',
    action: 'alterou', category: 'layout', entity: 'Template do portal',
    detail: 'Layout alterado de Sidebar para Banner.',
  },
  {
    id: 'l013', timestamp: '2026-07-04T10:30:00Z', user: 'Sistema', email: 'sistema@workrlite',
    action: 'sincronizou', category: 'cvm', entity: 'Construtora Aurora S.A.',
    detail: '1 documento encontrado · 1 importado.',
  },
  {
    id: 'l014', timestamp: '2026-07-04T09:15:00Z', user: 'Carlos Souza', email: 'carlos@imc.com.br',
    action: 'removeu', category: 'midia', entity: 'apresentacao-antiga.pptx',
    detail: 'Arquivo removido da Biblioteca de Mídia.',
  },
  {
    id: 'l015', timestamp: '2026-07-03T16:45:00Z', user: 'Fernanda Costa', email: 'fernanda@imc.com.br',
    action: 'publicou', category: 'documento', entity: 'Ata da Assembleia Geral 2026',
    detail: 'Documento publicado no canal "Atas e Assembleias".',
  },
  {
    id: 'l016', timestamp: '2026-07-03T11:10:00Z', user: 'Carlos Souza', email: 'carlos@imc.com.br',
    action: 'ativou', category: 'cvm', entity: 'IMC Crédito Estruturado FII',
    detail: 'Importação automática reativada.',
  },
  {
    id: 'l017', timestamp: '2026-07-03T10:00:00Z', user: 'Ana Lima', email: 'ana@imc.com.br',
    action: 'adicionou', category: 'usuario', entity: 'Fernanda Costa (fernanda@imc.com.br)',
    detail: 'Usuário adicionado com perfil Visualizador.',
  },
  {
    id: 'l018', timestamp: '2026-07-02T15:30:00Z', user: 'Sistema', email: 'sistema@workrlite',
    action: 'gerou', category: 'backup', entity: 'Backup automático',
    detail: 'Backup diário concluído. Tamanho: 139 MB.',
  },
  {
    id: 'l019', timestamp: '2026-07-02T13:22:00Z', user: 'Carlos Souza', email: 'carlos@imc.com.br',
    action: 'importou', category: 'cvm', entity: 'International Meal Company',
    detail: 'Importação histórica desde 01/01/2024. 47 documentos enfileirados.',
  },
  {
    id: 'l020', timestamp: '2026-07-01T09:05:00Z', user: 'Carlos Souza', email: 'carlos@imc.com.br',
    action: 'alterou', category: 'configuracao', entity: 'Logotipo',
    detail: 'Logotipo principal substituído.',
  },
];

const ALL_USERS = Array.from(new Set(MOCK_LOGS.map(l => l.user))).sort();

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
  if (['pausou'].includes(action)) return 'log-action--warn';
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
  const [search, setSearch] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const { sorted, col, dir, toggle } = useSort(MOCK_LOGS, 'timestamp', 'desc');

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
                  Data/Hora <SortIcon active={col === 'timestamp'} dir={col === 'timestamp' ? dir : null} />
                </span>
              </th>
              <th className="th-sort" onClick={() => toggle('user')}>
                <span className="th-sort-inner">
                  Usuário <SortIcon active={col === 'user'} dir={col === 'user' ? dir : null} />
                </span>
              </th>
              <th className="th-sort" onClick={() => toggle('category')}>
                <span className="th-sort-inner">
                  Categoria <SortIcon active={col === 'category'} dir={col === 'category' ? dir : null} />
                </span>
              </th>
              <th className="th-sort" onClick={() => toggle('action')}>
                <span className="th-sort-inner">
                  Ação <SortIcon active={col === 'action'} dir={col === 'action' ? dir : null} />
                </span>
              </th>
              <th>Entidade / Objeto</th>
              <th>Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="log-empty">Nenhum registro encontrado para os filtros selecionados.</td>
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
