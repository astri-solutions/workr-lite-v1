import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type RouteAccess = 'super_admin' | 'client_user';

interface ProtectedRouteProps {
  children: JSX.Element;
  requiredRole: RouteAccess;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdminRole = user.role === 'super_admin' || user.role === 'admin';
  const isClientRole = user.role === 'client_user' || user.role === 'editor' || user.role === 'viewer';
  const hasPortais = (user.portais?.length ?? 0) > 0;

  if (requiredRole === 'super_admin') {
    // /admin route: allow super_admin and admin
    if (isAdminRole) return children;
    // client roles: redirect to portal
    return <Navigate to="/portal" replace />;
  }

  if (requiredRole === 'client_user') {
    // /portal route: allow client roles
    if (isClientRole) return children;
    // admin roles with portais can enter portal (to admin a site)
    if (isAdminRole && hasPortais) return children;
    // admin roles without portais: back to admin
    if (isAdminRole) return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return <Navigate to="/login" replace />;
}
