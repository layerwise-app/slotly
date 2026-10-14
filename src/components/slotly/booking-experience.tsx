import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CalendarX2, Clock3, Globe2, RefreshCw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { NativeSelect, NativeSelectOption } from "~/components/ui/native-select";
import { Skeleton } from "~/components/ui/skeleton";
import { LOCATION_LABELS } from "~/lib/location";
import { openDays } from "~/lib/open-days";
import {
  TIMEZONES,
  availableSlots,
  dateKey,
  eventColor,
  formatDate,
  formatTime,
  type SlotRules,
} from "~/lib/scheduling";
import {
  getAvailableSlots,
  getBooking,
  type getPublicEvent,
} from "~/lib/booking.functions";
import type { Profile } from "~/lib/scheduling.functions";
import { cn } from "~/lib/utils";
import { initials } from "./brand";
import { GuestForm } from "./guest-form";
import { MonthCalendar } from "./month-calendar";
import { EmptyState, LOCATION_ICONS, locationHref } from "./shared";

export type PublicEvent = NonNullable<Awaited<ReturnType<typeof getPublicEvent>>>;

type Preview = {
  profile: Profile;
  rules: SlotRules & { dailyLimit: number | null };
  onBook: () => void;
};

export function BookingExperience({
  event: publicEvent,
  rescheduleToken,
  preview,
}: {
  event: PublicEvent;
  rescheduleToken?: string;
  /** Dashboard preview: slots are computed locally and booking is gated. */
  preview?: Preview;
}) {
  const { event, name, image, timezone: hostZone, bio, weekly, overrides } = publicEvent;
  const hours = { timezone: hostZone, weekly, overrides };
  const [zone, setZone] = useState(hostZone);
  const [now] = useState(() => Date.now());
  const [date, setDate] = useState(() => firstOpenDay(now, hostZone, event, hours));
  const [month, setMonth] = useState(date.slice(0, 7));
  const [picked, setPicked] = useState<number | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [hour12, setHour12] = useState(true);
  const slotsRef = useRef<HTMLElement>(null);
  // Guests see times in their own zone; the server render uses the host's.
  useEffect(() => {
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const localDate = firstOpenDay(now, local, event, hours);
    setZone(local);
    setDate(localDate);
    setMonth(localDate.slice(0, 7));
  }, []);
  const previous = useQuery({
    queryKey: ["reschedule", rescheduleToken],
    queryFn: () => getBooking({ data: { token: rescheduleToken! } }),
    enabled: !!rescheduleToken,
  });
  const slots = useQuery({
    queryKey: ["slots", event.id, date, zone, rescheduleToken],
    queryFn: () => getAvailableSlots({ data: { eventId: event.id, date, timezone: zone, rescheduleToken } }),
    enabled: !preview,
    refetchInterval: 30000,
    staleTime: 10000,
  });
  const available = preview
    ? availableSlots({ date, timezone: zone, now, event: preview.rules, profile: preview.profile, busy: [] })
    : (slots.data ?? []);
  const loading = !preview && slots.isPending;
  const today = dateKey(now, zone);
  // About a month of zone math per pass; recompute only when the view changes.
  const open = useMemo(
    () => openDays({ month, timezone: zone, now, event, profile: hours }),
    [month, zone, now, event.minNotice, event.duration, event.bookingWindow, weekly, overrides, hostZone],
  );
  const last = dateKey(now + event.bookingWindow * 86400000, zone);
  const rescheduleInvalid =
    !!rescheduleToken &&
    !previous.isPending &&
    (!previous.data ||
      previous.data.booking.eventId !== event.id ||
      previous.data.booking.status !== "confirmed" ||
      previous.data.booking.start <= Date.now());
  const zones = [...new Set([...TIMEZONES, hostZone, zone])];
  const LocationIcon = LOCATION_ICONS[event.locationKind];
  const href = event.locationValue ? locationHref(event.locationKind, event.locationValue) : undefined;
  const choose = (next: string) => {
    setDate(next);
    setPicked(null);
    // On narrow screens the slot list sits below the calendar.
    if (window.matchMedia("(max-width: 639px)").matches)
      requestAnimationFrame(() =>
        slotsRef.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "start",
        }),
      );
  };

  const details = (
    <aside className="flex flex-col gap-5 border-b p-6 lg:border-r lg:border-b-0 lg:p-8" data-color={eventColor(event.color)}>
      <div className="flex items-center gap-3">
        {image ? (
          <img src={image} alt="" className="size-11 rounded-full object-cover" />
        ) : (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink font-heading text-sm font-semibold text-white">
            {initials(name)}
          </span>
        )}
        <span className="text-sm font-medium text-muted-foreground">{name}</span>
      </div>
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{event.title}</h1>
        <span aria-hidden="true" className="mt-3 block h-1 w-10 rounded-full bg-event" />
      </div>
      <ul className="flex flex-col gap-2.5 text-sm">
        <li className="flex items-center gap-2.5 font-medium">
          <Clock3 className="size-4 text-muted-foreground" />
          {event.duration} min
        </li>
        {event.locationKind !== "none" && (
          <li className="flex items-start gap-2.5 font-medium">
            <LocationIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              {href ? (
                <a href={href} target="_blank" rel="noreferrer" className="break-words text-brand-text underline-offset-4 hover:underline">
                  {event.locationValue}
                </a>
              ) : (
                <span className="break-words">{event.locationValue || LOCATION_LABELS[event.locationKind]}</span>
              )}
              {(event.locationKind === "video" || event.locationKind === "phone") && (
                <span className="block font-normal text-muted-foreground">Details sent after booking</span>
              )}
            </span>
          </li>
        )}
        {slot && (
          <li className="animate-pop flex items-start gap-2.5 font-medium text-brand-text">
            <CalendarDays className="mt-0.5 size-4 shrink-0" />
            <span>
              {formatDate(slot, zone)}
              <span className="block">
                {formatTime(slot, zone, hour12)} – {formatTime(slot + event.duration * 60000, zone, hour12)}
              </span>
            </span>
          </li>
        )}
      </ul>
      {previous.data && !rescheduleInvalid && (
        <p className="rounded-xl bg-accent px-3.5 py-2.5 text-sm">
          <span className="font-medium">Rescheduling</span>
          <span className="block text-muted-foreground line-through">
            {formatDate(previous.data.booking.start, zone)}, {formatTime(previous.data.booking.start, zone, hour12)}
          </span>
        </p>
      )}
      {event.description && <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{event.description}</p>}
      {bio && <p className="border-t pt-4 text-sm leading-relaxed text-muted-foreground">{bio}</p>}
    </aside>
  );

  let main;
  if (rescheduleToken && previous.isPending) {
    main = (
      <div className="flex flex-col gap-3 p-6 lg:p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  } else if (rescheduleInvalid) {
    main = (
      <div className="p-6 lg:p-8">
        <EmptyState
          icon={CalendarX2}
          title="This booking can't be rescheduled"
          description="It was cancelled or has already happened."
          className="border-0 bg-transparent"
        />
      </div>
    );
  } else if (slot) {
    main = (
      <div className="mx-auto w-full max-w-md p-6 lg:p-8">
        <GuestForm
          key={slot}
          eventId={event.id}
          slot={slot}
          zone={zone}
          rescheduleToken={rescheduleToken}
          previous={previous.data?.booking}
          onBack={() => setSlot(null)}
          onPreviewBook={preview?.onBook}
          onConflict={() => void slots.refetch()}
        />
      </div>
    );
  } else {
    main = (
      <div className="grid sm:grid-cols-[minmax(0,1fr)_minmax(190px,232px)]">
        <section className="flex flex-col gap-4 p-6 lg:p-8">
          <h2 className="text-lg font-semibold">{rescheduleToken ? "Pick a new time" : "Pick a date"}</h2>
          <MonthCalendar month={month} setMonth={setMonth} selected={date} onSelect={choose} today={today} min={today} max={last} open={open} />
          <label className="mt-auto flex items-center gap-2 text-sm text-muted-foreground">
            <Globe2 className="size-4 shrink-0" />
            <span className="sr-only">Time zone</span>
            <NativeSelect
              size="sm"
              className="w-full max-w-64"
              value={zone}
              onChange={(e) => {
                setZone(e.target.value);
                setPicked(null);
              }}
            >
              {zones.map((item) => (
                <NativeSelectOption key={item} value={item}>
                  {item.replace(/_/g, " ")}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
        </section>
        <section ref={slotsRef} aria-label="Available times" className="flex scroll-mt-4 flex-col gap-3 border-t p-6 sm:border-t-0 sm:border-l sm:px-5 lg:py-8">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-sans text-sm font-semibold">
              {new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}
            </h3>
            <div className="flex rounded-full bg-muted p-0.5 text-xs font-medium" role="group" aria-label="Time format">
              {([true, false] as const).map((value) => (
                <button
                  key={String(value)}
                  type="button"
                  aria-pressed={hour12 === value}
                  onClick={() => setHour12(value)}
                  className="rounded-full px-2.5 py-1 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs"
                >
                  {value ? "12h" : "24h"}
                </button>
              ))}
            </div>
          </div>
          <div className="-mx-0.5 flex scroll-py-1 flex-col gap-2 p-1 sm:max-h-[27rem] sm:overflow-y-auto">
            {loading ? (
              Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-12 shrink-0 rounded-xl" />)
            ) : !preview && slots.isError ? (
              <div className="flex flex-col items-start gap-3 py-4 text-sm">
                <p className="text-destructive">Couldn't load times.</p>
                <Button variant="outline" size="sm" onClick={() => void slots.refetch()}>
                  <RefreshCw />
                  Retry
                </Button>
              </div>
            ) : available.length ? (
              available.map((start, index) =>
                picked === start ? (
                  <div key={`${date}-${start}`} className="animate-pop grid shrink-0 grid-cols-2 gap-2">
                    <span className="flex h-12 items-center justify-center rounded-xl bg-ink text-sm font-semibold text-white tabular-nums">
                      {formatTime(start, zone, hour12)}
                    </span>
                    <Button className="h-12 rounded-xl text-sm font-semibold" autoFocus onClick={() => setSlot(start)}>
                      Next
                    </Button>
                  </div>
                ) : (
                  <button
                    key={`${date}-${start}`}
                    type="button"
                    style={{ "--i": Math.min(index, 12) } as React.CSSProperties}
                    onClick={() => setPicked(start)}
                    className="animate-rise h-12 shrink-0 rounded-xl border-2 border-primary/50 bg-card text-sm font-semibold text-brand-text tabular-nums transition-[border-color,background-color,transform] outline-none hover:border-primary hover:bg-accent active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {formatTime(start, zone, hour12)}
                  </button>
                ),
              )
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No times this day.</p>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid overflow-hidden rounded-3xl border bg-card shadow-[0_1px_2px_rgb(28_25_23/0.04),0_12px_40px_-12px_rgb(28_25_23/0.12)]",
        "lg:grid-cols-[280px_minmax(0,1fr)]",
      )}
    >
      {details}
      {main}
    </div>
  );
}

type Hours = Parameters<typeof openDays>[0]["profile"];

/** First date with working time, searched over the next few months. */
function firstOpenDay(now: number, zone: string, event: PublicEvent["event"], hours: Hours) {
  const start = dateKey(now, zone).slice(0, 7);
  for (let i = 0; i < 3; i++) {
    const [year, month] = start.split("-").map(Number) as [number, number];
    const key = new Date(Date.UTC(year, month - 1 + i, 1)).toISOString().slice(0, 7);
    const days = [...openDays({ month: key, timezone: zone, now, event, profile: hours })].sort();
    if (days.length) return days[0]!;
  }
  return dateKey(now + 86400000, zone);
}
