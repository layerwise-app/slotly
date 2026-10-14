import type { ReactNode } from "react";
import { HeroWidget } from "~/components/landing/hero-widget";
import { SlotlyLogo } from "./brand";

export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <main className="flex min-h-dvh flex-col px-4 py-5 sm:px-8">
        <SlotlyLogo />
        <div className="animate-rise mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </main>
      <aside className="sticky top-0 hidden h-dvh items-center justify-center overflow-hidden bg-ink p-10 lg:flex">
        <span aria-hidden="true" className="absolute top-[18%] left-[22%] size-[420px] rounded-full bg-primary/15 blur-3xl" />
        <HeroWidget today={Date.now()} className="animate-float relative" />
      </aside>
    </div>
  );
}
