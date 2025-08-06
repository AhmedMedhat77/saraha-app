import { Navigate } from '@tanstack/react-router';
import { userStore } from '@/store/userStore';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
const { isLoggedIn } = userStore();

  if (!isLoggedIn) {
    // Store the current path to redirect back after login
    const currentPath = window.location.pathname;
    return <Navigate to="/login" search={{ redirect: currentPath }} replace />;
  }

  return <>{children}</>;
}
