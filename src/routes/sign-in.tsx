import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDownIcon } from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { AuthFrame } from "~/components/slotly/auth-frame";

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [passwordEmail, setPasswordEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpEmail, setOtpEmail] = useState("");

  const sendOtp = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: otpEmail,
        type: "sign-in",
      });
      if (error) throw new Error(error.message ?? "Failed to send code");
    },
    onSuccess: () =>
      navigate({ to: "/sign-in/otp", search: { email: otpEmail } }),
  });

  const signInWithPassword = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.signIn.email({
        email: passwordEmail,
        password,
      });
      if (error) throw new Error(error.message ?? "Failed to sign in");
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["workspace"] });
      return navigate({ to: "/dashboard" });
    },
  });

  return (
    <AuthFrame>
      <Card className="gap-7 overflow-visible bg-transparent py-0 shadow-none ring-0">
        <CardHeader className="px-0">
          <CardTitle className="font-heading text-3xl font-semibold tracking-tight">Sign in</CardTitle>
          <CardDescription>We'll email you a six-digit code.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col px-0 gap-6">
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              sendOtp.mutate();
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="otp-email">Email</Label>
              <Input
                id="otp-email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={otpEmail}
                onChange={(event) => {
                  setOtpEmail(event.target.value);
                  sendOtp.reset();
                }}
              />
            </div>
            {sendOtp.error ? (
              <p className="text-sm text-destructive">
                {sendOtp.error.message}
              </p>
            ) : null}
            <Button type="submit" disabled={sendOtp.isPending}>
              {sendOtp.isPending && <Spinner />}
              Continue with email
            </Button>
          </form>
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="group w-full">
                Sign in with password
                <ChevronDownIcon className="size-4 transition-transform group-data-[state=open]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <form
                className="flex flex-col gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  signInWithPassword.mutate();
                }}
              >
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password-email">Email</Label>
                  <Input
                    id="password-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={passwordEmail}
                    onChange={(event) => {
                      setPasswordEmail(event.target.value);
                      signInWithPassword.reset();
                    }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      to="/forgot-password"
                      className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      signInWithPassword.reset();
                    }}
                  />
                </div>
                {signInWithPassword.error ? (
                  <p className="text-sm text-destructive">
                    {signInWithPassword.error.message}
                  </p>
                ) : null}
                <Button type="submit" disabled={signInWithPassword.isPending}>
                  {signInWithPassword.isPending && <Spinner />}
              Sign in with password
                </Button>
              </form>
            </CollapsibleContent>
          </Collapsible>
          <p className="text-center text-sm text-muted-foreground">
            No account yet?{" "}
            <Link to="/sign-up" className="font-medium text-brand-text underline-offset-4 hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthFrame>
  );
}
