import { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import PORTAL_CONFIG from '../../portalConfig';
import '../admin/AdminPages.css';
import './InteracoesPage.css';

type Tipo = 'fale-ri' | 'mailing';
type Status = 'novo' | 'lido' | 'respondido';

interface Interacao {
  id: string;
  tipo: Tipo;
  nome: string;
  email: string;
  mensagem: string;
  status: Status;
  data: string;
}

const INITIAL: Interacao[] = [
  { id: 'i1', tipo: 'fale-ri', nome: 'Roberto Alves', email: 'roberto@investidor.com', mensagem: 'Gostaria de receber o relatório anual 2025 e informações sobre dividendos.', status: 'novo', data: '28/06/2026' },
  { id: 'i2', tipo: 'mailing', nome: 'Patrícia Melo', email: 'patricia@fundo.com.br', mensagem: 'Solicitação de cadastro na lista de emails de RI.', status: 'novo', data: '27/06/2026' },
  { id: 'i3', tipo: 'fale-ri', nome: 'Eduardo Santos', email: 'esantos@banco.com.br', mensagem: 'Quando será divulgado o resultado do 2T26?', status: 'lido', data: '25/06/2026' },
  { id: 'i4', tipo: 'fale-ri', nome: 'Camila Neves', email: 'cneves@gest.com', mensagem: 'Preciso do contato do diretor de RI para uma reunião.', status: 'respondido', data: '20/06/2026' },
  { id: 'i5', tipo: 'mailing', nome: 'Henrique Lima', email: 'hlima@private.com', mensagem: 'Quero ser incluído na lista de distribuição de resultados.', status: 'respondido', data: '15/06/2026' },
];

const STATUS_LABEL: Record<Status, string> = { novo: 'Novo', lido: 'Lido', respondido: 'Respondido' };
const STATUS_BADGE: Record<Status, string> = { novo: 'badge--warning', lido: 'badge--gray', respondido: 'badge--success' };
const TIPO_LABEL: Record<Tipo, string> = { 'fale-ri': 'Fale com RI', mailing: 'Mailing' };

export default function InteracoesPage() {
  const [items, setItems] = useState<Interacao[]>(INITIAL);
  const [filterTipo, setFilterTipo] = useState<Tipo | ''>('');
  const [filterStatus, setFilterStatus] = useState<Status | ''>('');
  const [selected, setSelected] = useState<Interacao | null>(null);

  const filtered = items.filter(i => {
    if (filterTipo && i.tipo !== filterTipo) return false;
    if (filterStatus && i.status !== filterStatus) return false;
    return true;
  });

  function markAs(id: string, status: Status) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
  }

  function openItem(item: Interacao) {
    setSelected(item);
    if (item.status === 'novo') markAs(item.id, 'lido');
  }

  const novos = items.filter(i => i.status === 'novo').length;

  return (
    <div className="page">
      <PageHeader
        title="Interações"
        description={<>Mensagens recebidas pelo portal <strong>{PORTAL_CONFIG.name}</strong>.</>}
      />

      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-card__number">{items.length}</span>
          <span className="stat-card__label">Total</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__number" style={{ color: '#d97706' }}>{novos}</span>
          <span className="stat-card__label">Novos</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__number">{items.filter(i => i.tipo === 'fale-ri').length}</span>
          <span className="stat-card__label">Fale com RI</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__number">{items.filter(i => i.tipo === 'mailing').length}</span>
          <span className="stat-card__label">Mailing</span>
        </div>
      </div>

      <div className="int-toolbar">
        <div className="filter-wrap">
          <select className="filter-select" value={filterTipo} onChange={e => setFilterTipo(e.target.value as Tipo | '')}>
            <option value="">Todos os formulários</option>
            <option value="fale-ri">Fale com RI</option>
            <option value="mailing">Mailing</option>
          </select>
          <span className="material-symbols-outlined filter-wrap__icon">expand_more</span>
        </div>
        <div className="filter-wrap">
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value as Status | '')}>
            <option value="">Todos os status</option>
            <option value="novo">Novos</option>
            <option value="lido">Lidos</option>
            <option value="respondido">Respondidos</option>
          </select>
          <span className="material-symbols-outlined filter-wrap__icon">expand_more</span>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Formulário</th>
              <th>Status</th>
              <th>Data</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="table-empty">Nenhuma interação encontrada.</td></tr>
            ) : (
              filtered.map(i => (
                <tr key={i.id} className={i.status === 'novo' ? 'int-row--new' : ''}>
                  <td className="table-cell--bold">{i.nome}</td>
                  <td className="table-cell--muted">{i.email}</td>
                  <td><span className="badge badge--gray">{TIPO_LABEL[i.tipo]}</span></td>
                  <td><span className={`badge ${STATUS_BADGE[i.status]}`}>{STATUS_LABEL[i.status]}</span></td>
                  <td className="table-cell--muted">{i.data}</td>
                  <td>
                    <button className="btn-action btn-action--enter" type="button" onClick={() => openItem(i)}>
                      Ver
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <Modal
          open
          onClose={() => setSelected(null)}
          title="Detalhe da interação"
          size="md"
          footer={
            <div className="modal-footer">
              <button className="btn-outline" type="button" onClick={() => setSelected(null)}>Fechar</button>
              {selected.status !== 'respondido' && (
                <button className="btn-primary" type="button"
                  onClick={() => { markAs(selected.id, 'respondido'); setSelected(null); }}>
                  Marcar como respondido
                </button>
              )}
            </div>
          }
        >
          <div className="int-detail">
            <div className="int-detail__row">
              <span className="int-detail__label">Nome</span>
              <span className="int-detail__value">{selected.nome}</span>
            </div>
            <div className="int-detail__row">
              <span className="int-detail__label">E-mail</span>
              <a className="int-detail__link" href={`mailto:${selected.email}`}>{selected.email}</a>
            </div>
            <div className="int-detail__row">
              <span className="int-detail__label">Formulário</span>
              <span className="int-detail__value">{TIPO_LABEL[selected.tipo]}</span>
            </div>
            <div className="int-detail__row">
              <span className="int-detail__label">Data</span>
              <span className="int-detail__value">{selected.data}</span>
            </div>
            <div className="int-detail__row">
              <span className="int-detail__label">Status</span>
              <span className={`badge ${STATUS_BADGE[selected.status]}`}>{STATUS_LABEL[selected.status]}</span>
            </div>
            <div className="int-detail__msg-label">Mensagem</div>
            <div className="int-detail__msg">{selected.mensagem}</div>
          </div>
        </Modal>
      )}
    </div>
  );
}
