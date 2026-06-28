import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
import ClientLayout from './components/ClientLayout';
import LoginPage from './pages/LoginPage';
import PortaisPage from './pages/admin/PortaisPage';
import UsuariosPage from './pages/admin/UsuariosPage';
import AutoCvmPage from './pages/admin/AutoCvmPage';
import InformacoesPage from './pages/admin/InformacoesPage';
import PainelControlePage from './pages/admin/PainelControlePage';
import NovoPortalPage from './pages/admin/NovoPortalPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import CentralDeResultadosPage from './pages/portal/CentralDeResultadosPage';
import DocumentosPage from './pages/portal/DocumentosPage';
import InformacoesPortalPage from './pages/portal/InformacoesPortalPage';
import {
  MidiaPage,
  CanaisPage,
  MateriasPage,
  InteracoesPage,
  LayoutPage,
  CoresPage,
  FontesPage,
  LogotipoPage,
  FaviconPage,
  BannerPage,
} from './pages/portal/PlaceholderPages';

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
            <Route path="portais/novo" element={<NovoPortalPage />} />
            <Route path="usuarios" element={<UsuariosPage />} />
            <Route path="auto-cvm" element={<AutoCvmPage />} />
            <Route path="informacoes" element={<InformacoesPage />} />
            <Route path="portais/:siteId/painel" element={<PainelControlePage />} />
            <Route path="portais/:siteId/analytics" element={<AnalyticsPage />} />
          </Route>

          <Route
            path="/portal"
            element={
              <ProtectedRoute requiredRole="client_user">
                <ClientLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/portal/central-de-resultados" replace />} />
            <Route path="central-de-resultados" element={<CentralDeResultadosPage />} />
            <Route path="documentos" element={<DocumentosPage />} />
            <Route path="midia" element={<MidiaPage />} />
            <Route path="canais" element={<CanaisPage />} />
            <Route path="materias" element={<MateriasPage />} />
            <Route path="interacoes" element={<InteracoesPage />} />
            <Route path="layout" element={<LayoutPage />} />
            <Route path="cores" element={<CoresPage />} />
            <Route path="fontes" element={<FontesPage />} />
            <Route path="logotipo" element={<LogotipoPage />} />
            <Route path="favicon" element={<FaviconPage />} />
            <Route path="banner" element={<BannerPage />} />
            <Route path="informacoes" element={<InformacoesPortalPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
