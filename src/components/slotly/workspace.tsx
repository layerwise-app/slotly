import { useDeferredValue, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarCheck2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  Globe2,
  HelpCircle,
  LayoutGrid,
  Link2,
  List,
  Loader2,
  LogOut,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Switch } from "~/components/ui/switch";
import { SlotlyLogo, CalendarIllustration } from "./brand";
import { SlotlyLoading } from "./loading";
import { MonthCalendar } from "./month-calendar";
import { BookingExperience } from "./booking-experience";
import { authClient } from "~/lib/auth-client";
import {
  cancelBooking,
  deleteEvent,
  getWorkspace,
  saveEvent,
  saveProfile,
  type EventType,
  type Profile,
  type Workspace,
} from "~/lib/scheduling.functions";
import {
  COLORS,
  DAY_NAMES,
  DEFAULT_WEEK,
  TIMEZONES,
  calendarFile,
  dateKey,
  formatTime,
  slugify,
} from "~/lib/scheduling";

export type Section = "events" | "bookings" | "availability" | "settings";
const DASHBOARD_PATHS = {
  events: "/dashboard",
  bookings: "/dashboard/bookings",
  availability: "/dashboard/availability",
  settings: "/dashboard/settings",
} as const;
const DEMO_EVENTS: EventType[] = [
  {
    id: "preview-1",
    ownerId: "preview",
    title: "Quick chat",
    slug: "quick-chat",
    description: "A little time to connect, ask a question, or say hello.",
    duration: 15,
    color: "green",
    active: true,
    createdAt: 1,
  },
  {
    id: "preview-2",
    ownerId: "preview",
    title: "Discovery call",
    slug: "discovery-call",
    description:
      "Let's get to know each other and explore what we can build together.",
    duration: 30,
    color: "blue",
    active: true,
    createdAt: 2,
  },
  {
    id: "preview-3",
    ownerId: "preview",
    title: "Deep dive",
    slug: "deep-dive",
    description:
      "Space for the big ideas. An uninterrupted session to go a little deeper.",
    duration: 60,
    color: "violet",
    active: true,
    createdAt: 3,
  },
];
const DEMO_PROFILE: Profile = {
  ownerId: "preview",
  handle: "your-name",
  bio: "",
  timezone: "America/New_York",
  weekly: DEFAULT_WEEK,
  overrides: [],
  bufferBefore: 0,
  bufferAfter: 0,
};
const TITLES: Record<Section, string> = {
  events: "Event types",
  bookings: "Bookings",
  availability: "Availability",
  settings: "Profile settings",
};

function errorMessage(error: Error) {
  if (/unique|constraint/i.test(error.message))
    return "That booking URL or username is already in use. Please choose another.";
  return error.message || "Something went wrong. Please try again.";
}

