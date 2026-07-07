import StickyPageHeader from '../../components/StickyPageHeader';
import PORTAL_CONFIG from '../../portalConfig';
import { usePortalName } from '../../hooks/usePortalName';
import '../admin/AdminPages.css';

export default function MailingPage() {
  const portalName = usePortalName();
  return (
    <div className="page">
      <StickyPageHeader
        title="Mailing"
        description={<>Mailing e IRM do portal <strong>{PORTAL_CONFIG.name}</strong>.</>}
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
