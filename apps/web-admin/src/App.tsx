import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
import LoginPage from './pages/LoginPage';
import PortaisPage from './pages/admin/PortaisPage';
import UsuariosPage from './pages/admin/UsuariosPage';
import AutoCvmPage from './pages/admin/AutoCvmPage';
import InformacoesPage from './pages/admin/InformacoesPage';
import PainelControlePage from './pages/admin/PainelControlePage';
import PortalPage from './pages/PortalPage';

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'super_admin') return <Navigate to="/admin/portais" replace />;
  return <Navigate to="/portal" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="super_admin">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/portais" replace />} />
            <Route path="portais" element={<PortaisPage />} />
            <Route path="usuarios" element={<UsuariosPage />} />
            <Route path="auto-cvm" element={<AutoCvmPage />} />
            <Route path="informacoes" element={<InformacoesPage />} />
            <Route path="portais/:siteId/painel" element={<PainelControlePage />} />
          </Route>

          <Route
            path="/portal"
            element={
              <ProtectedRoute requiredRole="client_user">
                <PortalPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
