import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/verifyOTP")({
  component: VerifyOTP,
});

function VerifyOTP() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      <Card className="w-full max-w-md shadow-lg border-muted">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold">Verify OTP</CardTitle>
          <p className="text-sm text-muted-foreground">
            We've sent a 6-digit code to your email. Please enter it below.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Input
                  key={i}
                  type="text"
                  maxLength={1}
                  className="text-center"
                  inputMode="numeric"
                />
              ))}
            </div>
            <Button className="w-full">Verify</Button>
          </form>

          <p className="mt-4 text-sm text-center text-muted-foreground">
            Didn’t receive the code?{" "}
            <button
              type="button"
              onClick={() => alert("Resend OTP logic goes here")}
              className="text-primary underline"
            >
              Resend
            </button>
          </p>

          <p className="mt-2 text-xs text-center text-muted-foreground">
            Check your spam folder if you don't see the email.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
