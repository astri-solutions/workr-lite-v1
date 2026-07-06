import PageHeader from '../../components/PageHeader';
import './AreaRestritaPage.css';

const RESTRICTED_CHANNELS = [
  { id: 'rc1', label: 'Resultados Exclusivos', href: '/resultados-exclusivos', subCount: 3 },
  { id: 'rc2', label: 'Relatórios Internos', href: '/relatorios-internos', subCount: 7 },
  { id: 'rc3', label: 'Dados Privilegiados', href: '/dados-privilegiados', subCount: 1 },
];

const RESTRICTED_DOCS = [
  { id: 1, nome: 'Relatório Trimestral Q1 2026', canal: 'Resultados Exclusivos', tipo: 'PDF', dataPub: '2026-03-31' },
  { id: 2, nome: 'Ata de Reunião Extraordinária', canal: 'Relatórios Internos', tipo: 'DOC', dataPub: '2026-04-15' },
  { id: 3, nome: 'Projeções 2027 — Confidencial', canal: 'Dados Privilegiados', tipo: 'XLS', dataPub: '2026-05-02' },
  { id: 4, nome: 'Acordo de Acionistas', canal: 'Relatórios Internos', tipo: 'PDF', dataPub: '2026-01-10' },
];

export default function AreaRestritaPage() {
  return (
    <div className="page">
      <PageHeader
        title="Área Restrita"
        description="Conteúdo e canais que exigem autenticação para acesso."
      />

      <div className="ar-stats">
        <div className="ar-stat">
          <div className="ar-stat__icon">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>lock</span>
          </div>
          <div>
            <p className="ar-stat__label">Canais restritos</p>
            <p className="ar-stat__value">{RESTRICTED_CHANNELS.length}</p>
          </div>
        </div>
        <div className="ar-stat">
          <div className="ar-stat__icon">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>description</span>
          </div>
          <div>
            <p className="ar-stat__label">Documentos restritos</p>
            <p className="ar-stat__value">{RESTRICTED_DOCS.length}</p>
          </div>
        </div>
      </div>

      <div className="ar-grid">
        {/* Card: Canais restritos */}
        <div className="ar-card">
          <p className="ar-card__title">Canais restritos</p>
          <ul className="ar-channel-list">
            {RESTRICTED_CHANNELS.map(ch => (
              <li key={ch.id} className="ar-channel-item">
                <span className="ar-channel-item__icon material-symbols-outlined" style={{ fontSize: '18px' }}>lock</span>
                <div className="ar-channel-item__info">
                  <p className="ar-channel-item__name">{ch.label}</p>
                  <p className="ar-channel-item__meta">{ch.href} · {ch.subCount} subpágina{ch.subCount !== 1 ? 's' : ''}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Card: Documentos restritos */}
        <div className="ar-card">
          <p className="ar-card__title">Documentos restritos</p>
          <table className="ar-doc-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Canal</th>
                <th>Tipo</th>
                <th>Publicação</th>
              </tr>
            </thead>
            <tbody>
              {RESTRICTED_DOCS.map(doc => (
                <tr key={doc.id}>
                  <td>{doc.nome}</td>
                  <td>{doc.canal}</td>
                  <td><span className="ar-type-badge">{doc.tipo}</span></td>
                  <td>{doc.dataPub}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
