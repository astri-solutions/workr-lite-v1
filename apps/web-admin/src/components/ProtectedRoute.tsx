import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type Role = 'super_admin' | 'client_user';

interface ProtectedRouteProps {
  children: JSX.Element;
  requiredRole: Role;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // super_admin with portais may enter the /portal route for testing
  const canAccessPortal = user.role === 'super_admin' && (user as any).portais?.length > 0;

  if (user.role !== requiredRole) {
    if (requiredRole === 'client_user' && canAccessPortal) return children;
    if (user.role === 'super_admin') return <Navigate to="/admin/portais" replace />;
    if (user.role === 'client_user') return <Navigate to="/portal" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
}
