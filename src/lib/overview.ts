import { dateKey } from "~/lib/scheduling";

type OverviewBooking = {
  eventId: string;
  start: number;
  status: "confirmed" | "cancelled";
  createdAt: number;
};

/** Monday (YYYY-MM-DD) of the local week containing the timestamp. */
export function weekOf(timestamp: number, timezone: string) {
  const noon = Date.parse(`${dateKey(timestamp, timezone)}T12:00:00Z`);
  const offset = (new Date(noon).getUTCDay() + 6) % 7;
  return new Date(noon - offset * 86400000).toISOString().slice(0, 10);
}

// Weekly buckets use the day a booking was made, so the chart shows demand
// rather than when meetings happen.
export function bookingOverview<T extends OverviewBooking>(
  bookings: T[],
  now: number,
  timezone: string,
  weeks = 8,
) {
  const current = Date.parse(`${weekOf(now, timezone)}T12:00:00Z`);
  const weekly = Array.from({ length: weeks }, (_, index) => ({
    week: new Date(current - (weeks - 1 - index) * 7 * 86400000)
      .toISOString()
      .slice(0, 10),
    confirmed: 0,
    cancelled: 0,
  }));
  const buckets = new Map(weekly.map((bucket) => [bucket.week, bucket]));
  const byEvent = new Map<string, number>();
  for (const item of bookings) {
    const bucket = buckets.get(weekOf(item.createdAt, timezone));
    if (!bucket) continue;
    bucket[item.status] += 1;
    if (item.status === "confirmed")
      byEvent.set(item.eventId, (byEvent.get(item.eventId) ?? 0) + 1);
  }
  const today = dateKey(now, timezone);
  const confirmed = bookings
    .filter((item) => item.status === "confirmed")
    .sort((a, b) => a.start - b.start);
  const future = confirmed.filter((item) => item.start > now);
  return {
    weekly,
    byEvent,
    booked: weekly.reduce((sum, week) => sum + week.confirmed, 0),
    cancelled: weekly.reduce((sum, week) => sum + week.cancelled, 0),
    upcoming: future.length,
    today: confirmed.filter((item) => dateKey(item.start, timezone) === today),
    next: future
      .filter((item) => dateKey(item.start, timezone) !== today)
      .slice(0, 5),
  };
}
