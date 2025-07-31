import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <ProtectedRoute>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Welcome to Your Dashboard</h1>
        <p className="text-muted-foreground">You are now logged in!</p>
        <Outlet />
      </div>
    </ProtectedRoute>
  );
}
