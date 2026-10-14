import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import { SlotlyLogo } from "./brand";

export function PublicShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center px-4 sm:px-6">
        <SlotlyLogo />
      </header>
      <main className={cn("mx-auto w-full max-w-5xl flex-1 px-3 pb-12 sm:px-6", className)}>{children}</main>
    </div>
  );
}

/** Centered message for missing, failed, or finished pages. */
export function MessageCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="animate-rise mx-auto mt-8 flex max-w-md flex-col items-center rounded-3xl border bg-card px-6 py-12 text-center shadow-xs sm:mt-16">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-brand-text">
        <Icon className="size-7" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold">{title}</h1>
      {description && <p className="mt-2 text-muted-foreground">{description}</p>}
      {children && <div className="mt-6 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
