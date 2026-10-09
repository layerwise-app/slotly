import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq, lt, gt, desc, notExists } from "drizzle-orm";
import { db } from "~/db";
import { schedulingProfile, eventType, booking, user } from "~/db/schema";
import { auth } from "~/lib/auth";
import {
  insertBookingIfAvailable,
  rescheduleBookingIfAvailable,
} from "~/lib/booking-write";
import {
  COLORS,
  DEFAULT_WEEK,
  dateKey,
  fitsAvailability,
  localMinute,
  slugify,
  type WeekDay,
  type DateOverride,
} from "~/lib/scheduling";

function text(value: unknown, label: string, max = 200, required = true) {
  if (
    typeof value !== "string" ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    throw new Error(`Please enter a valid ${label}.`);
  return value.trim();
}
function integer(value: unknown, label: string, min: number, max: number) {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  )
    throw new Error(`Invalid ${label}.`);
  return value;
}
function timezone(value: unknown) {
  const zone = text(value, "timezone", 100);
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone }).format();
  } catch {
    throw new Error("Choose a valid timezone.");
  }
  return zone;
}
async function requireOwner() {
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  if (!session || session.user.banned)
    throw new Error("Please sign in to manage your scheduling workspace.");
  return session.user;
}
async function saveSafely<T>(
  query: PromiseLike<T>,
  duplicateMessage = "That value is already in use.",
) {
  try {
    return await query;
  } catch (error) {
    const cause =
      error instanceof Error && error.cause instanceof Error
        ? error.cause.message
        : "";
    if (/unique/i.test(cause)) throw new Error(duplicateMessage);
    console.error(
      "Slotly database write failed",
      cause || (error instanceof Error ? error.name : "Unknown error"),
    );
    throw new Error("We could not save this change. Please try again.");
  }
}
async function ensureProfile(owner: { id: string; name: string }) {
  await db
    .insert(schedulingProfile)
    .values({
      ownerId: owner.id,
      handle: `${slugify(owner.name).slice(0, 35) || "host"}-${owner.id
        .replace(/[^a-z0-9]/gi, "")
        .slice(-8)
        .toLowerCase()}`,
      timezone: "America/New_York",
      weekly: DEFAULT_WEEK,
      overrides: [],
    })
    .onConflictDoNothing();
  return (
    await db
      .select()
      .from(schedulingProfile)
      .where(eq(schedulingProfile.ownerId, owner.id))
  )[0]!;
}

export const getWorkspace = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await auth.api.getSession({ headers: getRequestHeaders() });
    if (!session || session.user.banned) return null;
    const profile = await ensureProfile(session.user);
    const events = await db
      .select()
      .from(eventType)
      .where(eq(eventType.ownerId, session.user.id))
      .orderBy(eventType.createdAt);
    const bookings = await db
      .select()
      .from(booking)
      .where(eq(booking.ownerId, session.user.id))
      .orderBy(desc(booking.start));
    return {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      },
      profile,
      events,
      bookings,
    };
  },
);

export type Workspace = NonNullable<Awaited<ReturnType<typeof getWorkspace>>>;
export type EventType = Workspace["events"][number];
export type Booking = Workspace["bookings"][number];
export type Profile = Workspace["profile"];

