import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './SelecionarPortalPage.css';

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function SelecionarPortalPage() {
  const { user, switchPortal } = useAuth();
  const navigate = useNavigate();
  const portais = user?.portais ?? [];

  useEffect(() => {
    if (!user) { navigate('/login', { replace: true }); return; }
    if (portais.length === 1) { switchPortal(portais[0].id); navigate('/portal', { replace: true }); }
  }, [user]);

  function handleSelect(portalId: string) {
    switchPortal(portalId);
    navigate('/portal', { replace: true });
  }

  if (!user || portais.length <= 1) return null;

  return (
    <div className="sp-shell">
      <div className="sp-card">
        <div className="sp-header">
          <img src="/logos/logotipo-original.svg" alt="Astri" className="sp-logo" />
          <h1 className="sp-title">Selecione o portal</h1>
          <p className="sp-desc">Olá, <strong>{user.name}</strong>. Você tem acesso a mais de um portal. Escolha com qual deseja trabalhar.</p>
        </div>

        <div className="sp-list">
          {portais.map(portal => (
            <button
              key={portal.id}
              type="button"
              className="sp-item"
              onClick={() => handleSelect(portal.id)}
            >
              <span className="sp-item__avatar">{getInitials(portal.nome)}</span>
              <span className="sp-item__name">{portal.nome}</span>
              <svg className="sp-item__arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