function WorkspaceNavItem({
  demo,
  path,
  className,
  onClick,
  children,
}: {
  demo: boolean;
  path: (typeof DASHBOARD_PATHS)[Section];
  className: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return demo ? (
    <button className={className} onClick={onClick}>
      {children}
    </button>
  ) : (
    <Link
      to={path}
      activeOptions={{ exact: true }}
      className={className}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

export function SlotlyWorkspace({
  initialData,
  demo = false,
  activeSection = "events",
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
    if (!demo && workspace.isSuccess && !data) {
      void navigate({ to: "/sign-in" });
    }
  }, [demo, data, navigate, workspace.isSuccess]);
  const profile = data?.profile || DEMO_PROFILE;
  const events = data?.events || DEMO_EVENTS;
  const [demoSection, setDemoSection] = useState<Section>("events");
  const section = demo ? demoSection : activeSection;
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeNavigation = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!mobileOpen) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeNavigation.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("keydown", escape);
      previousFocus?.focus();
    };
  }, [mobileOpen]);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("list");
  const [editing, setEditing] = useState<EventType | "new" | null>(null);
  const [preview, setPreview] = useState<EventType | null>(null);
  const [gate, setGate] = useState(false);
  const [help, setHelp] = useState(false);
  const [news, setNews] = useState(false);
  const [deleting, setDeleting] = useState<EventType | null>(null);
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["workspace"] });
  const toggle = useMutation({
    mutationFn: (event: EventType) =>
      saveEvent({ data: { ...event, active: !event.active } }),
    onSuccess: () => {
      void invalidate();
      toast.success("Event visibility updated");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteEvent({ data: { id } }),
    onSuccess: () => {
      setDeleting(null);
      void invalidate();
      toast.success("Event type deleted");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const filtered = events.filter(
    (event) =>
      (filter === "all" ||
        (filter === "active" ? event.active : !event.active)) &&
      `${event.title} ${event.description}`
        .toLowerCase()
        .includes(deferredSearch.toLowerCase()),
  );
  const initials =
    data?.user.name
      .split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "Y";
  const selectSection = (next: Section) => {
    if (demo) setDemoSection(next);
    else void navigate({ to: DASHBOARD_PATHS[next] });
    setMobileOpen(false);
  };
  const copyLink = async (event: EventType) => {
    if (!data) {
      setGate(true);
      return;
    }
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/book/${profile.handle}/${event.slug}`,
      );
      toast.success("Booking link copied");
    } catch {
      toast.error(
        "Clipboard unavailable. Open the booking page to copy its URL.",
      );
    }
  };
  if (!demo && !data) return <SlotlyLoading />;
  return (
    <div
      className="slotly-app"
      onKeyDown={(event) => {
        if (event.key === "Escape") setMobileOpen(false);
      }}
    >
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`slotly-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <SlotlyLogo />
          <button
            className="icon-button mobile-close"
            ref={closeNavigation}
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          >
            <X size={19} />
          </button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="workspace-selector">
              <span className="workspace-avatar">{initials}</span>
              <span>
                <strong>{data ? data.user.name : "Your workspace"}</strong>
                <small>
                  {data ? "Personal workspace" : "Personal workspace preview"}
                </small>
              </span>
              <ChevronDown size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {data ? (
              <>
                <DropdownMenuItem onClick={() => selectSection("settings")}>
                  <Settings2 size={15} />
                  Profile settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    await authClient.signOut();
                    queryClient.clear();
                    await navigate({ to: "/" });
                    window.location.reload();
                  }}
                >
                  <LogOut size={15} />
                  Sign out
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem
                  onClick={() => void navigate({ to: "/sign-in" })}
                >
                  Sign in
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void navigate({ to: "/sign-up" })}
                >
                  Create your workspace
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="nav-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Workspace navigation">
          <WorkspaceNavItem
            demo={demo}
            path={DASHBOARD_PATHS.events}
            className={section === "events" ? "active" : ""}
            onClick={() =>
              demo ? selectSection("events") : setMobileOpen(false)
            }
          >
            <Link2 size={19} />
            <span>Event types</span>
            <span className="nav-count">{events.length}</span>
          </WorkspaceNavItem>
          <WorkspaceNavItem
            demo={demo}
            path={DASHBOARD_PATHS.bookings}
            className={section === "bookings" ? "active" : ""}
            onClick={() =>
              demo ? selectSection("bookings") : setMobileOpen(false)
            }
          >
            <CalendarDays size={19} />
            <span>Bookings</span>
            {!!data?.bookings.filter(
              (b) => b.status === "confirmed" && b.start > Date.now(),
            ).length && (
              <span className="nav-count">
                {
                  data.bookings.filter(
                    (b) => b.status === "confirmed" && b.start > Date.now(),
                  ).length
                }
              </span>
            )}
          </WorkspaceNavItem>
          <WorkspaceNavItem
            demo={demo}
            path={DASHBOARD_PATHS.availability}
            className={section === "availability" ? "active" : ""}
            onClick={() =>
              demo ? selectSection("availability") : setMobileOpen(false)
            }
          >
            <Clock3 size={19} />
            <span>Availability</span>
          </WorkspaceNavItem>
          <div className="nav-divider" />
          <WorkspaceNavItem
            demo={demo}
            path={DASHBOARD_PATHS.settings}
            className={section === "settings" ? "active" : ""}
            onClick={() =>
              demo ? selectSection("settings") : setMobileOpen(false)
            }
          >
            <Settings2 size={19} />
            <span>Settings</span>
          </WorkspaceNavItem>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-icon">
              <Sparkles size={18} />
            </span>
            <strong>Good things take time.</strong>
            <p>Make a little more room for them.</p>
            <button
              onClick={() =>
                data ? selectSection("availability") : setGate(true)
              }
            >
              {data ? "Make time yours" : "Make this workspace yours"}
              <ArrowUpRight size={14} />
            </button>
          </div>
          <button className="support-link" onClick={() => setHelp(true)}>
            <HelpCircle size={18} />
            Help & getting started
            <ArrowUpRight size={14} />
          </button>
          <div className="sidebar-footer">
            <span className="status-dot" />
            Thoughtfully built for your time<span>v1.0</span>
          </div>
        </div>
      </aside>
      <div className="workspace-main" inert={mobileOpen}>
        <header className="workspace-topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{TITLES[section]}</strong>
          </div>
          <div className="topbar-actions">
            <button className="whats-new" onClick={() => setNews(true)}>
              <span className="status-dot" />
              What's new
              <ArrowUpRight size={13} />
            </button>
            <span className="topbar-divider" />
            <button
              className="icon-button"
              aria-label="Help"
              onClick={() => setHelp(true)}
            >
              <HelpCircle size={19} />
            </button>
            <button
              className="icon-button"
              aria-label="Notifications"
              onClick={() =>
                toast.info(
                  "You are all caught up. New bookings will appear in your Bookings tab.",
                )
              }
            >
              <Bell size={19} />
            </button>
            <button
              className="top-avatar"
              aria-label="Open profile settings"
              onClick={() => selectSection("settings")}
            >
              {initials}
            </button>
          </div>
        </header>
        <main className="workspace-content">
          {workspace.isError && (
            <div className="error-banner">
              Unable to load your workspace.{" "}
              <button onClick={() => void workspace.refetch()}>
                Try again
              </button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <div className="eyebrow">A LITTLE LESS BACK-AND-FORTH</div>
              <h1>{TITLES[section]}</h1>
              <p>
                {section === "events"
                  ? "Your time, your way. Create an event and let the good meetings find you."
                  : section === "bookings"
                    ? "A little overview of the people and plans ahead."
                    : section === "availability"
                      ? "Set your rhythm. We will take care of the rest."
                      : "A booking page that feels a little more like you."}
              </p>
            </div>
            {section === "events" && (
              <button
                className="primary-button"
                onClick={() => setEditing("new")}
              >
                <Plus size={17} />
                New event type
              </button>
            )}
          </div>
          {!data && (
            <div className="preview-notice">
              <span>
                <span className="status-dot" />
                You're exploring a preview workspace
              </span>
              <Link to="/sign-up">
                Make it yours
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
          {section === "events" && (
            <>
              <div className="event-toolbar">
                <div className="filter-tabs">
                  {[
                    ["all", "All event types", events.length],
                    ["active", "Active", events.filter((e) => e.active).length],
                    [
                      "inactive",
                      "Inactive",
                      events.filter((e) => !e.active).length,
                    ],
                  ].map(([id, label, count]) => (
                    <button
                      key={id}
                      className={filter === id ? "selected" : ""}
                      onClick={() => setFilter(String(id))}
                    >
                      {label}
                      <span>{count}</span>
                    </button>
                  ))}
                </div>
                <div className="toolbar-right">
                  <label className="search-box">
                    <Search size={16} />
                    <input
                      aria-label="Search event types"
                      placeholder="Search event types..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <kbd>/</kbd>
                  </label>
                  <div className="view-switch">
                    <button
                      aria-label="List view"
                      className={view === "list" ? "selected" : ""}
                      onClick={() => setView("list")}
                    >
                      <List size={17} />
                    </button>
                    <button
                      aria-label="Grid view"
                      className={view === "grid" ? "selected" : ""}
                      onClick={() => setView("grid")}
                    >
                      <LayoutGrid size={16} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="events-summary">
                <span>
                  {filtered.length} event{" "}
                  {filtered.length === 1 ? "type" : "types"}
                </span>
                <span>
                  <ShieldCheck size={13} />A little link. A lot less scheduling.
                </span>
              </div>
              <div
                className={`event-list ${view === "grid" ? "event-grid" : ""}`}
              >
                {filtered.map((event, index) => (
                  <article
                    key={event.id}
                    className={`event-card color-${event.color} ${!event.active ? "inactive-event" : ""}`}
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    <div className="event-color-bar" />
                    <div className="event-card-main">
                      <div className="event-icon">
                        {event.duration <= 15 ? (
                          <MessageCircle size={23} />
                        ) : event.duration <= 30 ? (
                          <Users size={23} />
                        ) : (
                          <Sparkles size={23} />
                        )}
                      </div>
                      <div className="event-details">
                        <button
                          className="event-title"
                          onClick={() => setEditing(event)}
                        >
                          {event.title}
                          <ArrowUpRight size={15} />
                        </button>
                        <p>{event.description}</p>
                        <div className="event-tags">
                          <span>
                            <Clock3 size={13} />
                            {event.duration} min
                          </span>
                          <span>
                            <Users size={13} />
                            One-on-one
                          </span>
                          <span className="event-location">
                            <Globe2 size={13} />
                            Online or in person
                          </span>
                        </div>
                      </div>
                      <div className="event-options">
                        <div className="event-state">
                          <span>{event.active ? "Active" : "Inactive"}</span>
                          <Switch
                            aria-label={`Toggle ${event.title} visibility`}
                            checked={event.active}
                            disabled={toggle.isPending}
                            onCheckedChange={() =>
                              data ? toggle.mutate(event) : setGate(true)
                            }
                          />
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="icon-button"
                              aria-label={`${event.title} options`}
                            >
                              <MoreHorizontal size={20} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditing(event)}>
                              <Settings2 size={15} />
                              Edit event type
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditing({
                                  ...event,
                                  id: "",
                                  title: `${event.title} (copy)`,
                                  slug: `${event.slug}-copy`,
                                });
                              }}
                            >
                              <Copy size={15} />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setPreview(event)}>
                              <ExternalLink size={15} />
                              Preview booking page
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() =>
                                data ? setDeleting(event) : setGate(true)
                              }
                            >
                              <Trash2 size={15} />
                              Delete event type
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="event-card-footer">
                      <span className="event-url">
                        <Link2 size={14} />
                        <span>
                          slotly<span className="url-muted"> / </span>
                          {profile.handle}
                          <span className="url-muted"> / </span>
                          <strong>{event.slug}</strong>
                        </span>
                      </span>
                      <div className="card-footer-actions">
                        <button
                          className="preview-button"
                          onClick={() => setPreview(event)}
                        >
                          <ExternalLink size={14} />
                          Preview
                        </button>
                        <span />
                        <button
                          className="copy-button"
                          onClick={() => void copyLink(event)}
                        >
                          <Copy size={14} />
                          Copy link
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
                {!filtered.length && (
                  <EmptyState
                    icon={<Link2 size={28} />}
                    title={
                      search
                        ? "No events found"
                        : filter === "inactive"
                          ? "Nothing on pause"
                          : "Your next great meeting starts here"
                    }
                    description={
                      search
                        ? "Try a different search or clear your filters."
                        : filter === "inactive"
                          ? "Turn an event off and it will show up here."
                          : "Create your first event type and give your time a home."
                    }
                    action={
                      filter === "inactive" || search ? (
                        <button
                          className="secondary-button"
                          onClick={() => {
                            setFilter("all");
                            setSearch("");
                          }}
                        >
                          Show all events
                        </button>
                      ) : (
                        <button
                          className="primary-button"
                          onClick={() => setEditing("new")}
                        >
                          <Plus size={16} />
                          Create event type
                        </button>
                      )
                    }
                  />
                )}
              </div>
              <div className="share-banner">
                <div className="share-banner-copy">
                  <span className="tiny-label">
                    <span className="status-dot" />
                    LESS COORDINATING. MORE CONNECTING.
                  </span>
                  <h2>Great conversations start with a simple link.</h2>
                  <p>
                    Share your booking page. Let them pick a time. That's it.
                  </p>
                  <button
                    onClick={() =>
                      data
                        ? void copyLink(
                            events.find((e) => e.active) || events[0]!,
                          )
                        : setGate(true)
                    }
                    disabled={!!data && !events.some((e) => e.active)}
                  >
                    {data
                      ? "Share your first event"
                      : "Get your own booking page"}
                    <ArrowUpRight size={15} />
                  </button>
                </div>
                <CalendarIllustration />
              </div>
              <div className="content-footnote">
                <span>
                  <ShieldCheck size={14} />
                  Your availability stays yours. Always.
                </span>
                <button onClick={() => setHelp(true)}>
                  A little help getting started
                  <ArrowUpRight size={13} />
                </button>
              </div>
            </>
          )}
          {section === "availability" && (
            <AvailabilityEditor
              key={profile.ownerId}
              profile={profile}
              isDemo={!data}
              onGate={() => setGate(true)}
              onSaved={() => void invalidate()}
            />
          )}
          {section === "bookings" && (
            <BookingsPanel
              data={data}
              onChange={() => void invalidate()}
              onNew={() => selectSection("events")}
            />
          )}
          {section === "settings" && (
            <ProfileEditor
              key={profile.ownerId}
              profile={profile}
              name={data?.user.name || "Your name"}
              email={data?.user.email}
              isDemo={!data}
              onGate={() => setGate(true)}
              onSaved={() => void invalidate()}
            />
          )}
        </main>
      </div>
      <Dialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="slotly-dialog sm:max-w-lg">
          {editing && (
            <EventEditor
              event={editing === "new" ? null : editing}
              profile={profile}
              isDemo={!data}
              onGate={() => setGate(true)}
              onSaved={() => {
                setEditing(null);
                void invalidate();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!preview}
        onOpenChange={(open) => !open && setPreview(null)}
      >
        <DialogContent className="booking-preview-dialog sm:max-w-[1050px]">
          <DialogHeader>
            <DialogTitle>Booking page preview</DialogTitle>
            <DialogDescription>
              {data
                ? "This is what your guests will see."
                : "A sample booking page. Create a workspace to publish your own."}
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <BookingExperience
              event={{
                event: preview,
                name: data?.user.name || "Your name",
                image: data?.user.image || null,
                handle: profile.handle,
                timezone: profile.timezone,
                bio: profile.bio,
              }}
              demo={!data}
              onDemoBook={() => setGate(true)}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={gate} onOpenChange={setGate}>
        <DialogContent className="slotly-dialog">
          <DialogHeader>
            <span className="dialog-brand-icon">
              <Sparkles size={25} />
            </span>
            <DialogTitle>Make time for what matters.</DialogTitle>
            <DialogDescription>
              Create your free Slotly workspace to save event types, set your
              availability, and share your personal booking links.
            </DialogDescription>
          </DialogHeader>
          <Link className="primary-button justify-center" to="/sign-up">
            Create your workspace
            <ArrowRight size={16} />
          </Link>
          <p className="dialog-bottom-text">
            Already have a workspace? <Link to="/sign-in">Sign in</Link>
          </p>
        </DialogContent>
      </Dialog>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="slotly-dialog">
          <DialogHeader>
            <DialogTitle>A little help getting started</DialogTitle>
            <DialogDescription>
              Three small steps to a much simpler schedule.
            </DialogDescription>
          </DialogHeader>
          <div className="help-steps">
            {[
              [
                "1",
                "Create an event type",
                "Choose a title, duration, and a booking URL that is easy to share.",
              ],
              [
                "2",
                "Set your availability",
                "Pick your working hours and timezone. Add buffers and days off.",
              ],
              [
                "3",
                "Share your link",
                "Guests choose a time and confirm their details. Slotly prevents overlapping bookings.",
              ],
            ].map(([n, title, description]) => (
              <div key={n}>
                <span>{n}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{description}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="small-muted">
            Slotly v1 is built for individuals. External calendar sync,
            payments, video integrations, and team scheduling are intentionally
            not included.
          </p>
        </DialogContent>
      </Dialog>
      <Dialog open={news} onOpenChange={setNews}>
        <DialogContent className="slotly-dialog">
          <DialogHeader>
            <div className="dialog-brand-icon">
              <Sparkles size={25} />
            </div>
            <DialogTitle>A fresh start for your schedule.</DialogTitle>
            <DialogDescription>
              Meet Slotly v1. Everything you need to make the next meeting
              happen.
            </DialogDescription>
          </DialogHeader>
          <div className="news-list">
            {[
              "Shareable, customizable event types",
              "Weekly hours, date overrides, and buffers",
              "Timezone-aware booking pages",
              "Guest cancellation and rescheduling",
              "Your bookings, in list or calendar view",
            ].map((item) => (
              <p key={item}>
                <Check size={16} />
                {item}
              </p>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent className="slotly-dialog">
          <DialogHeader>
            <DialogTitle>Delete {deleting?.title}?</DialogTitle>
            <DialogDescription>
              This booking link will stop working. Events with booking history
              cannot be deleted; turn them off instead.
            </DialogDescription>
          </DialogHeader>
          <div className="dialog-actions">
            <button
              className="secondary-button"
              onClick={() => setDeleting(null)}
            >
              Keep event
            </button>
            <button
              className="danger-button"
              disabled={remove.isPending}
              onClick={() => deleting && remove.mutate(deleting.id)}
            >
              {remove.isPending ? "Deleting..." : "Delete event"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventEditor({
  event,
  profile,
  isDemo,
  onGate,
  onSaved,
}: {
  event: EventType | null;
  profile: Profile;
  isDemo: boolean;
  onGate: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(event?.title || "");
  const [slug, setSlug] = useState(event?.slug || "");
  const [description, setDescription] = useState(event?.description || "");
  const [duration, setDuration] = useState(event?.duration || 30);
  const [color, setColor] = useState(event?.color || "green");
  const [active, setActive] = useState(event?.active ?? true);
  const save = useMutation({
    mutationFn: () =>
      saveEvent({
        data: {
          id: event?.id || undefined,
          title,
          slug: slug || slugify(title),
          description,
          duration,
          color,
          active,
        },
      }),
    onSuccess: () => {
      toast.success(
        event?.id ? "Event type updated" : "Your event type is ready",
      );
      onSaved();
    },
  });
  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {event?.id ? "A little fine-tuning" : "Make room for a new meeting"}
        </DialogTitle>
        <DialogDescription>
          {event?.id
            ? "Update your event type. Your booking link stays easy to share."
            : "Give your next conversation a name and a little time."}
        </DialogDescription>
      </DialogHeader>
      <form
        className="slotly-form"
        onSubmit={(e) => {
          e.preventDefault();
          isDemo ? onGate() : save.mutate();
        }}
      >
        <label>
          Event title
          <input
            autoFocus
            required
            maxLength={100}
            placeholder="e.g. Discovery call"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!event) setSlug(slugify(e.target.value));
            }}
          />
        </label>
        <label>
          Description
          <textarea
            maxLength={2000}
            rows={3}
            placeholder="What can your guest look forward to?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label>
          Booking URL
          <div className="input-prefix">
            <span>/book/{profile.handle}/</span>
            <input
              required
              pattern="[a-z0-9-]+"
              maxLength={60}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="discovery-call"
            />
          </div>
        </label>
        <div className="form-columns">
          <label>
            Duration
            <div className="input-suffix">
              <input
                type="number"
                required
                min={5}
                max={480}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
              <span>minutes</span>
            </div>
          </label>
          <label>
            Event color
            <div className="color-picker">
              {COLORS.map((item) => (
                <button
                  type="button"
                  aria-label={`${item} color`}
                  aria-pressed={color === item}
                  className={`color-swatch color-${item} ${color === item ? "selected" : ""}`}
                  onClick={() => setColor(item)}
                  key={item}
                >
                  {color === item && <Check size={16} />}
                </button>
              ))}
            </div>
          </label>
        </div>
        <div className="form-switch">
          <div>
            <strong>Open for bookings</strong>
            <p>Guests can book using your link.</p>
          </div>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
        {save.error && (
          <p className="form-error" role="alert">
            {errorMessage(save.error)}
          </p>
        )}
        <button
          className="primary-button full-button"
          disabled={save.isPending}
        >
          {save.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Check size={16} />
          )}
          {save.isPending
            ? "Saving..."
            : isDemo
              ? "Create a workspace to save"
              : "Save event type"}
        </button>
      </form>
    </>
  );
}

function AvailabilityEditor({
  profile,
  isDemo,
  onGate,
  onSaved,
}: {
  profile: Profile;
  isDemo: boolean;
  onGate: () => void;
  onSaved: () => void;
}) {
  const [weekly, setWeekly] = useState(
    profile.weekly.map((day) => ({ ...day })),
  );
  const [zone, setZone] = useState(profile.timezone);
  const [before, setBefore] = useState(profile.bufferBefore);
  const [after, setAfter] = useState(profile.bufferAfter);
  const [overrides, setOverrides] = useState(profile.overrides);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideDate, setOverrideDate] = useState("");
  const [unavailable, setUnavailable] = useState(true);
  const [overrideStart, setOverrideStart] = useState("09:00");
  const [overrideEnd, setOverrideEnd] = useState("17:00");
  const save = useMutation({
    mutationFn: () =>
      saveProfile({
        data: {
          ...profile,
          weekly,
          timezone: zone,
          bufferBefore: before,
          bufferAfter: after,
          overrides,
        },
      }),
    onSuccess: () => {
      toast.success("Availability saved");
      onSaved();
    },
  });
  const zones = [...new Set([...TIMEZONES, zone])];
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        isDemo ? onGate() : save.mutate();
      }}
    >
      <div className="availability-layout">
        <section className="panel weekly-panel">
          <div className="panel-heading">
            <span className="panel-icon">
              <Clock3 size={20} />
            </span>
            <div>
              <h2>Your weekly rhythm</h2>
              <p>The hours you are happy to meet.</p>
            </div>
            <span className="green-badge">Default schedule</span>
          </div>
          <label className="timezone-field">
            <Globe2 size={16} />
            <select
              aria-label="Availability timezone"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
            >
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <div className="weekly-hours">
            {[1, 2, 3, 4, 5, 6, 0].map((day) => {
              const current = weekly.find((item) => item.day === day)!;
              const update = (patch: Partial<typeof current>) =>
                setWeekly(
                  weekly.map((item) =>
                    item.day === day ? { ...item, ...patch } : item,
                  ),
                );
              return (
                <div
                  className={`weekday-row ${!current.enabled ? "day-off" : ""}`}
                  key={day}
                >
                  <Switch
                    checked={current.enabled}
                    aria-label={`${DAY_NAMES[day]} availability`}
                    onCheckedChange={(enabled) => update({ enabled })}
                  />
                  <strong>{DAY_NAMES[day]}</strong>
                  {current.enabled ? (
                    <>
                      <input
                        aria-label={`${DAY_NAMES[day]} start time`}
                        type="time"
                        value={current.start}
                        onChange={(e) => update({ start: e.target.value })}
                        required
                      />
                      <span className="time-dash">-</span>
                      <input
                        aria-label={`${DAY_NAMES[day]} end time`}
                        type="time"
                        value={current.end}
                        onChange={(e) => update({ end: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        className="icon-button copy-hours"
                        aria-label={`Copy ${DAY_NAMES[day]} hours to all weekdays`}
                        onClick={() => {
                          setWeekly(
                            weekly.map((item) =>
                              item.enabled
                                ? {
                                    ...item,
                                    start: current.start,
                                    end: current.end,
                                  }
                                : item,
                            ),
                          );
                          toast.success("Hours copied to your active days");
                        }}
                      >
                        <Copy size={15} />
                      </button>
                    </>
                  ) : (
                    <span className="unavailable-label">A little time off</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="panel-note">
            <ShieldCheck size={16} />
            Times automatically adjust to your guest's timezone.
          </div>
        </section>
        <div className="availability-side">
          <section className="panel">
            <div className="panel-heading">
              <span className="panel-icon">
                <CalendarDays size={20} />
              </span>
              <div>
                <h2>Date overrides</h2>
                <p>Some days are a little different.</p>
              </div>
            </div>
            {overrides.length ? (
              <div className="override-list">
                {overrides.map((item) => (
                  <div key={item.date}>
                    <span>
                      <strong>
                        {new Date(`${item.date}T12:00:00`).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" },
                        )}
                      </strong>
                      <small>
                        {item.unavailable
                          ? "Unavailable"
                          : `${item.start} - ${item.end}`}
                      </small>
                    </span>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Remove override for ${item.date}`}
                      onClick={() =>
                        setOverrides(
                          overrides.filter((o) => o.date !== item.date),
                        )
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="override-empty">
                A day off? A change of plans?
                <br />
                Add specific hours for a specific date.
              </p>
            )}
            <button
              className="secondary-button full-button"
              type="button"
              onClick={() => setOverrideOpen(true)}
            >
              <Plus size={15} />
              Add a date override
            </button>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <span className="panel-icon">
                <Clock3 size={20} />
              </span>
              <div>
                <h2>A little breathing room</h2>
                <p>Keep space between meetings.</p>
              </div>
            </div>
            <div className="form-columns buffer-fields">
              <label>
                Before
                <input
                  aria-label="Buffer before in minutes"
                  type="number"
                  min={0}
                  max={120}
                  value={before}
                  onChange={(e) => setBefore(Number(e.target.value))}
                />
                <small>minutes</small>
              </label>
              <label>
                After
                <input
                  aria-label="Buffer after in minutes"
                  type="number"
                  min={0}
                  max={120}
                  value={after}
                  onChange={(e) => setAfter(Number(e.target.value))}
                />
                <small>minutes</small>
              </label>
            </div>
          </section>
          <div className="availability-tip">
            <Sparkles size={19} />
            <p>
              Protect your focus. Even a 5-minute buffer makes a little
              difference.
            </p>
          </div>
        </div>
      </div>
      {save.error && (
        <p className="form-error" role="alert">
          {errorMessage(save.error)}
        </p>
      )}
      <div className="page-save-bar">
        <span>Changes apply to all your event types.</span>
        <button className="primary-button" disabled={save.isPending}>
          {save.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Check size={16} />
          )}
          {save.isPending ? "Saving..." : "Save availability"}
        </button>
      </div>
      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent className="slotly-dialog">
          <DialogHeader>
            <DialogTitle>Make an exception</DialogTitle>
            <DialogDescription>
              Change your availability for one date. Save your schedule
              afterward to apply it.
            </DialogDescription>
          </DialogHeader>
          <div className="slotly-form">
            <label>
              Date
              <input
                type="date"
                value={overrideDate}
                onChange={(e) => setOverrideDate(e.target.value)}
              />
            </label>
            <div className="form-switch">
              <span>Unavailable all day</span>
              <Switch checked={unavailable} onCheckedChange={setUnavailable} />
            </div>
            {!unavailable && (
              <div className="form-columns">
                <label>
                  Start
                  <input
                    type="time"
                    value={overrideStart}
                    onChange={(e) => setOverrideStart(e.target.value)}
                  />
                </label>
                <label>
                  End
                  <input
                    type="time"
                    value={overrideEnd}
                    onChange={(e) => setOverrideEnd(e.target.value)}
                  />
                </label>
              </div>
            )}
            <button
              type="button"
              className="primary-button full-button"
              disabled={
                !overrideDate || (!unavailable && overrideStart >= overrideEnd)
              }
              onClick={() => {
                setOverrides(
                  [
                    ...overrides.filter((item) => item.date !== overrideDate),
                    {
                      date: overrideDate,
                      unavailable,
                      start: overrideStart,
                      end: overrideEnd,
                    },
                  ].sort((a, b) => a.date.localeCompare(b.date)),
                );
                setOverrideOpen(false);
              }}
            >
              Add override
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}

function ProfileEditor({
  profile,
  name,
  email,
  isDemo,
  onGate,
  onSaved,
}: {
  profile: Profile;
  name: string;
  email?: string;
  isDemo: boolean;
  onGate: () => void;
  onSaved: () => void;
}) {
  const [handle, setHandle] = useState(profile.handle);
  const [bio, setBio] = useState(profile.bio);
  const save = useMutation({
    mutationFn: () => saveProfile({ data: { ...profile, handle, bio } }),
    onSuccess: () => {
      toast.success("Profile saved");
      onSaved();
    },
  });
  return (
    <section className="panel profile-panel">
      <div className="panel-heading">
        <span className="panel-icon">
          <Users size={20} />
        </span>
        <div>
          <h2>Your public profile</h2>
          <p>The person behind the booking link.</p>
        </div>
      </div>
      <form
        className="slotly-form"
        onSubmit={(e) => {
          e.preventDefault();
          isDemo ? onGate() : save.mutate();
        }}
      >
        <div className="profile-identity">
          <span className="large-avatar">
            {name
              .split(" ")
              .map((s) => s[0])
              .slice(0, 2)
              .join("")}
          </span>
          <div>
            <strong>{name}</strong>
            <p>{email || "Create a workspace to personalize your profile"}</p>
          </div>
        </div>
        <label>
          Username
          <div className="input-prefix">
            <span>/book/</span>
            <input
              required
              pattern="[a-z0-9][a-z0-9-]{2,49}"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
            />
          </div>
          <small>Changing your username changes all your booking links.</small>
        </label>
        <label>
          A little about you
          <textarea
            rows={4}
            maxLength={1000}
            placeholder="Say hello to the people you will meet."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </label>
        {save.error && <p className="form-error">{errorMessage(save.error)}</p>}
        <button className="primary-button" disabled={save.isPending}>
          {save.isPending ? "Saving..." : "Save profile"}
          <Check size={16} />
        </button>
      </form>
    </section>
  );
}

function BookingsPanel({
  data,
  onChange,
  onNew,
}: {
  data: Workspace | null;
  onChange: () => void;
  onNew: () => void;
}) {
  const [tab, setTab] = useState("upcoming");
  const [view, setView] = useState("list");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");
  const [month, setMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [cancelId, setCancelId] = useState<string | null>(null);
  const zone = data?.profile.timezone || DEMO_PROFILE.timezone;
  const deferred = useDeferredValue(search);
  const bookings = (data?.bookings || [])
    .filter(
      (b) =>
        (tab === "cancelled"
          ? b.status === "cancelled"
          : b.status === "confirmed" &&
            (tab === "upcoming"
              ? b.start > Date.now()
              : b.start <= Date.now())) &&
        `${b.guestName} ${b.title} ${b.guestEmail}`
          .toLowerCase()
          .includes(deferred.toLowerCase()),
    )
    .sort((a, b) =>
      tab === "upcoming" ? a.start - b.start : b.start - a.start,
    );
  const cancel = useMutation({
    mutationFn: (id: string) => cancelBooking({ data: { id } }),
    onSuccess: () => {
      toast.success("Booking cancelled");
      setCancelId(null);
      onChange();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const counts = Object.fromEntries(
    bookings.map((b) => [
      dateKey(b.start, zone),
      bookings.filter(
        (item) => dateKey(item.start, zone) === dateKey(b.start, zone),
      ).length,
    ]),
  );
  const visible =
    view === "calendar"
      ? bookings.filter((b) =>
          selected
            ? dateKey(b.start, zone) === selected
            : dateKey(b.start, zone).startsWith(month),
        )
      : bookings;
  return (
    <>
      <div className="event-toolbar">
        <div className="filter-tabs">
          {["upcoming", "past", "cancelled"].map((item) => (
            <button
              className={tab === item ? "selected" : ""}
              onClick={() => {
                setTab(item);
                setSelected("");
              }}
              key={item}
            >
              {item[0]!.toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <label className="search-box">
            <Search size={16} />
            <input
              aria-label="Search bookings"
              placeholder="Search bookings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="view-switch">
            <button
              aria-label="Bookings list view"
              className={view === "list" ? "selected" : ""}
              onClick={() => setView("list")}
            >
              <List size={17} />
            </button>
            <button
              aria-label="Bookings calendar view"
              className={view === "calendar" ? "selected" : ""}
              onClick={() => setView("calendar")}
            >
              <CalendarDays size={17} />
            </button>
          </div>
        </div>
      </div>
      <div className={view === "calendar" ? "bookings-calendar-layout" : ""}>
        {view === "calendar" && (
          <div className="panel">
            <MonthCalendar
              month={month}
              setMonth={(value) => {
                setMonth(value);
                setSelected("");
              }}
              selected={selected}
              onSelect={setSelected}
              disablePast={false}
              counts={counts}
            />
            <div className="calendar-zone">
              <Globe2 size={14} />
              {zone.replace(/_/g, " ")}
            </div>
            {selected && (
              <button className="text-button" onClick={() => setSelected("")}>
                Show entire month
              </button>
            )}
          </div>
        )}
        <div className="booking-list">
          {visible.length ? (
            visible.map((item) => (
              <article className="booking-row" key={item.id}>
                <div className="booking-date">
                  <strong>
                    {new Intl.DateTimeFormat("en-US", {
                      day: "numeric",
                      timeZone: zone,
                    }).format(item.start)}
                  </strong>
                  <span>
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      timeZone: zone,
                    }).format(item.start)}
                  </span>
                </div>
                <div className="booking-row-info">
                  <span
                    className={`booking-status ${item.status === "cancelled" ? "cancelled" : ""}`}
                  >
                    <span className="status-dot" />
                    {item.status === "cancelled"
                      ? "Cancelled"
                      : item.start < Date.now()
                        ? "Completed"
                        : "Confirmed"}
                  </span>
                  <h3>{item.title}</h3>
                  <p>
                    {item.guestName}
                    <span> · </span>
                    {item.guestEmail}
                  </p>
                  <small>
                    <Clock3 size={13} />
                    {formatTime(item.start, zone)} -{" "}
                    {formatTime(item.end, zone)}
                  </small>
                  {item.notes && <p className="booking-notes">{item.notes}</p>}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="icon-button"
                      aria-label={`Manage booking with ${item.guestName}`}
                    >
                      <MoreHorizontal size={20} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/booking/$token" params={{ token: item.token }}>
                        <ExternalLink size={15} />
                        View booking
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => calendarFile(item)}>
                      <ArrowDown size={15} />
                      Download calendar event
                    </DropdownMenuItem>
                    {item.status === "confirmed" && item.start > Date.now() && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link
                            to="/book/$handle/$slug"
                            params={{
                              handle: data!.profile.handle,
                              slug:
                                data!.events.find((e) => e.id === item.eventId)
                                  ?.slug || "",
                            }}
                            search={{ reschedule: item.token }}
                          >
                            <CalendarDays size={15} />
                            Reschedule
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => setCancelId(item.id)}
                        >
                          <X size={15} />
                          Cancel booking
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </article>
            ))
          ) : (
            <EmptyState
              icon={<CalendarCheck2 size={30} />}
              title={
                search
                  ? "No matching bookings"
                  : tab === "cancelled"
                    ? "Nothing cancelled"
                    : tab === "past"
                      ? "A fresh start"
                      : "Good meetings are on the way"
              }
              description={
                search
                  ? "Try another name or email address."
                  : view === "calendar" && selected
                    ? "No bookings on this date. Try a different day."
                    : tab === "upcoming"
                      ? "Share an event link and your upcoming conversations will appear here."
                      : "Your booking history will have a home right here."
              }
              action={
                tab === "upcoming" && (
                  <button className="secondary-button" onClick={onNew}>
                    Go to event types
                    <ArrowRight size={15} />
                  </button>
                )
              }
            />
          )}
        </div>
      </div>
      <Dialog
        open={!!cancelId}
        onOpenChange={(open) => !open && setCancelId(null)}
      >
        <DialogContent className="slotly-dialog">
          <DialogHeader>
            <DialogTitle>Cancel this conversation?</DialogTitle>
            <DialogDescription>
              The time will become available again. The guest can see the
              cancelled status using their booking link.
            </DialogDescription>
          </DialogHeader>
          <div className="dialog-actions">
            <button
              className="secondary-button"
              onClick={() => setCancelId(null)}
            >
              Keep booking
            </button>
            <button
              className="danger-button"
              disabled={cancel.isPending}
              onClick={() => cancelId && cancel.mutate(cancelId)}
            >
              {cancel.isPending ? "Cancelling..." : "Cancel booking"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="slotly-empty">
      <div className="empty-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
