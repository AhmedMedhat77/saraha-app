import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/forgetPassword")({
  component: ForgotPassword,
});

function ForgotPassword() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      <Card className="w-full max-w-md shadow-lg border-muted">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold">Forgot Password?</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter your email and we’ll send you reset instructions.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <Input placeholder="Enter your email" type="email" />
            <Button className="w-full">Send Reset Link</Button>
          </form>
          <p className="mt-4 text-sm text-center text-muted-foreground">
            Remembered your password?{" "}
            <Link to="/login" className="text-primary underline">
              Go back to login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
