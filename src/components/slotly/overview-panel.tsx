import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ArrowRight, CalendarCheck2, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/ui/chart";
import type { Booking } from "~/lib/scheduling.functions";
import { formatTime } from "~/lib/scheduling";
import { bookingOverview } from "~/lib/overview";
import { BookingSheet } from "./booking-sheet";
import { EmptyState, EventDot, PageHeader, formatDay } from "./shared";
import { useWorkspace } from "./workspace-context";

const chartConfig = {
  confirmed: { label: "Booked", color: "var(--chart-1)" },
  cancelled: { label: "Cancelled", color: "#d9cdb8" },
} satisfies ChartConfig;

export function OverviewPanel() {
  const { bookings, events, profile, name, go, bookingUrl, demo, gate } =
    useWorkspace();
  const [open, setOpen] = useState<string | null>(null);
  const zone = profile.timezone;
  const now = Date.now();
  const stats = bookingOverview(bookings, now, zone);
  const most = Math.max(1, ...stats.byEvent.values());
  const weekly = stats.weekly.map((week) => ({
    ...week,
    label: new Date(`${week.week}T12:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
  }));
  const firstActive = events.find((event) => event.active);
  const copy = async () => {
    if (demo || !firstActive) return gate();
    try {
      await navigator.clipboard.writeText(bookingUrl(firstActive));
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't access the clipboard.");
    }
  };
  const agenda = (items: Booking[], label: string, empty: string) => (
    <div className="flex flex-col gap-2">
      <h3 className="font-sans text-xs font-medium text-muted-foreground">
        {label}
      </h3>
      {items.length ? (
        <ul className="flex flex-col">
          {items.map((item) => {
            const event = events.find((e) => e.id === item.eventId);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setOpen(item.id)}
                  className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="w-[74px] shrink-0 text-sm font-semibold tabular-nums">
                    {label === "Today" ? (
                      formatTime(item.start, zone)
                    ) : (
                      <DayLabel parts={formatDay(item.start, zone).split(", ")} />
                    )}
                  </span>
                  <EventDot color={event?.color ?? "amber"} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {item.guestName}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.title}
                      {label !== "Today" && ` · ${formatTime(item.start, zone)}`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-2 text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
  return (
    <>
      <PageHeader
        title={`Hi, ${name.split(" ")[0]}`}
        actions={
          <Button variant="outline" onClick={() => void copy()} disabled={!demo && !firstActive}>
            <Copy />
            Copy booking link
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Upcoming", stats.upcoming],
          ["Booked, 8 weeks", stats.booked],
          ["Cancelled, 8 weeks", stats.cancelled],
          ["Active event types", `${events.filter((e) => e.active).length}/${events.length}`],
        ].map(([label, value], index) => (
          <Card key={label} size="sm" className="animate-rise gap-1 ring-border" style={{ "--i": index } as React.CSSProperties}>
            <CardContent>
              <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
              <p className="mt-1 font-heading text-3xl font-semibold tabular-nums">
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="ring-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-semibold">Bookings per week</CardTitle>
            <CardDescription>By the week they were made</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="aspect-auto h-60 w-full">
              <BarChart data={weekly} margin={{ left: -24, right: 4, top: 4 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="confirmed" stackId="a" fill="var(--color-confirmed)" radius={4} />
                <Bar dataKey="cancelled" stackId="a" fill="var(--color-cancelled)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="ring-border lg:row-span-2">
          <CardHeader>
            <CardTitle className="font-semibold">Agenda</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" onClick={() => go("bookings")}>
                All bookings
                <ArrowRight />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {agenda(stats.today, "Today", "Nothing booked today.")}
            {agenda(stats.next, "Next up", "No upcoming bookings yet.")}
          </CardContent>
        </Card>
        <Card className="ring-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-semibold">By event type</CardTitle>
            <CardDescription>Confirmed bookings, last 8 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            {events.length ? (
              <ul className="flex flex-col gap-3">
                {events.map((event) => {
                  const count = stats.byEvent.get(event.id) ?? 0;
                  return (
                    <li key={event.id} data-color={event.color} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5">
                      <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                        <EventDot color={event.color} />
                        <span className="truncate">{event.title}</span>
                      </span>
                      <span className="text-sm font-semibold tabular-nums">{count}</span>
                      <span className="col-span-2 h-2 overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full origin-left rounded-full bg-event transition-[width] duration-700"
                          style={{ width: `${(count / most) * 100}%` }}
                        />
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon={CalendarCheck2}
                title="No event types yet"
                action={<Button onClick={() => go("events")}>Create event type</Button>}
              />
            )}
          </CardContent>
        </Card>
      </div>
      <BookingSheet bookingId={open} onClose={() => setOpen(null)} />
    </>
  );
}

function DayLabel({ parts: [weekday, day] }: { parts: string[] }) {
  return (
    <span className="flex flex-col leading-tight">
      {day}
      <span className="text-xs font-normal text-muted-foreground">{weekday}</span>
    </span>
  );
}
