import { Clock3, MapPin, Video, XCircle } from "lucide-react";
import { cn } from "~/lib/utils";

const frame =
  "rounded-[28px] border bg-card p-4 shadow-[0_1px_2px_rgb(28_25_23/0.04),0_18px_50px_-24px_rgb(28_25_23/0.25)] transition-transform duration-500 hover:-translate-y-1 sm:p-6";

const EVENTS = [
  { title: "Intro call", color: "amber", duration: 20, icon: Video, place: "Video call", rules: ["1 hour notice", "60 days ahead"], on: true },
  { title: "Strategy session", color: "violet", duration: 50, icon: Video, place: "Video call", rules: ["Max 2/day", "Every 30 min"], on: true },
  { title: "Coffee chat", color: "coral", duration: 30, icon: MapPin, place: "Blue Bottle, W 40th St", rules: ["1 day notice"], on: false },
];

export function EventTypesFragment() {
  return (
    <div aria-hidden="true" className={cn(frame, "flex flex-col gap-3")}>
      {EVENTS.map((event, i) => (
        <div
          key={event.title}
          data-color={event.color}
          className="group relative flex items-start gap-3 overflow-hidden rounded-2xl border bg-background p-4 pl-5 transition-transform duration-300 hover:translate-x-1"
          style={{ "--i": i } as React.CSSProperties}
        >
          <span className="absolute inset-y-0 left-0 w-1.5 bg-event" />
          <div className={cn("min-w-0 flex-1", !event.on && "opacity-55")}>
            <p className="font-heading font-semibold">{event.title}</p>
            <p className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock3 className="size-3" />
                {event.duration} min
              </span>
              <span className="inline-flex min-w-0 items-center gap-1 truncate">
                <event.icon className="size-3 shrink-0" />
                {event.place}
              </span>
            </p>
            <p className="mt-2 flex flex-wrap gap-1.5">
              {event.rules.map((rule) => (
                <span key={rule} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {rule}
                </span>
              ))}
            </p>
          </div>
          <span className={cn("mt-0.5 flex h-[18px] w-8 shrink-0 items-center rounded-full p-0.5", event.on ? "justify-end bg-primary" : "bg-input")}>
            <span className="size-3.5 rounded-full bg-white shadow-xs" />
          </span>
        </div>
      ))}
    </div>
  );
}

const WEEK = [
  ["Mon", "9:00 AM", "5:00 PM"],
  ["Tue", "9:00 AM", "5:00 PM"],
  ["Wed", "10:00 AM", "6:00 PM"],
  ["Thu", "9:00 AM", "5:00 PM"],
  ["Fri", "9:00 AM", "1:00 PM"],
  ["Sat", "", ""],
];

export function AvailabilityFragment() {
  return (
    <div aria-hidden="true" className={frame}>
      <div className="flex flex-col divide-y">
        {WEEK.map(([day, start, end]) => (
          <div key={day} className="flex items-center gap-3 py-2.5 text-sm">
            <span className={cn("flex h-[18px] w-8 shrink-0 items-center rounded-full p-0.5", start ? "justify-end bg-primary" : "bg-input")}>
              <span className="size-3.5 rounded-full bg-white shadow-xs" />
            </span>
            <span className="w-9 font-medium">{day}</span>
            {start ? (
              <span className="flex items-center gap-2 tabular-nums">
                <span className="rounded-lg border bg-background px-2.5 py-1">{start}</span>
                <span className="text-muted-foreground">–</span>
                <span className="rounded-lg border bg-background px-2.5 py-1">{end}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Unavailable</span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t pt-4 text-xs font-medium">
        <span className="rounded-full bg-accent px-3 py-1 text-brand-text">10 min buffer after</span>
        <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">Dec 24 · Unavailable</span>
      </div>
    </div>
  );
}

const BARS = [3, 5, 4, 7, 6, 9, 8, 11];
const AGENDA = [
  { time: "9:30 AM", name: "Priya Shah", what: "Intro call", color: "amber" },
  { time: "11:00 AM", name: "Marco Rossi", what: "Strategy session", color: "violet" },
  { time: "2:30 PM", name: "Hana Kim", what: "Coffee chat", color: "coral", cancelled: true },
];

export function BookingsFragment() {
  return (
    <div aria-hidden="true" className={cn(frame, "flex flex-col gap-5")}>
      <div>
        <div className="flex items-baseline justify-between">
          <p className="font-heading font-semibold">Bookings per week</p>
          <p className="font-heading text-2xl font-semibold tabular-nums">53</p>
        </div>
        <div className="mt-3 flex h-24 items-end gap-2">
          {BARS.map((value, i) => (
            <span
              key={i}
              data-reveal="grow"
              className="flex-1 origin-bottom rounded-md bg-primary"
              style={{ height: `${(value / 11) * 100}%`, "--i": i } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
      <ul className="flex flex-col divide-y rounded-2xl border bg-background">
        {AGENDA.map((item) => (
          <li key={item.name} data-color={item.color} className="flex items-center gap-3 px-4 py-3 text-sm">
            <span className="w-16 shrink-0 font-semibold tabular-nums">{item.time}</span>
            <span className="h-8 w-1 shrink-0 rounded-full bg-event" />
            <span className="min-w-0 flex-1">
              <span className={cn("block truncate font-medium", item.cancelled && "text-muted-foreground line-through")}>{item.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{item.what}</span>
            </span>
            {item.cancelled && (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                <XCircle className="size-3" />
                Cancelled
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
