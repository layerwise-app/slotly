import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Compass } from "lucide-react";
import { MessageCard, PublicShell } from "~/components/slotly/public-shell";
import { Button } from "~/components/ui/button";

export function NotFound({ children }: { children?: ReactNode }) {
  return (
    <PublicShell>
      <MessageCard icon={Compass} title="Page not found" description={children || "The link may have changed."}>
        <Button asChild>
          <Link to="/">Go home</Link>
        </Button>
      </MessageCard>
    </PublicShell>
  );
}