type EventInput = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  duration: number;
  color: string;
  active: boolean;
};
export const saveEvent = createServerFn({ method: "POST" })
  .validator((raw: EventInput) => {
    const title = text(raw.title, "title", 100);
    const slug = slugify(text(raw.slug || title, "booking URL", 80));
    if (!slug)
      throw new Error("The booking URL must contain letters or numbers.");
    if (!COLORS.includes(raw.color) || typeof raw.active !== "boolean")
      throw new Error("Invalid event settings.");
    return {
      ...raw,
      id: raw.id ? text(raw.id, "event ID", 100) : undefined,
      title,
      slug,
      description: text(raw.description, "description", 2000, false),
      duration: integer(raw.duration, "duration", 5, 480),
    };
  })
  .handler(async ({ data }) => {
    const owner = await requireOwner();
    await ensureProfile(owner);
    if (data.id) {
      const result = await saveSafely(
        db
          .update(eventType)
          .set({
            title: data.title,
            slug: data.slug,
            description: data.description,
            duration: data.duration,
            color: data.color,
            active: data.active,
          })
          .where(
            and(eq(eventType.id, data.id), eq(eventType.ownerId, owner.id)),
          )
          .returning(),
        "An event type with this booking URL already exists.",
      );
      if (!result.length) throw new Error("Event type not found.");
      return result[0]!;
    }
    return (
      await saveSafely(
        db
          .insert(eventType)
          .values({
            ...data,
            id: crypto.randomUUID(),
            ownerId: owner.id,
            createdAt: Date.now(),
          })
          .returning(),
        "An event type with this booking URL already exists.",
      )
    )[0]!;
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .validator((raw: { id: string }) => ({ id: text(raw.id, "event ID", 100) }))
  .handler(async ({ data }) => {
    const owner = await requireOwner();
    const linked = db
      .select({ id: booking.id })
      .from(booking)
      .where(eq(booking.eventId, data.id));
    const deleted = await saveSafely(
      db
        .delete(eventType)
        .where(
          and(
            eq(eventType.id, data.id),
            eq(eventType.ownerId, owner.id),
            notExists(linked),
          ),
        )
        .returning({ id: eventType.id }),
    );
    if (!deleted.length)
      throw new Error(
        "This event is no longer available or has booking history. Turn it off instead to preserve your bookings.",
      );
    return { success: true };
  });

type ProfileInput = {
  handle: string;
  bio: string;
  timezone: string;
  weekly: WeekDay[];
  overrides: DateOverride[];
  bufferBefore: number;
  bufferAfter: number;
};
function validateWindow(start: string, end: string) {
  const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  if (!time.test(start) || !time.test(end) || start >= end)
    throw new Error(
      "Availability needs a valid start time before its end time.",
    );
}
export const saveProfile = createServerFn({ method: "POST" })
  .validator((raw: ProfileInput) => {
    const handle = text(raw.handle, "username", 50);
    if (!/^[a-z0-9][a-z0-9-]{2,49}$/.test(handle))
      throw new Error(
        "Username needs 3-50 lowercase letters, numbers, or hyphens.",
      );
    if (
      !Array.isArray(raw.weekly) ||
      raw.weekly.length !== 7 ||
      new Set(raw.weekly.map((d) => d.day)).size !== 7
    )
      throw new Error("Provide all seven weekdays.");
    for (const day of raw.weekly) {
      integer(day.day, "weekday", 0, 6);
      if (typeof day.enabled !== "boolean") throw new Error("Invalid weekday.");
      validateWindow(day.start, day.end);
    }
    if (
      !Array.isArray(raw.overrides) ||
      raw.overrides.length > 100 ||
      new Set(raw.overrides.map((o) => o.date)).size !== raw.overrides.length
    )
      throw new Error("Date overrides must be unique (maximum 100).");
    for (const item of raw.overrides) {
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ||
        !Number.isFinite(Date.parse(item.date)) ||
        new Date(`${item.date}T12:00:00Z`).toISOString().slice(0, 10) !==
          item.date ||
        typeof item.unavailable !== "boolean"
      )
        throw new Error("Invalid override date.");
      validateWindow(item.start, item.end);
    }
    return {
      handle,
      bio: text(raw.bio, "bio", 1000, false),
      timezone: timezone(raw.timezone),
      weekly: raw.weekly.map(({ day, enabled, start, end }) => ({
        day,
        enabled,
        start,
        end,
      })),
      overrides: raw.overrides.map(({ date, unavailable, start, end }) => ({
        date,
        unavailable,
        start,
        end,
      })),
      bufferBefore: integer(raw.bufferBefore, "before buffer", 0, 120),
      bufferAfter: integer(raw.bufferAfter, "after buffer", 0, 120),
    };
  })
  .handler(async ({ data }) => {
    const owner = await requireOwner();
    await ensureProfile(owner);
    return (
      await saveSafely(
        db
          .update(schedulingProfile)
          .set(data)
          .where(eq(schedulingProfile.ownerId, owner.id))
          .returning(),
        "This username is already taken. Please choose another.",
      )
    )[0]!;
  });

export const getPublicEvent = createServerFn({ method: "GET" })
  .validator((raw: { handle: string; slug: string }) => ({
    handle: text(raw.handle, "username", 80),
    slug: text(raw.slug, "event URL", 80),
  }))
  .handler(async ({ data }) => {
    const rows = await db
      .select({
        event: eventType,
        name: user.name,
        image: user.image,
        handle: schedulingProfile.handle,
        timezone: schedulingProfile.timezone,
        bio: schedulingProfile.bio,
      })
      .from(eventType)
      .innerJoin(
        schedulingProfile,
        eq(eventType.ownerId, schedulingProfile.ownerId),
      )
      .innerJoin(user, eq(eventType.ownerId, user.id))
      .where(
        and(
          eq(schedulingProfile.handle, data.handle),
          eq(eventType.slug, data.slug),
          eq(eventType.active, true),
        ),
      );
    return rows[0] || null;
  });

async function eventContext(id: string) {
  const rows = await db
    .select({ event: eventType, profile: schedulingProfile })
    .from(eventType)
    .innerJoin(
      schedulingProfile,
      eq(eventType.ownerId, schedulingProfile.ownerId),
    )
    .where(eq(eventType.id, id));
  if (!rows[0]?.event.active)
    throw new Error("This event type is no longer available.");
  return rows[0];
}

export const getAvailableSlots = createServerFn({ method: "GET" })
  .validator(
    (raw: {
      eventId: string;
      date: string;
      timezone: string;
      rescheduleToken?: string;
    }) => {
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(raw.date) ||
        !Number.isFinite(Date.parse(raw.date)) ||
        new Date(`${raw.date}T12:00:00Z`).toISOString().slice(0, 10) !==
          raw.date
      )
        throw new Error("Invalid date.");
      return {
        eventId: text(raw.eventId, "event ID", 100),
        date: raw.date,
        timezone: timezone(raw.timezone),
        rescheduleToken: raw.rescheduleToken
          ? text(raw.rescheduleToken, "reschedule token", 100)
          : undefined,
      };
    },
  )
  .handler(async ({ data }) => {
    const { event, profile } = await eventContext(data.eventId);
    const base = Date.parse(`${data.date}T00:00:00Z`);
    const now = Date.now();
    if (base > now + 180 * 86400000 || base < now - 2 * 86400000) return [];
    const busy = await db
      .select()
      .from(booking)
      .where(
        and(
          eq(booking.ownerId, event.ownerId),
          eq(booking.status, "confirmed"),
          gt(booking.busyEnd, base - 86400000),
          lt(booking.busyStart, base + 2 * 86400000),
        ),
      );
    let excludedId: string | undefined;
    if (data.rescheduleToken) {
      const previous = busy.find(
        (item) =>
          item.token === data.rescheduleToken && item.eventId === event.id,
      );
      excludedId = previous?.id;
    }
    const slots: number[] = [];
    // Iterate real instants, not wall-clock arithmetic, so DST gaps/folds stay correct.
    for (
      let start = base - 86400000;
      start < base + 2 * 86400000;
      start += 15 * 60000
    ) {
      if (
        start < now + 30 * 60000 ||
        start > now + 180 * 86400000 ||
        dateKey(start, data.timezone) !== data.date ||
        localMinute(start, profile.timezone) % 15 !== 0
      )
        continue;
      const end = start + event.duration * 60000;
      if (!fitsAvailability(start, end, profile)) continue;
      const before = start - profile.bufferBefore * 60000;
      const after = end + profile.bufferAfter * 60000;
      if (
        !busy.some(
          (item) =>
            item.id !== excludedId &&
            before <
              Math.max(item.busyEnd, item.end + profile.bufferAfter * 60000) &&
            after >
              Math.min(
                item.busyStart,
                item.start - profile.bufferBefore * 60000,
              ),
        )
      )
        slots.push(start);
    }
    return slots;
  });

