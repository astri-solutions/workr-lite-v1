import { useState, useEffect, useCallback } from 'react';
import StickyPageHeader from '../../components/StickyPageHeader';
import Modal from '../../components/Modal';
import SearchInput from '../../components/SearchInput';
import { useSort } from '../../hooks/useSort';
import SortIcon from '../../components/SortIcon';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import './AdminPages.css';
import '../portal/InteracoesPage.css';

const DOCS_BUCKET = 'portal-documents';

type Status = 'novo' | 'resolvido';
type Prioridade = 'baixa' | 'media' | 'alta';

interface Ticket {
  id: string;
  portalId: string;
  portalNome: string;
  requesterNome: string | null;
  requesterEmail: string | null;
  assunto: string | null;
  prioridade: Prioridade;
  titulo: string;
  mensagem: string;
  anexos: string[];
  status: Status;
  createdAt: string;
  resolvedAt: string | null;
}

const ASSUNTO_LABEL: Record<string, string> = {
  'duvida-tecnica': 'Dúvida técnica',
  'duvida-plataforma': 'Dúvida sobre a plataforma',
  'solicitacao-recurso': 'Solicitação de recurso',
  'relatar-problema': 'Relatar um problema',
  'financeiro': 'Financeiro / cobrança',
  'outro': 'Outro',
};

const PRIORIDADE_LABEL: Record<Prioridade, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };
const PRIORIDADE_BADGE: Record<Prioridade, string> = { baixa: 'badge--gray', media: 'badge--warning', alta: 'badge--error' };
const STATUS_LABEL: Record<Status, string> = { novo: 'Novo', resolvido: 'Resolvido' };
const STATUS_BADGE: Record<Status, string> = { novo: 'badge--warning', resolvido: 'badge--success' };

function dbToTicket(r: Record<string, unknown>, portalNomeById: Map<string, string>): Ticket {
  const portalId = r.portal_id as string;
  return {
    id: r.id as string,
    portalId,
    portalNome: portalNomeById.get(portalId) ?? 'Portal',
    requesterNome: (r.requester_nome as string | null) ?? null,
    requesterEmail: (r.requester_email as string | null) ?? null,
    assunto: (r.assunto as string | null) ?? null,
    prioridade: (r.prioridade as Prioridade) ?? 'media',
    titulo: r.titulo as string,
    mensagem: r.mensagem as string,
    anexos: Array.isArray(r.anexos) ? (r.anexos as string[]) : [],
    status: (r.status as Status) ?? 'novo',
    createdAt: r.created_at ? new Date(r.created_at as string).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
    resolvedAt: r.resolved_at ? new Date(r.resolved_at as string).toLocaleDateString('pt-BR') : null,
  };
}

