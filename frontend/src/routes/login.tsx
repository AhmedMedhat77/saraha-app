import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useGoogleLogin } from "@react-oauth/google";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const { login } = useAuth();
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: (credentialResponse) => {
      console.log("Credential response:", credentialResponse);
      login();
    },
    onError: (error) => {
      console.error("Login error:", error);
    },
  });
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    //for auth routing testing
    login();

    // Redirect to the original URL or home page
    const searchParams = new URLSearchParams(window.location.search);
    const redirectTo = searchParams.get("redirect") || "/";
    navigate({ to: redirectTo });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-xl border-muted">
        <CardHeader className="text-center space-y-2">
          <img src="/logo.png" alt="Saraha Logo" className="w-16 h-16 mx-auto rounded-full" />
          <CardTitle className="text-2xl font-bold">Welcome to Saraha</CardTitle>
          <p className="text-muted-foreground text-sm">Login to continue</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input name="email" placeholder="Email" type="email" />
            <Input name="phone" placeholder="Phone" type="text" />
            <Input name="password" placeholder="Password" type="password" />
            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>

          <div className="mt-4 flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            onClick={() => handleGoogleLogin()}
            variant="outline"
            className="mt-4 w-full flex items-center justify-center gap-2 cursor-pointer"
          >
            <img src="/google-icon.webp" alt="Google Icon" className="w-4 h-4" />
            Login with Google
          </Button>

          <div className="mt-4 text-sm text-center space-y-1">
            <p>
              Don't have an account?{" "}
              <Link to="/register" className="text-primary underline">
                Register
              </Link>
            </p>
            <Link to="/forgetPassword" className="text-teal-800 underline text-xs">
              Forgot Password?
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