type BookInput = {
  eventId: string;
  start: number;
  guestName: string;
  guestEmail: string;
  guestTimezone: string;
  notes: string;
  rescheduleToken?: string;
};
export const createBooking = createServerFn({ method: "POST" })
  .validator((raw: BookInput) => {
    const guestEmail = text(raw.guestEmail, "email address", 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail))
      throw new Error("Please enter a valid email address.");
    return {
      eventId: text(raw.eventId, "event ID", 100),
      start: integer(raw.start, "start time", 0, Number.MAX_SAFE_INTEGER),
      guestName: text(raw.guestName, "name", 100),
      guestEmail,
      guestTimezone: timezone(raw.guestTimezone),
      notes: text(raw.notes, "notes", 2000, false),
      rescheduleToken: raw.rescheduleToken
        ? text(raw.rescheduleToken, "reschedule token", 100)
        : undefined,
    };
  })
  .handler(async ({ data }) => {
    const { event, profile } = await eventContext(data.eventId);
    const end = data.start + event.duration * 60000;
    if (
      data.start < Date.now() + 30 * 60000 ||
      data.start > Date.now() + 180 * 86400000 ||
      data.start % 60000 !== 0 ||
      localMinute(data.start, profile.timezone) % 15 !== 0 ||
      !fitsAvailability(data.start, end, profile)
    )
      throw new Error(
        "This time is outside the current availability. Choose another slot.",
      );
    const busyStart = data.start - profile.bufferBefore * 60000;
    const busyEnd = end + profile.bufferAfter * 60000;
    let previous: Booking | undefined;
    if (data.rescheduleToken) {
      previous = (
        await db
          .select()
          .from(booking)
          .where(
            and(
              eq(booking.token, data.rescheduleToken),
              eq(booking.eventId, event.id),
              eq(booking.status, "confirmed"),
            ),
          )
      )[0];
      if (!previous || previous.start <= Date.now())
        throw new Error("This booking can no longer be rescheduled.");
    }
    if (previous) {
      const changed = await saveSafely(
        rescheduleBookingIfAvailable(db, previous, {
          start: data.start,
          end,
          busyStart,
          busyEnd,
          guestTimezone: data.guestTimezone,
        }),
      );
      if (!changed.length)
        throw new Error(
          "That slot was just booked or your booking changed. Please choose another time.",
        );
      return changed[0]!;
    }
    const id = crypto.randomUUID();
    const token = crypto.randomUUID();
    const inserted = await saveSafely(
      insertBookingIfAvailable(db, {
        id,
        token,
        ownerId: event.ownerId,
        eventId: event.id,
        title: event.title,
        start: data.start,
        end,
        busyStart,
        busyEnd,
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        guestTimezone: data.guestTimezone,
        notes: data.notes,
        createdAt: Date.now(),
      }),
    );
    if (!inserted.length)
      throw new Error("That slot was just booked. Please choose another time.");
    return inserted[0]!;
  });

