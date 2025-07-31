import { createRootRoute, Outlet, useRouter } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { GoogleOAuthProvider } from "@react-oauth/google";

// Auth layout - shows only auth-related routes
function AuthLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  );
}

// Main app layout - shows protected routes
function AppLayout() {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();

  if (!isAuthenticated) {
    router.navigate({ to: "/login" });
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card p-4 shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <a href="/" className="font-bold text-lg">
              Saraha
            </a>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                logout();
                router.navigate({ to: "/login" });
              }}
              className="px-4 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="container mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}

// Root component that wraps everything with AuthProvider
export const Route = createRootRoute({
  component: () => (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR SECRET KEY "}>
      <AuthProvider>
        <RootComponent />
        <TanStackRouterDevtools />
      </AuthProvider>
    </GoogleOAuthProvider>
  ),
});

function RootComponent() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <AppLayout />;
  }

  return <AuthLayout />;
}
