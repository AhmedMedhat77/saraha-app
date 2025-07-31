import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/reset-password/$token")({
  component: ResetPasswordPage,
  validateSearch: (search: Record<string, unknown>) => ({
    email: (search.email as string) || undefined,
  }),
  beforeLoad() {
    const email = window.sessionStorage.getItem("email");
    return email;
  },
});

function ResetPasswordPage() {
  const { token } = Route.useParams();
  const email = Route.options.beforeLoad?.();

  console.log("Reset token:", token);
  console.log("Reset email:", email);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      <Card className="w-full max-w-md shadow-lg border-muted">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <p className="text-sm text-muted-foreground">
            {email ? `Reset password for ${email}` : "Choose a new password for your account."}
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <Input placeholder="New password" type="password" />
            <Input placeholder="Confirm password" type="password" />
            <Button className="w-full" type="submit">
              Reset Password
            </Button>
          </form>
          <p className="mt-4 text-sm text-center text-muted-foreground">
            Back to{" "}
            <Link to="/login" className="text-primary underline">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