export const getBooking = createServerFn({ method: "GET" })
  .validator((raw: { token: string }) => ({
    token: text(raw.token, "booking token", 100),
  }))
  .handler(async ({ data }) => {
    const rows = await db
      .select({
        booking,
        hostName: user.name,
        handle: schedulingProfile.handle,
        slug: eventType.slug,
        active: eventType.active,
      })
      .from(booking)
      .innerJoin(user, eq(booking.ownerId, user.id))
      .innerJoin(
        schedulingProfile,
        eq(booking.ownerId, schedulingProfile.ownerId),
      )
      .innerJoin(eventType, eq(booking.eventId, eventType.id))
      .where(eq(booking.token, data.token));
    return rows[0] || null;
  });

export const cancelBooking = createServerFn({ method: "POST" })
  .validator((raw: { token?: string; id?: string }) => {
    if (!raw.token && !raw.id) throw new Error("Booking required.");
    return {
      token: raw.token ? text(raw.token, "booking token", 100) : undefined,
      id: raw.id ? text(raw.id, "booking ID", 100) : undefined,
    };
  })
  .handler(async ({ data }) => {
    const predicate = data.token
      ? eq(booking.token, data.token)
      : and(
          eq(booking.id, data.id!),
          eq(booking.ownerId, (await requireOwner()).id),
        );
    const result = await saveSafely(
      db
        .update(booking)
        .set({ status: "cancelled" })
        .where(
          and(
            predicate,
            eq(booking.status, "confirmed"),
            gt(booking.start, Date.now()),
          ),
        )
        .returning({ id: booking.id }),
    );
    if (!result.length)
      throw new Error("Booking not found, already cancelled, or in the past.");
    return { success: true };
  });
