import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "~/lib/auth-client";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { AuthFrame } from "~/components/slotly/auth-frame";

export const Route = createFileRoute("/sign-up")({
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const passwordsMatch = password === confirmPassword;

  const signUp = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.signUp.email({
        name,
        email,
        password,
      });
      if (error) throw new Error(error.message ?? "Failed to create account");
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["workspace"] });
      return navigate({ to: "/dashboard" });
    },
  });

  return (
    <AuthFrame>
      <Card className="auth-card">
        <CardHeader>
          <CardTitle>Make time yours.</CardTitle>
          <CardDescription>
            Create your personal workspace. Good conversations start here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!passwordsMatch) return;
              signUp.mutate();
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                autoComplete="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                aria-invalid={confirmPassword ? !passwordsMatch : undefined}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              {confirmPassword && !passwordsMatch ? (
                <p className="text-sm text-destructive">
                  Passwords do not match.
                </p>
              ) : null}
            </div>
            {signUp.error ? (
              <p className="text-sm text-destructive">{signUp.error.message}</p>
            ) : null}
            <Button
              type="submit"
              disabled={!passwordsMatch || signUp.isPending}
            >
              {signUp.isPending
                ? "Creating workspace..."
                : "Create your workspace"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/sign-in" className="underline">
                Sign in
              </Link>
            </p>
            <Link
              to="/demo"
              className="text-center text-xs text-muted-foreground"
            >
              Explore the preview first
            </Link>
          </form>
        </CardContent>
      </Card>
    </AuthFrame>
  );
}
