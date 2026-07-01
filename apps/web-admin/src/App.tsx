import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
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
import CanaisPage from './pages/portal/CanaisPage';
import EmpresasPage from './pages/portal/EmpresasPage';
import UsuariosPortalPage from './pages/portal/UsuariosPortalPage';
import MidiaPage from './pages/portal/MidiaPage';
import MateriasPage from './pages/portal/MateriasPage';
import InteracoesPage from './pages/portal/InteracoesPage';
import LayoutPage from './pages/portal/LayoutPage';
import CoresPage from './pages/portal/CoresPage';
import FontesPage from './pages/portal/FontesPage';
import LogotipoPage from './pages/portal/LogotipoPage';
import FaviconPage from './pages/portal/FaviconPage';
import BannerPage from './pages/portal/BannerPage';
import DashboardPage from './pages/portal/DashboardPage';
import NovaMateriaPage from './pages/portal/NovaMateriaPage';
import NovoFormularioPage from './pages/portal/NovoFormularioPage';
import CalendarioPage from './pages/portal/CalendarioPage';
import SplashPage from './pages/portal/SplashPage';
import MailingPage from './pages/portal/MailingPage';
import PlanilhaDinamicaPage from './pages/portal/PlanilhaDinamicaPage';
import TransmisoesPage from './pages/portal/TransmisoesPage';
import FooterPage from './pages/portal/FooterPage';
import CookiesPage from './pages/portal/CookiesPage';
import AtendimentoPage from './pages/portal/AtendimentoPage';

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'super_admin') return <Navigate to="/admin/portais" replace />;
  return <Navigate to="/portal" replace />;
}

const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/admin',
    element: (
      <ProtectedRoute requiredRole="super_admin">
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/portais" replace /> },
      { path: 'portais', element: <PortaisPage /> },
      { path: 'portais/novo', element: <NovoPortalPage /> },
      { path: 'usuarios', element: <UsuariosPage /> },
      { path: 'auto-cvm', element: <AutoCvmPage /> },
      { path: 'informacoes', element: <InformacoesPage /> },
      { path: 'portais/:siteId/painel', element: <PainelControlePage /> },
      { path: 'portais/:siteId/analytics', element: <AnalyticsPage /> },
      { path: 'empresas', element: <EmpresasPage /> },
      { path: 'usuarios-portal', element: <UsuariosPortalPage /> },
    ],
  },
  {
    path: '/portal',
    element: (
      <ProtectedRoute requiredRole="client_user">
        <ClientLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/portal/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'empresas', element: <EmpresasPage /> },
      { path: 'usuarios-portal', element: <UsuariosPortalPage /> },
      { path: 'central-de-resultados', element: <CentralDeResultadosPage /> },
      { path: 'documentos', element: <DocumentosPage /> },
      { path: 'midia', element: <MidiaPage /> },
      { path: 'canais', element: <CanaisPage /> },
      { path: 'materias', element: <MateriasPage /> },
      { path: 'materias/nova', element: <NovaMateriaPage /> },
      { path: 'materias/formulario', element: <NovoFormularioPage /> },
      { path: 'calendario', element: <CalendarioPage /> },
      { path: 'splash', element: <SplashPage /> },
      { path: 'mailing', element: <MailingPage /> },
      { path: 'planilha-dinamica', element: <PlanilhaDinamicaPage /> },
      { path: 'transmissoes', element: <TransmisoesPage /> },
      { path: 'interacoes', element: <InteracoesPage /> },
      { path: 'layout', element: <LayoutPage /> },
      { path: 'cores', element: <CoresPage /> },
      { path: 'fontes', element: <FontesPage /> },
      { path: 'logotipo', element: <LogotipoPage /> },
      { path: 'favicon', element: <FaviconPage /> },
      { path: 'banner', element: <BannerPage /> },
      { path: 'footer', element: <FooterPage /> },
      { path: 'cookies', element: <CookiesPage /> },
      { path: 'atendimento', element: <AtendimentoPage /> },
      { path: 'informacoes', element: <InformacoesPortalPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
