import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DatePicker } from "@/components/DatePicker";

export const Route = createFileRoute("/register")({
  component: Register,
});

function Register() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      <Card className="w-full max-w-md shadow-lg border-muted">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <p className="text-sm text-muted-foreground">Sign up to join Saraha anonymously.</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <Input placeholder="Username" type="text" />
            <Input placeholder="Email" type="email" />
            <Input placeholder="Phone" type="phone" />
            <DatePicker />
            <Input placeholder=" Password" type="password" />
            <Input placeholder="Confirm Password" type="password" />
            <Button className="w-full">Register</Button>
          </form>

          <div className="mt-4 flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="mt-4 w-full flex items-center justify-center gap-2 ">
            <img src="/google-icon.webp" alt="Google Icon" className="w-4 h-4" />
            Register with Google
          </Button>

          <p className="mt-4 text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary underline">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