// Point of atenção do pedido: um pedido de atendimento só deve aparecer para
// o super_admin marcado como responsável (portals.suporte_user_id) daquele
// portal específico — nunca para todo super_admin. Isso já é reforçado pela
// RLS de portal_atendimentos (só retorna linhas de portais cujo
// suporte_user_id bate com auth.uid()); esta página também limita o filtro
// "Empresa" só aos portais em que o usuário logado é o responsável, então a
// própria lista de opções já reflete a mesma regra.
export default function AtendimentoAdminPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [myPortals, setMyPortals] = useState<{ id: string; nome: string }[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [portalFilter, setPortalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | ''>('novo');
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [resolving, setResolving] = useState(false);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) { setLoading(false); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: portalsData, error: portalsErr } = await supabase
      .from('portals')
      .select('id, cliente')
      .eq('suporte_user_id', user.id);
    if (portalsErr) {
      console.error('portals (suporte) load failed', portalsErr);
      setLoadError(`Não foi possível carregar os portais atribuídos a você: ${portalsErr.message}`);
      setLoading(false);
      return;
    }
    const portalNomeById = new Map((portalsData ?? []).map(p => [p.id as string, p.cliente as string]));
    setMyPortals((portalsData ?? []).map(p => ({ id: p.id as string, nome: p.cliente as string })).sort((a, b) => a.nome.localeCompare(b.nome)));

    const { data: ticketsData, error: ticketsErr } = await supabase
      .from('portal_atendimentos')
      .select('*')
      .order('created_at', { ascending: false });
    if (ticketsErr) {
      console.error('portal_atendimentos load failed', ticketsErr);
      setLoadError(`Não foi possível carregar os chamados: ${ticketsErr.message}`);
      setLoading(false);
      return;
    }
    setLoadError('');
    setTickets((ticketsData ?? []).map(r => dbToTicket(r, portalNomeById)));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const _filtered = tickets.filter(t => {
    if (portalFilter && t.portalId !== portalFilter) return false;
    if (statusFilter && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const haystack = `${t.titulo} ${t.mensagem} ${t.requesterNome ?? ''} ${t.requesterEmail ?? ''} ${t.portalNome}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
  const { sorted: filtered, col, dir, toggle } = useSort(_filtered);

  const novos = tickets.filter(t => t.status === 'novo').length;
  const altaPrioridade = tickets.filter(t => t.status === 'novo' && t.prioridade === 'alta').length;

  async function resolveTicket(id: string) {
    if (!supabase) return;
    setResolving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('portal_atendimentos')
      .update({ status: 'resolvido', resolved_at: new Date().toISOString(), resolved_by: user?.id ?? null })
      .eq('id', id);
    setResolving(false);
    if (error) {
      console.error('resolve atendimento failed', error);
      alert(`Não foi possível marcar como resolvido: ${error.message}`);
      return;
    }
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'resolvido' } : t));
    setSelected(null);
  }

  async function openAnexo(path: string) {
    if (!supabase) return;
    const { data, error } = await supabase.storage.from(DOCS_BUCKET).createSignedUrl(path, 60);
    if (error || !data?.signedUrl) { alert('Não foi possível abrir o anexo.'); return; }
    window.open(data.signedUrl, '_blank', 'noopener');
  }

  return (
    <div className="page">
      <StickyPageHeader
        title="Atendimento"
        description="Chamados de suporte enviados pelos portais em que você é o responsável."
      />

      {loadError && (
        <div className="save-error-banner" role="alert">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
          <span>{loadError}</span>
        </div>
      )}

      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-card__number">{tickets.length}</span>
          <span className="stat-card__label">Total</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__number" style={{ color: '#d97706' }}>{novos}</span>
          <span className="stat-card__label">Novos</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__number" style={{ color: '#dc2626' }}>{altaPrioridade}</span>
          <span className="stat-card__label">Alta prioridade (abertos)</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__number">{myPortals.length}</span>
          <span className="stat-card__label">Portais atribuídos</span>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar__filters">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por título, mensagem, portal ou solicitante..." />
          <div className="filter-wrap">
            <select className="filter-select" value={portalFilter} onChange={e => setPortalFilter(e.target.value)}>
              <option value="">Todas as empresas</option>
              {myPortals.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <span className="material-symbols-outlined filter-wrap__icon">expand_more</span>
          </div>
          <div className="filter-wrap">
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value as Status | '')}>
              <option value="novo">Abertos</option>
              <option value="resolvido">Resolvidos</option>
              <option value="">Todos os status</option>
            </select>
            <span className="material-symbols-outlined filter-wrap__icon">expand_more</span>
          </div>
        </div>
        <div className="toolbar__actions">
          <span className="toolbar__count">{filtered.length} chamado{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {loading ? (
        <div className="page-placeholder">
          <span className="material-symbols-outlined page-placeholder__icon" style={{ fontSize: '40px' }}>hourglass_empty</span>
          <h2>Carregando…</h2>
        </div>
      ) : myPortals.length === 0 ? (
        <div className="page-placeholder">
          <span className="material-symbols-outlined page-placeholder__icon" style={{ fontSize: '40px' }}>support_agent</span>
          <h2>Nenhum portal atribuído a você</h2>
          <p>Você aparece aqui como responsável pelo atendimento assim que for atribuído a um portal em Painel de Controle → Suporte.</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="page-placeholder">
          <span className="material-symbols-outlined page-placeholder__icon" style={{ fontSize: '40px' }}>forum</span>
          <h2>Nenhum chamado ainda</h2>
          <p>Chamados abertos pelos clientes na tela de Atendimento do portal aparecerão aqui automaticamente.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th className={`th-sort${col === 'status' ? ' th-sort--active' : ''}`} onClick={() => toggle('status')}><span className="th-sort-inner">Status <SortIcon dir={col === 'status' ? dir : null} /></span></th>
                <th className={`th-sort${col === 'portalNome' ? ' th-sort--active' : ''}`} onClick={() => toggle('portalNome')}><span className="th-sort-inner">Empresa <SortIcon dir={col === 'portalNome' ? dir : null} /></span></th>
                <th className={`th-sort${col === 'titulo' ? ' th-sort--active' : ''}`} onClick={() => toggle('titulo')}><span className="th-sort-inner">Título <SortIcon dir={col === 'titulo' ? dir : null} /></span></th>
                <th>Prioridade</th>
                <th className={`th-sort${col === 'requesterEmail' ? ' th-sort--active' : ''}`} onClick={() => toggle('requesterEmail')}><span className="th-sort-inner">Solicitante <SortIcon dir={col === 'requesterEmail' ? dir : null} /></span></th>
                <th className={`th-sort${col === 'createdAt' ? ' th-sort--active' : ''}`} onClick={() => toggle('createdAt')}><span className="th-sort-inner">Recebido em <SortIcon dir={col === 'createdAt' ? dir : null} /></span></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="table-empty">Nenhum chamado encontrado.</td></tr>
              ) : (
                filtered.map(t => (
                  <tr key={t.id} className={t.status === 'novo' ? 'int-row--new' : ''}>
                    <td><span className={`badge ${STATUS_BADGE[t.status]}`}>{STATUS_LABEL[t.status]}</span></td>
                    <td className="table-cell--bold">{t.portalNome}</td>
                    <td>{t.titulo}</td>
                    <td><span className={`badge ${PRIORIDADE_BADGE[t.prioridade]}`}>{PRIORIDADE_LABEL[t.prioridade]}</span></td>
                    <td className="table-cell--muted">{t.requesterEmail ?? t.requesterNome ?? '—'}</td>
                    <td className="table-cell--muted">{t.createdAt}</td>
                    <td>
                      <button className="btn-action btn-action--enter" type="button" onClick={() => setSelected(t)}>Ver</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <Modal
          open
          onClose={() => setSelected(null)}
          title="Detalhe do chamado"
          size="md"
          footer={
            <div className="modal-footer">
              <button className="btn-outline" type="button" onClick={() => setSelected(null)}>Fechar</button>
              {selected.status !== 'resolvido' && (
                <button className="btn-primary" type="button" disabled={resolving} onClick={() => resolveTicket(selected.id)}>
                  {resolving ? 'Marcando…' : 'Marcar como resolvido'}
                </button>
              )}
            </div>
          }
        >
          <div className="int-detail">
            <div className="int-detail__row">
              <span className="int-detail__label">Empresa</span>
              <span className="int-detail__value">{selected.portalNome}</span>
            </div>
            <div className="int-detail__row">
              <span className="int-detail__label">Solicitante</span>
              <span className="int-detail__value">{selected.requesterNome || '—'}</span>
            </div>
            {selected.requesterEmail && (
              <div className="int-detail__row">
                <span className="int-detail__label">E-mail</span>
                <a className="int-detail__link" href={`mailto:${selected.requesterEmail}`}>{selected.requesterEmail}</a>
              </div>
            )}
            {selected.assunto && (
              <div className="int-detail__row">
                <span className="int-detail__label">Assunto</span>
                <span className="int-detail__value">{ASSUNTO_LABEL[selected.assunto] ?? selected.assunto}</span>
              </div>
            )}
            <div className="int-detail__row">
              <span className="int-detail__label">Prioridade</span>
              <span className={`badge ${PRIORIDADE_BADGE[selected.prioridade]}`}>{PRIORIDADE_LABEL[selected.prioridade]}</span>
            </div>
            <div className="int-detail__row">
              <span className="int-detail__label">Recebido em</span>
              <span className="int-detail__value">{selected.createdAt}</span>
            </div>
            <div className="int-detail__row">
              <span className="int-detail__label">Status</span>
              <span className={`badge ${STATUS_BADGE[selected.status]}`}>{STATUS_LABEL[selected.status]}</span>
            </div>
            <div className="int-detail__msg-label">{selected.titulo}</div>
            <div className="int-detail__msg">{selected.mensagem}</div>
            {selected.anexos.length > 0 && (
              <>
                <div className="int-detail__msg-label">Anexos</div>
                <div className="footer-legal-links" style={{ gap: 'var(--space-2)' }}>
                  {selected.anexos.map((path, i) => (
                    <button key={i} type="button" className="btn-action btn-action--secondary" onClick={() => openAnexo(path)}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>attach_file</span>
                      {path.split('/').pop()}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
