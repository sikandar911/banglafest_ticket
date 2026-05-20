import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  roles?: Array<'USER' | 'ADMIN' | 'SCANNER' | 'SALES_EXECUTIVE'>;
  allowPublic?: boolean;
}

export function ProtectedRoute({ roles, allowPublic = false }: Props) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // If public access is allowed and user is not authenticated, allow access
  if (allowPublic && !isAuthenticated) {
    return <Outlet />;
  }

  // If no public access and user is not authenticated, redirect to login
  if (!allowPublic && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If roles are specified and user doesn't have the required role
  if (roles && user && !roles.includes(user.role)) {
    // For public pages that allow public access but reject specific authenticated roles,
    // redirect authenticated users to their dashboard
    if (allowPublic) {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
