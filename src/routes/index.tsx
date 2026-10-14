import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AvailabilityFragment, BookingsFragment, EventTypesFragment } from "~/components/landing/feature-fragments";
import { HeroWidget } from "~/components/landing/hero-widget";
import { TimezoneBand } from "~/components/landing/timezone-band";
import { useReveal } from "~/components/landing/use-reveal";
import { SlotlyLogo } from "~/components/slotly/brand";
import { Button } from "~/components/ui/button";
import { getAuthSession } from "~/lib/auth.functions";
import { cn } from "~/lib/utils";
import { seo } from "~/utils/seo";

export const Route = createFileRoute("/")({
  loader: async () => {
    const session = await getAuthSession();
    return { signedIn: !!session && !session.user.banned, today: Date.now() };
  },
  head: () => ({
    meta: seo({
      title: "Slotly | Booking links that respect your calendar",
      description: "Share one link. Guests pick an open time in their own timezone. No back-and-forth.",
    }),
  }),
  component: Home,
});

const FEATURES = [
  {
    title: "A link for every kind of meeting",
    text: "Set duration, notice, daily limits, and location for each event type.",
    fragment: EventTypesFragment,
  },
  {
    title: "Hours that fit your week",
    text: "Weekly hours, buffers between meetings, and days off.",
    fragment: AvailabilityFragment,
  },
  {
    title: "Every booking in one place",
    text: "See what's next, spot trends, and cancel with a note your guest sees.",
    fragment: BookingsFragment,
  },
];

function Home() {
  const { signedIn, today } = Route.useLoaderData();
  useReveal();
  return (
    <div className="overflow-x-clip">
      <header className="sticky top-0 z-40 border-b border-transparent bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
          <SlotlyLogo className="mr-auto" />
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link to="/demo">Demo</Link>
          </Button>
          {signedIn ? (
            <Button asChild>
              <Link to="/dashboard">Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link to="/sign-in">Sign in</Link>
              </Button>
              <Button asChild>
                <Link to="/sign-up">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16 lg:pt-20 lg:pb-28">
          <div className="flex flex-col items-start">
            <h1
              className="animate-rise text-[2.75rem] leading-[1.02] font-bold sm:text-6xl lg:text-7xl"
              style={{ "--i": 0 } as React.CSSProperties}
            >
              Booking links that respect your calendar.
            </h1>
            <p
              className="animate-rise mt-6 max-w-md text-lg text-muted-foreground sm:text-xl"
              style={{ "--i": 1 } as React.CSSProperties}
            >
              Share one link. Guests pick an open time in their own timezone.
            </p>
            <div className="animate-rise mt-8 flex flex-wrap gap-3" style={{ "--i": 2 } as React.CSSProperties}>
              <Button size="lg" asChild className="group h-12 rounded-xl px-6 text-base">
                <Link to={signedIn ? "/dashboard" : "/sign-up"}>
                  {signedIn ? "Open dashboard" : "Get started free"}
                  <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 rounded-xl bg-card px-6 text-base">
                <Link to="/demo">Try the demo</Link>
              </Button>
            </div>
          </div>
          <div className="animate-rise relative flex justify-center lg:justify-end" style={{ "--i": 3 } as React.CSSProperties}>
            <span aria-hidden="true" className="absolute top-8 right-[8%] bottom-[-6%] left-[14%] rotate-3 rounded-[36px] bg-primary" />
            <HeroWidget today={today} className="relative -rotate-1" />
          </div>
        </section>

        <section className="border-y bg-card/60">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16 lg:py-28">
            <div data-reveal>
              <h2 className="text-4xl font-semibold sm:text-5xl">One slot. Every timezone.</h2>
              <p className="mt-4 max-w-sm text-lg text-muted-foreground">
                Guests see your hours in their local time, with daylight saving handled.
              </p>
            </div>
            <div data-reveal style={{ "--i": 1 } as React.CSSProperties}>
              <TimezoneBand today={today} />
            </div>
          </div>
        </section>

        <div className="mx-auto flex max-w-6xl flex-col gap-24 px-4 py-24 sm:px-6 lg:gap-32 lg:py-32">
          {FEATURES.map(({ title, text, fragment: Fragment }, index) => (
            <section
              key={title}
              className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20"
            >
              <div data-reveal className={cn(index % 2 === 1 && "lg:order-last")}>
                <h2 className="text-4xl font-semibold sm:text-5xl">{title}</h2>
                <p className="mt-4 max-w-md text-lg text-muted-foreground">{text}</p>
              </div>
              <div data-reveal style={{ "--i": 1 } as React.CSSProperties}>
                <Fragment />
              </div>
            </section>
          ))}
        </div>

        <section className="px-4 pb-24 sm:px-6">
          <div
            data-reveal
            className="mx-auto flex max-w-6xl flex-col items-start gap-8 rounded-[36px] bg-ink px-6 py-14 text-white sm:px-12 sm:py-20 lg:flex-row lg:items-center lg:justify-between"
          >
            <h2 className="max-w-xl text-4xl font-semibold sm:text-5xl">
              Your first booking link takes <span className="text-primary">a minute.</span>
            </h2>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild className="group h-12 rounded-xl px-6 text-base">
                <Link to={signedIn ? "/dashboard" : "/sign-up"}>
                  {signedIn ? "Open dashboard" : "Get started free"}
                  <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                asChild
                className="h-12 rounded-xl px-6 text-base text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/demo">Try the demo</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-8 text-sm text-muted-foreground sm:px-6">
          <SlotlyLogo className="mr-auto" />
          <Link to="/demo" className="rounded-sm hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            Demo
          </Link>
          <Link to="/sign-in" className="rounded-sm hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            Sign in
          </Link>
          <span>© {new Date(today).getUTCFullYear()} Slotly</span>
        </div>
      </footer>
    </div>
  );
}
