import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const ROLE_LANDING: Record<string, string> = {
  Admin: '/admin',
  Management: '/management/product-quality',
  'Production Manager': '/pm/dashboard',
  'Stores Manager': '/sm/dashboard',
  'Quality Manager': '/qm/dashboard',
  Inspector: '/inspector/dashboard',
};

export const RoleRedirect = () => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const dest = (user && ROLE_LANDING[user.role]) || '/admin';
  return <Navigate to={dest} replace />;
};
