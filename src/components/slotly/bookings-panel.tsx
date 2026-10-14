import { useState } from "react";
import { CalendarDays, CalendarSearch, ChevronRight, List, Search } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { NativeSelect, NativeSelectOption } from "~/components/ui/native-select";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { dateKey, eventColor, formatTime } from "~/lib/scheduling";
import type { Booking } from "~/lib/scheduling.functions";
import { cn } from "~/lib/utils";
import { BookingSheet, StatusBadge } from "./booking-sheet";
import { MonthCalendar } from "./month-calendar";
import { EmptyState, PageHeader } from "./shared";
import { useWorkspace } from "./workspace-context";

type Tab = "upcoming" | "past" | "cancelled";
const PAGE = 30;
const EMPTY: Record<Tab, string> = {
  upcoming: "No upcoming bookings",
  past: "No past bookings",
  cancelled: "No cancelled bookings",
};

function inTab(item: Booking, tab: Tab, now: number) {
  if (tab === "cancelled") return item.status === "cancelled";
  if (item.status === "cancelled") return false;
  return tab === "upcoming" ? item.end >= now : item.end < now;
}

export function BookingsPanel() {
  const { bookings, events, profile } = useWorkspace();
  const zone = profile.timezone;
  const now = Date.now();
  const today = dateKey(now, zone);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [query, setQuery] = useState("");
  const [eventId, setEventId] = useState("all");
  const [limit, setLimit] = useState(PAGE);
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [open, setOpen] = useState<string | null>(null);
  const needle = query.trim().toLowerCase();
  const matches = bookings.filter(
    (item) =>
      (eventId === "all" || item.eventId === eventId) &&
      (!needle ||
        [item.guestName, item.guestEmail, item.title].some((value) => value.toLowerCase().includes(needle))),
  );
  const counts = Object.fromEntries(
    (["upcoming", "past", "cancelled"] as const).map((key) => [key, matches.filter((item) => inTab(item, key, now)).length]),
  ) as Record<Tab, number>;
  const listed =
    view === "calendar"
      ? matches.filter((item) => dateKey(item.start, zone) === day).sort((a, b) => a.start - b.start)
      : matches
          .filter((item) => inTab(item, tab, now))
          .sort((a, b) => (tab === "upcoming" ? a.start - b.start : b.start - a.start));
  const visible = listed.slice(0, limit);
  const perDay: Record<string, number> = {};
  for (const item of matches)
    if (item.status === "confirmed") {
      const key = dateKey(item.start, zone);
      perDay[key] = (perDay[key] ?? 0) + 1;
    }
  const groups = new Map<string, Booking[]>();
  for (const item of visible) {
    const key = dateKey(item.start, zone);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  const dayLabel = (key: string) => {
    const offset = Math.round((Date.parse(key) - Date.parse(today)) / 86400000);
    const relative = { [-1]: "Yesterday", 0: "Today", 1: "Tomorrow" }[offset];
    const full = new Date(`${key}T12:00:00Z`).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
      ...(key.slice(0, 4) !== today.slice(0, 4) && { year: "numeric" }),
    });
    return relative ? `${relative} · ${full}` : full;
  };

  const list = groups.size ? (
    <div className="flex flex-col gap-6">
      {[...groups].map(([key, items]) => (
        <section key={key} aria-label={dayLabel(key)}>
          <h2 className="mb-2 font-sans text-sm font-medium text-muted-foreground">{dayLabel(key)}</h2>
          <ul className="overflow-hidden rounded-2xl border bg-card shadow-xs">
            {items.map((item) => {
              const event = events.find((e) => e.id === item.eventId);
              return (
                <li key={item.id} className="border-b last:border-0">
                  <button
                    type="button"
                    onClick={() => setOpen(item.id)}
                    data-color={eventColor(event?.color ?? "amber")}
                    className="group flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset sm:px-5"
                  >
                    <span className="w-[4.5rem] shrink-0 text-sm tabular-nums sm:w-24">
                      <span className="block font-semibold">{formatTime(item.start, zone)}</span>
                      <span className="block text-muted-foreground">{formatTime(item.end, zone)}</span>
                    </span>
                    <span aria-hidden="true" className="h-10 w-1 shrink-0 rounded-full bg-event" />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate font-medium", item.status === "cancelled" && "text-muted-foreground line-through")}>
                        {item.guestName}
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {item.title}
                        <span className="hidden sm:inline"> · {item.guestEmail}</span>
                      </span>
                    </span>
                    <StatusBadge item={item} />
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {listed.length > limit && (
        <Button variant="outline" className="self-center" onClick={() => setLimit((value) => value + PAGE)}>
          Show more
        </Button>
      )}
    </div>
  ) : (
    <EmptyState
      icon={CalendarSearch}
      title={view === "calendar" ? "Nothing on this day" : needle || eventId !== "all" ? "No matches" : EMPTY[tab]}
      description={needle || eventId !== "all" ? "Try a different search or event type." : undefined}
    />
  );

  return (
    <>
      <PageHeader
        title="Bookings"
        actions={
          <div className="flex rounded-lg border bg-card p-0.5" role="group" aria-label="View">
            {(
              [
                ["list", List, "List"],
                ["calendar", CalendarDays, "Calendar"],
              ] as const
            ).map(([value, Icon, label]) => (
              <Button
                key={value}
                size="sm"
                variant="ghost"
                aria-pressed={view === value}
                className="aria-pressed:bg-accent aria-pressed:text-foreground"
                onClick={() => {
                  setView(value);
                  setLimit(PAGE);
                }}
              >
                <Icon />
                {label}
              </Button>
            ))}
          </div>
        }
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {view === "list" && (
          <Tabs
            value={tab}
            onValueChange={(value) => {
              setTab(value as Tab);
              setLimit(PAGE);
            }}
          >
            <TabsList className="h-9 w-full sm:w-fit">
              {(["upcoming", "past", "cancelled"] as const).map((key) => (
                <TabsTrigger key={key} value={key} className="capitalize">
                  {key}
                  <span className="text-xs text-muted-foreground tabular-nums">{counts[key]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search bookings"
            placeholder="Search guests"
            className="bg-card pl-9"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
          />
        </div>
        <NativeSelect
          aria-label="Event type"
          className="w-full bg-card sm:w-48"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
        >
          <NativeSelectOption value="all">All event types</NativeSelectOption>
          {events.map((event) => (
            <NativeSelectOption key={event.id} value={event.id}>
              {event.title}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      {view === "calendar" ? (
        <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-2xl border bg-card p-4 shadow-xs">
            <MonthCalendar
              month={month}
              setMonth={setMonth}
              selected={day}
              onSelect={setDay}
              today={today}
              counts={perDay}
            />
          </div>
          {list}
        </div>
      ) : (
        list
      )}
      <BookingSheet bookingId={open} onClose={() => setOpen(null)} />
    </>
  );
}
