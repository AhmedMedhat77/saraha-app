import { Navigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    // Store the current path to redirect back after login
    const currentPath = window.location.pathname;
    return <Navigate to="/login" search={{ redirect: currentPath }} replace />;
  }

  return <>{children}</>;
}
