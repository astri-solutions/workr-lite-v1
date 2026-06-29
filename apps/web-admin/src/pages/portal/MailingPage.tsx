import PageHeader from '../../components/PageHeader';
import '../admin/AdminPages.css';

export default function MailingPage() {
  return (
    <div className="page">
      <PageHeader
        title="Mailing"
        description="Gestão de listas de mailing e integração com IRM."
      />
      <div className="page-placeholder">
        <span className="material-symbols-outlined page-placeholder__icon" style={{ fontSize: '48px' }}>contact_mail</span>
        <h2>Em construção</h2>
        <p>
          O módulo de Mailing está sendo desenvolvido e será integrado ao IRM (Investor Relations Management).
          Em breve você poderá configurar listas, enviar comunicados e acompanhar métricas de entrega diretamente por aqui.
        </p>
      </div>
    </div>
  );
}
