import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarCheck2,
  Clock3,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { authClient } from "~/lib/auth-client";
import { getWorkspace, type Workspace } from "~/lib/scheduling.functions";
import { cn } from "~/lib/utils";
import { SlotlyLogo, initials } from "./brand";
import { DEMO_EVENTS, DEMO_PROFILE, demoBookings } from "./demo-data";
import { SlotlyLoading } from "./loading";
import { AvailabilityEditor } from "./availability-editor";
import { BookingsPanel } from "./bookings-panel";
import { EventTypesPanel } from "./event-types-panel";
import { OverviewPanel } from "./overview-panel";
import { ProfileEditor } from "./profile-editor";
import {
  WorkspaceContext,
  type Section,
  type WorkspaceApi,
} from "./workspace-context";

export type { Section } from "./workspace-context";

const NAV: { id: Section; label: string; path: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", path: "/dashboard", icon: LayoutDashboard },
  { id: "events", label: "Event types", path: "/dashboard/events", icon: Link2 },
  { id: "bookings", label: "Bookings", path: "/dashboard/bookings", icon: CalendarCheck2 },
  { id: "availability", label: "Availability", path: "/dashboard/availability", icon: Clock3 },
  { id: "settings", label: "Settings", path: "/dashboard/settings", icon: Settings2 },
];

const PANELS: Record<Section, () => React.ReactNode> = {
  overview: () => <OverviewPanel />,
  events: () => <EventTypesPanel />,
  bookings: () => <BookingsPanel />,
  availability: () => <AvailabilityEditor />,
  settings: () => <ProfileEditor />,
};

export function SlotlyWorkspace({
  initialData,
  demo = false,
  activeSection = "overview",
}: {
  initialData: Workspace | null;
  demo?: boolean;
  activeSection?: Section;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const workspace = useQuery({
    queryKey: demo ? ["workspace", "demo"] : ["workspace"],
    queryFn: () => getWorkspace(),
    initialData: demo ? null : initialData,
    enabled: !demo,
  });
  const data = demo ? null : workspace.data;
  useEffect(() => {
    if (!demo && workspace.isSuccess && !data) void navigate({ to: "/sign-in" });
  }, [demo, data, navigate, workspace.isSuccess]);
  const [demoSection, setDemoSection] = useState<Section>("overview");
  const [demoNow] = useState(() => Math.floor(Date.now() / 3600000) * 3600000);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [gate, setGate] = useState(false);
  const section = demo ? demoSection : activeSection;

  if (!demo && !data) return <SlotlyLoading />;

  const profile = data?.profile ?? DEMO_PROFILE;
  const api: WorkspaceApi = {
    data: data ?? null,
    name: data?.user.name ?? "Alex Rivera",
    profile,
    events: data?.events ?? DEMO_EVENTS,
    bookings: data?.bookings ?? demoBookings(demoNow),
    demo,
    gate: () => setGate(true),
    refresh: () => queryClient.invalidateQueries({ queryKey: ["workspace"] }),
    go: (next) => {
      setMobileOpen(false);
      if (demo) setDemoSection(next);
      else void navigate({ to: NAV.find((item) => item.id === next)!.path });
    },
    bookingUrl: (event) =>
      `${typeof window === "undefined" ? "" : window.location.origin}/book/${profile.handle}/${event.slug}`,
  };
  const signOut = async () => {
    await authClient.signOut();
    queryClient.clear();
    await navigate({ to: "/" });
    window.location.reload();
  };
  const nav = (
    <nav aria-label="Dashboard" className="flex flex-col gap-1">
      {NAV.map(({ id, label, path, icon: Icon }) => {
        const className = cn(
          "flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
          section === id &&
            "bg-accent text-foreground hover:bg-accent [&>svg]:text-brand-text",
        );
        const content = (
          <>
            <Icon className="size-[18px]" />
            {label}
          </>
        );
        return demo ? (
          <button
            key={id}
            type="button"
            className={className}
            aria-current={section === id ? "page" : undefined}
            onClick={() => api.go(id)}
          >
            {content}
          </button>
        ) : (
          <Link
            key={id}
            to={path}
            className={className}
            aria-current={section === id ? "page" : undefined}
            onClick={() => setMobileOpen(false)}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
  const account = (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
        {initials(api.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{api.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {data ? data.user.email : "Demo workspace"}
        </p>
      </div>
      {data && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Sign out"
          title="Sign out"
          onClick={() => void signOut()}
        >
          <LogOut />
        </Button>
      )}
    </div>
  );

  return (
    <WorkspaceContext value={api}>
      <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-dvh flex-col gap-8 border-r px-4 py-5 lg:flex">
          <SlotlyLogo className="px-2" />
          {nav}
          <div className="mt-auto">{account}</div>
        </aside>
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur lg:hidden">
          <SlotlyLogo />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
          </Button>
        </header>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            aria-describedby={undefined}
            className="w-72 gap-6 bg-background p-4"
          >
            <SheetHeader className="p-0 pt-1">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SlotlyLogo />
            </SheetHeader>
            {nav}
            <div className="mt-auto">{account}</div>
          </SheetContent>
        </Sheet>
        <main className="min-w-0">
          {demo && (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b bg-accent px-4 py-2.5 text-sm sm:px-8">
              <span>
                <strong className="font-semibold">Demo workspace.</strong>{" "}
                <span className="text-muted-foreground">Changes aren't saved.</span>
              </span>
              <Button size="sm" asChild>
                <Link to="/sign-up">Create your own</Link>
              </Button>
            </div>
          )}
          {workspace.isError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-4 border-b bg-destructive/5 px-4 py-2.5 text-sm text-destructive sm:px-8"
            >
              Couldn't refresh your workspace.
              <Button size="sm" variant="outline" onClick={() => void workspace.refetch()}>
                Retry
              </Button>
            </div>
          )}
          <div
            key={section}
            className="animate-rise mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-8 lg:py-10"
          >
            {PANELS[section]()}
          </div>
        </main>
      </div>
      <Dialog open={gate} onOpenChange={setGate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Create a free account to save this
            </DialogTitle>
            <DialogDescription>
              The demo is read-only. Your own workspace takes a minute to set up.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" asChild>
              <Link to="/sign-in">Sign in</Link>
            </Button>
            <Button asChild>
              <Link to="/sign-up">Get started</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkspaceContext>
  );
}
