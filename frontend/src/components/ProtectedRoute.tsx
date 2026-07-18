import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const ROLE_LANDING: Record<string, string> = {
  Admin: '/admin',
  Management: '/management/product-quality',
  ProductionManager: '/pm/dashboard',
  StoresManager: '/sm/dashboard',
  QualityManager: '/qm/dashboard',
  Inspector: '/inspector/dashboard',
};

interface ProtectedRouteProps {
  /** When set, only these roles may render the nested routes; anyone else is redirected
   *  directly to their own landing page to avoid a /app → RoleRedirect render loop. */
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps = {}) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect straight to the user's own landing page instead of bouncing through /app,
    // which caused an infinite re-render loop (Navigate → RoleRedirect → Navigate …).
    const dest = ROLE_LANDING[user.role] ?? '/login';
    return <Navigate to={dest} replace />;
  }

  return <Outlet />;
};
