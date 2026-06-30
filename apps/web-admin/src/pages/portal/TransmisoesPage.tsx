import PageHeader from '../../components/PageHeader';
import PORTAL_CONFIG from '../../portalConfig';
import '../admin/AdminPages.css';

export default function TransmisoesPage() {
  return (
    <div className="page">
      <PageHeader
        title="Transmissões"
        description={<>Transmissões ao vivo e gravadas do portal <strong>{PORTAL_CONFIG.name}</strong>.</>}
      />

      <div className="page-placeholder">
        <span className="material-symbols-outlined page-placeholder__icon">live_tv</span>
        <h2 className="page-placeholder__title">Em construção</h2>
        <p className="page-placeholder__desc">
          O módulo de transmissões está sendo desenvolvido e estará disponível em breve.
        </p>
      </div>
    </div>
  );
}
