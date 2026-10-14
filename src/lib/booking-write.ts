import { and, eq, gt, gte, lt, ne, notExists, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { booking, eventType } from "~/db/schema";
import type { db as database } from "~/db";

type ReadDatabase = Pick<typeof database, "select">;
type BookingInsert = typeof booking.$inferInsert;
/** The host-local day containing the booking start, as [start, end) instants. */
type DayRange = { start: number; end: number };

function overlappingBookings(
  db: ReadDatabase,
  ownerId: string,
  start: number,
  end: number,
  bufferBefore: number,
  bufferAfter: number,
  excludedId?: string,
) {
  const other = alias(booking, "other_booking");
  return db
    .select({ id: other.id })
    .from(other)
    .where(
      and(
        eq(other.ownerId, ownerId),
        eq(other.status, "confirmed"),
        lt(
          sql<number>`min(${other.busyStart}, ${other.start} - ${bufferBefore})`,
          end,
        ),
        gt(
          sql<number>`max(${other.busyEnd}, ${other.end} + ${bufferAfter})`,
          start,
        ),
        excludedId ? ne(other.id, excludedId) : undefined,
      ),
    );
}

// True while the event type has room under its optional daily limit. Counts
// confirmed bookings of the same event type on the host-local day.
function underDailyLimit(
  db: ReadDatabase,
  eventId: string,
  day: DayRange,
  excludedId?: string,
) {
  const other = alias(booking, "day_booking");
  const used = db
    .select({ count: sql<number>`count(*)` })
    .from(other)
    .where(
      and(
        eq(other.eventId, eventId),
        eq(other.status, "confirmed"),
        gte(other.start, day.start),
        lt(other.start, day.end),
        excludedId ? ne(other.id, excludedId) : undefined,
      ),
    );
  const limit = db
    .select({ limit: eventType.dailyLimit })
    .from(eventType)
    .where(eq(eventType.id, eventId));
  return sql`coalesce((${limit}), ${Number.MAX_SAFE_INTEGER}) > (${used})`;
}

// The predicate and write execute in ONE serialized SQLite statement, across
// event types and Worker instances. A separate read-then-insert would race.
export function insertBookingIfAvailable(
  db: ReadDatabase & Pick<typeof database, "insert">,
  value: BookingInsert,
  day: DayRange,
) {
  const conflict = overlappingBookings(
    db,
    value.ownerId,
    value.busyStart,
    value.busyEnd,
    value.start - value.busyStart,
    value.busyEnd - value.end,
  );
  return db
    .insert(booking)
    .select(
      db
        .select({
          id: sql<string>`${value.id}`.as("id"),
          token: sql<string>`${value.token}`.as("token"),
          ownerId: sql<string>`${value.ownerId}`.as("owner_id"),
          eventId: sql<string>`${value.eventId}`.as("event_id"),
          title: sql<string>`${value.title}`.as("title"),
          start: sql<number>`${value.start}`.as("start"),
          end: sql<number>`${value.end}`.as("end"),
          busyStart: sql<number>`${value.busyStart}`.as("busy_start"),
          busyEnd: sql<number>`${value.busyEnd}`.as("busy_end"),
          guestName: sql<string>`${value.guestName}`.as("guest_name"),
          guestEmail: sql<string>`${value.guestEmail}`.as("guest_email"),
          guestTimezone: sql<string>`${value.guestTimezone}`.as(
            "guest_timezone",
          ),
          notes: sql<string>`${value.notes || ""}`.as("notes"),
          status: sql<"confirmed">`'confirmed'`.as("status"),
          createdAt: sql<number>`${value.createdAt}`.as("created_at"),
        })
        .from(eventType)
        .where(
          and(
            eq(eventType.id, value.eventId),
            eq(eventType.ownerId, value.ownerId),
            eq(eventType.active, true),
            notExists(conflict),
            underDailyLimit(db, value.eventId, day),
          ),
        ),
    )
    .returning({ token: booking.token });
}

export function rescheduleBookingIfAvailable(
  db: ReadDatabase & Pick<typeof database, "update">,
  previous: { id: string; ownerId: string; eventId: string; start: number },
  times: {
    start: number;
    end: number;
    busyStart: number;
    busyEnd: number;
    guestTimezone: string;
  },
  day: DayRange,
) {
  const conflict = overlappingBookings(
    db,
    previous.ownerId,
    times.busyStart,
    times.busyEnd,
    times.start - times.busyStart,
    times.busyEnd - times.end,
    previous.id,
  );
  return db
    .update(booking)
    .set(times)
    .where(
      and(
        eq(booking.id, previous.id),
        eq(booking.ownerId, previous.ownerId),
        eq(booking.status, "confirmed"),
        eq(booking.start, previous.start),
        notExists(conflict),
        underDailyLimit(db, previous.eventId, day, previous.id),
      ),
    )
    .returning({ token: booking.token });
}
