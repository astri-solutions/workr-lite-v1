import './AdminPages.css';

export default function AutoCvmPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Auto CVM</h1>
          <p className="page-subtitle">Automação de obrigações regulatórias CVM.</p>
        </div>
      </div>

      <div className="placeholder-card">
        <div className="placeholder-card__icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <h2 className="placeholder-card__title">Auto CVM — Em breve</h2>
        <p className="placeholder-card__desc">
          A funcionalidade de automação de obrigações regulatórias junto à CVM está em desenvolvimento e será disponibilizada em breve. Fique atento às atualizações da plataforma.
        </p>
      </div>
    </div>
  );
}
