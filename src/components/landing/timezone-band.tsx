import { useEffect, useState } from "react";
import { Globe2 } from "lucide-react";
import { dateKey, dayStart, localMinute } from "~/lib/scheduling";
import { cn } from "~/lib/utils";

const HOST = "America/New_York";
const CITIES = [
  { city: "New York", zone: HOST },
  { city: "San Francisco", zone: "America/Los_Angeles" },
  { city: "London", zone: "Europe/London" },
  { city: "Berlin", zone: "Europe/Berlin" },
  { city: "Bangalore", zone: "Asia/Kolkata" },
  { city: "Tokyo", zone: "Asia/Tokyo" },
];
// Host-side start times the band cycles through, in minutes after midnight.
const STARTS = [10 * 60 + 30, 14 * 60, 8 * 60 + 30];

/** One host slot shown on a 24-hour track for guests in several zones. */
export function TimezoneBand({ today }: { today: number }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % STARTS.length), 3200);
    return () => window.clearInterval(timer);
  }, []);
  // A fixed weekday derived from the loader's timestamp keeps SSR and hydration equal.
  const date = dateKey(today + 3 * 86400000, HOST);
  const instant = dayStart(date, HOST) + STARTS[index]! * 60000;
  const time = (zone: string) =>
    new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit" }).format(instant);
  const weekday = (zone: string) =>
    new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short" }).format(instant);
  return (
    <div className="rounded-[28px] border bg-card p-5 shadow-xs sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
          <Globe2 className="size-4 text-primary" />
          <span className="tabular-nums" aria-live="polite">
            {weekday(HOST)} {time(HOST)}
          </span>
          <span className="font-normal text-white/60">host time</span>
        </span>
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2 w-5 rounded-full bg-accent ring-1 ring-primary/30" />
          8 AM – 7 PM local
        </span>
      </div>
      <div aria-hidden="true" className="mb-2 hidden grid-cols-[140px_minmax(0,1fr)_96px] gap-x-4 text-[11px] text-muted-foreground sm:grid">
        <span />
        <span className="relative h-4">
          {["12a", "6a", "12p", "6p"].map((label, i) => (
            <span key={label} className="absolute -translate-x-1/2 first:translate-x-0" style={{ left: `${i * 25}%` }}>
              {label}
            </span>
          ))}
        </span>
      </div>
      <ul className="flex flex-col gap-3.5">
        {CITIES.map(({ city, zone }, i) => {
          const minute = localMinute(instant, zone);
          const off = weekday(zone) !== weekday(HOST);
          const working = minute >= 8 * 60 && minute < 19 * 60;
          return (
            <li
              key={zone}
              data-reveal
              style={{ "--i": i } as React.CSSProperties}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[140px_minmax(0,1fr)_96px]"
            >
              <span className="truncate text-sm font-medium">{city}</span>
              <span className="relative col-span-2 h-3 rounded-full bg-muted sm:order-none sm:col-span-1 max-sm:order-last">
                <span aria-hidden="true" className="absolute inset-y-0 left-1/3 w-[45.8%] rounded-full bg-accent" />
                <span
                  className={cn(
                    "tz-marker absolute top-1/2 h-6 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-card",
                    working ? "bg-primary" : "bg-ink/70",
                  )}
                  style={{ left: `${(minute / 1440) * 100}%` }}
                />
              </span>
              <span className="text-right text-sm font-semibold tabular-nums">
                {time(zone)}
                {off && <span className="ml-1 text-xs font-normal text-muted-foreground">{weekday(zone)}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
