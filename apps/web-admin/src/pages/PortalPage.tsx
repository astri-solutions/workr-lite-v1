import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function PortalPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', padding: '48px', background: '#F4F4F4', minHeight: '100vh' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', background: '#fff', borderRadius: 12, padding: 40, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
        <h1 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#0B5B68', marginBottom: 8 }}>Portal do Cliente</h1>
        <p style={{ color: '#6F6F6F', marginBottom: 24 }}>Bem-vindo, <strong>{user?.name}</strong>.</p>
        <p style={{ color: '#949494', fontSize: 14 }}>Tenant: <code style={{ background: '#F4F4F4', padding: '2px 6px', borderRadius: 4 }}>{user?.tenantId}</code></p>
        <p style={{ color: '#949494', fontSize: 14, marginTop: 32 }}>Interface do portal do cliente em construção. Em breve você terá acesso à árvore de canais, documentos e preview do site.</p>
        <button
          onClick={handleLogout}
          style={{ marginTop: 32, padding: '10px 20px', background: '#0B5B68', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
        >
          Sair
        </button>
      </div>
    </div>
  );
}
