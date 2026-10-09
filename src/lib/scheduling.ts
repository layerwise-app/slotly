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
export const COLORS = ["green", "blue", "violet", "amber", "rose"];
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
  profile: { timezone: string; weekly: WeekDay[]; overrides: DateOverride[] },
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

export function calendarFile(item: {
  title: string;
  start: number;
  end: number;
  notes?: string;
}) {
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
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Slotly//Scheduling//EN",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@slotly`,
    `DTSTAMP:${stamp(Date.now())}`,
    `DTSTART:${stamp(item.start)}`,
    `DTEND:${stamp(item.end)}`,
    `SUMMARY:${escape(item.title)}`,
    `DESCRIPTION:${escape(item.notes || "Scheduled with Slotly")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "slotly-booking.ics";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
