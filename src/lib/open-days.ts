import {
  dateKey,
  dayStart,
  minutes,
  workingWindow,
  type DateOverride,
  type SlotRules,
  type WeekDay,
} from "~/lib/scheduling";

const DAY = 86400000;
const STEP = 15 * 60000;

/**
 * Dates of a month, in the guest's zone, where the host has working time long
 * enough for the event within notice and window rules. Bookings are ignored,
 * so a returned day can still be full; the slot list stays authoritative.
 */
export function openDays({
  month,
  timezone,
  now,
  event,
  profile,
}: {
  month: string;
  timezone: string;
  now: number;
  event: Pick<SlotRules, "duration" | "minNotice" | "bookingWindow">;
  profile: { timezone: string; weekly: WeekDay[]; overrides: DateOverride[] };
}) {
  const open = new Set<string>();
  const first = Date.parse(`${month}-01T00:00:00Z`);
  const length = event.duration * 60000;
  const earliest = now + event.minNotice * 60000;
  const latest = now + event.bookingWindow * DAY;
  // Host dates two days either side cover every zone offset pairing.
  for (let t = first - 2 * DAY; t < first + 34 * DAY; t += DAY) {
    const date = new Date(t).toISOString().slice(0, 10);
    const window = workingWindow(date, profile.weekly, profile.overrides);
    if (!window) continue;
    const start = dayStart(date, profile.timezone);
    const from = Math.max(start + minutes(window.start) * 60000, earliest);
    const to = Math.min(start + minutes(window.end) * 60000 - length, latest);
    for (let instant = from; instant <= to; instant += STEP) {
      const key = dateKey(instant, timezone);
      if (key.startsWith(month)) open.add(key);
    }
    if (from <= to) {
      const key = dateKey(to, timezone);
      if (key.startsWith(month)) open.add(key);
    }
  }
  return open;
}
