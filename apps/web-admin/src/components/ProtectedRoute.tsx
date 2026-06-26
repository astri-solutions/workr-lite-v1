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

  if (user.role !== requiredRole) {
    if (user.role === 'super_admin') return <Navigate to="/admin/portais" replace />;
    if (user.role === 'client_user') return <Navigate to="/portal" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
}
