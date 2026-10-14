export type WeekDay = {
  day: number;
  enabled: boolean;
  start: string;
  end: string;
};
export type DateOverride = {
  date: string;
  unavailable: boolean;
  start: string;
  end: string;
};
export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Kolkata",
  "Australia/Sydney",
  "UTC",
];
export const TIMEZONES = [
  ...new Set([
    ...COMMON_TIMEZONES,
    ...(typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : []),
  ]),
];
export const DEFAULT_WEEK: WeekDay[] = Array.from({ length: 7 }, (_, day) => ({
  day,
  enabled: day > 0 && day < 6,
  start: "09:00",
  end: "17:00",
}));
export const COLORS = ["amber", "coral", "violet", "sky", "rose", "slate"];
export const SLOT_INTERVALS = [10, 15, 20, 30, 60];
export type SlotRules = {
  duration: number;
  minNotice: number;
  bookingWindow: number;
  slotInterval: number;
};
type Availability = {
  timezone: string;
  weekly: WeekDay[];
  overrides: DateOverride[];
};
const dateFormatters = new Map<string, Intl.DateTimeFormat>();
const minuteFormatters = new Map<string, Intl.DateTimeFormat>();

// Adapted from Cal.diy packages/lib/slugify.ts (MIT). See THIRD_PARTY_NOTICES.md.
export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function eventColor(color: string) {
  return COLORS.includes(color) ? color : "amber";
}

export function dateKey(timestamp: number, timezone: string) {
  if (!dateFormatters.has(timezone))
    dateFormatters.set(
      timezone,
      new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
    );
  const parts = dateFormatters.get(timezone)!.formatToParts(timestamp);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function localMinute(timestamp: number, timezone: string) {
  if (!minuteFormatters.has(timezone))
    minuteFormatters.set(
      timezone,
      new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }),
    );
  const parts = minuteFormatters.get(timezone)!.formatToParts(timestamp);
  return (
    Number(parts.find((p) => p.type === "hour")!.value) * 60 +
    Number(parts.find((p) => p.type === "minute")!.value)
  );
}

export function minutes(value: string) {
  const [hours, mins] = value.split(":").map(Number);
  return hours * 60 + mins;
}

export function workingWindow(
  date: string,
  weekly: WeekDay[],
  overrides: DateOverride[],
) {
  const override = overrides.find((item) => item.date === date);
  if (override) return override.unavailable ? null : override;
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  const regular = weekly.find((item) => item.day === day);
  return regular?.enabled ? regular : null;
}

export function fitsAvailability(
  start: number,
  end: number,
  profile: Availability,
) {
  const date = dateKey(start, profile.timezone);
  if (dateKey(end, profile.timezone) !== date) return false;
  const window = workingWindow(date, profile.weekly, profile.overrides);
  if (!window) return false;
  const open = minutes(window.start);
  const close = minutes(window.end);
  const first = localMinute(start, profile.timezone);
  const last = localMinute(end, profile.timezone);
  if (first < open || first >= close || last < open || last > close)
    return false;
  // On a DST fold, matching endpoints do not guarantee the interval stays
  // inside the working window. Check the intervening real instants as well.
  if (last - first !== (end - start) / 60000) {
    for (let instant = start; instant < end; instant += 15 * 60000) {
      const minute = localMinute(instant, profile.timezone);
      if (minute < open || minute >= close) return false;
    }
  }
  return true;
}

// Notice, horizon, and grid rules shared by the slot list and booking writes.
export function slotAllowed(
  start: number,
  now: number,
  rules: SlotRules,
  profile: Availability,
) {
  return (
    start % 60000 === 0 &&
    start >= now + rules.minNotice * 60000 &&
    start <= now + rules.bookingWindow * 86400000 &&
    localMinute(start, profile.timezone) % rules.slotInterval === 0 &&
    fitsAvailability(start, start + rules.duration * 60000, profile)
  );
}

// First instant of a local calendar date. Local midnight is always within
// UTC-14h..UTC+12h, and zone offsets are multiples of 15 minutes, so a short
// forward scan also handles days that start at 01:00 after a DST jump.
export function dayStart(date: string, timezone: string) {
  let instant = Date.parse(`${date}T00:00:00Z`) - 14 * 3600000;
  while (dateKey(instant, timezone) < date) instant += 15 * 60000;
  return instant;
}

export function dayRange(date: string, timezone: string) {
  const next = new Date(Date.parse(`${date}T12:00:00Z`) + 86400000)
    .toISOString()
    .slice(0, 10);
  return { start: dayStart(date, timezone), end: dayStart(next, timezone) };
}

type BusyInterval = {
  id: string;
  start: number;
  end: number;
  busyStart: number;
  busyEnd: number;
};
export function availableSlots({
  date,
  timezone,
  now,
  event,
  profile,
  busy,
  booked = [],
  excludedId,
}: {
  date: string;
  timezone: string;
  now: number;
  event: SlotRules & { dailyLimit: number | null };
  profile: Availability & { bufferBefore: number; bufferAfter: number };
  busy: BusyInterval[];
  /** Confirmed bookings of this event type, used for its daily limit. */
  booked?: { id: string; start: number }[];
  excludedId?: string;
}) {
  const base = Date.parse(`${date}T00:00:00Z`);
  const perDay = new Map<string, number>();
  for (const item of booked) {
    if (item.id === excludedId) continue;
    const key = dateKey(item.start, profile.timezone);
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  const slots: number[] = [];
  // Iterate real instants, not wall-clock arithmetic, so DST gaps/folds stay
  // correct. Five-minute steps cover every interval and zone offset.
  for (
    let start = base - 86400000;
    start < base + 2 * 86400000;
    start += 5 * 60000
  ) {
    if (
      dateKey(start, timezone) !== date ||
      !slotAllowed(start, now, event, profile)
    )
      continue;
    if (
      event.dailyLimit !== null &&
      (perDay.get(dateKey(start, profile.timezone)) ?? 0) >= event.dailyLimit
    )
      continue;
    const end = start + event.duration * 60000;
    const before = start - profile.bufferBefore * 60000;
    const after = end + profile.bufferAfter * 60000;
    if (
      !busy.some(
        (item) =>
          item.id !== excludedId &&
          before <
            Math.max(item.busyEnd, item.end + profile.bufferAfter * 60000) &&
          after >
            Math.min(item.busyStart, item.start - profile.bufferBefore * 60000),
      )
    )
      slots.push(start);
  }
  return slots;
}

export function formatTime(timestamp: number, timezone: string, hour12 = true) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12,
  }).format(timestamp);
}

export function formatDate(timestamp: number, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(timestamp);
}

type CalendarItem = {
  id: string;
  title: string;
  start: number;
  end: number;
  notes?: string;
  location?: string;
};
export function calendarText(item: CalendarItem, now = Date.now()) {
  const stamp = (value: number) =>
    new Date(value)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const escape = (value: string) =>
    value
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/[,;]/g, "\\$&");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Slotly//Scheduling//EN",
    "BEGIN:VEVENT",
    // The booking ID keeps re-downloads as one event. Never use the private
    // token here; calendar files get forwarded.
    `UID:${item.id}@slotly`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(item.start)}`,
    `DTEND:${stamp(item.end)}`,
    `SUMMARY:${escape(item.title)}`,
    `DESCRIPTION:${escape(item.notes || "Scheduled with Slotly")}`,
    ...(item.location ? [`LOCATION:${escape(item.location)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function calendarFile(item: CalendarItem) {
  const body = calendarText(item);
  const url = URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "slotly-booking.ics";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
