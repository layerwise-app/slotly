import { Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { MessageCard, PublicShell } from "~/components/slotly/public-shell";
import { Button } from "~/components/ui/button";

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter();
  console.error(error);
  return (
    <PublicShell>
      <MessageCard icon={TriangleAlert} title="Something went wrong" description="This page couldn't load. Try again in a moment.">
        <Button onClick={() => void router.invalidate()}>
          <RefreshCw />
          Try again
        </Button>
        <Button variant="outline" asChild>
          <Link to="/">Go home</Link>
        </Button>
      </MessageCard>
    </PublicShell>
  );
}
