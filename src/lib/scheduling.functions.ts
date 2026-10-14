import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq, desc, notExists } from "drizzle-orm";
import { db } from "~/db";
import { schedulingProfile, eventType, booking } from "~/db/schema";
import { auth } from "~/lib/auth";
import { parseLocation } from "~/lib/location";
import {
  COLORS,
  DEFAULT_WEEK,
  SLOT_INTERVALS,
  slugify,
  type WeekDay,
  type DateOverride,
} from "~/lib/scheduling";
import {
  integer,
  requireOwner,
  saveSafely,
  text,
  timezone,
} from "~/lib/server-input";

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
  minNotice: number;
  bookingWindow: number;
  slotInterval: number;
  dailyLimit: number | null;
  locationKind: string;
  locationValue: string;
};
export const saveEvent = createServerFn({ method: "POST" })
  .validator((raw: EventInput) => {
    const title = text(raw.title, "title", 100);
    const slug = slugify(text(raw.slug || title, "booking URL", 80));
    if (!slug)
      throw new Error("The booking URL must contain letters or numbers.");
    if (
      !COLORS.includes(raw.color) ||
      typeof raw.active !== "boolean" ||
      !SLOT_INTERVALS.includes(raw.slotInterval)
    )
      throw new Error("Invalid event settings.");
    return {
      id: raw.id ? text(raw.id, "event ID", 100) : undefined,
      title,
      slug,
      description: text(raw.description, "description", 2000, false),
      duration: integer(raw.duration, "duration", 5, 480),
      color: raw.color,
      active: raw.active,
      minNotice: integer(raw.minNotice, "minimum notice", 0, 30 * 24 * 60),
      bookingWindow: integer(raw.bookingWindow, "booking window", 1, 365),
      slotInterval: raw.slotInterval,
      dailyLimit:
        raw.dailyLimit === null
          ? null
          : integer(raw.dailyLimit, "daily limit", 1, 50),
      ...parseLocation(raw.locationKind, raw.locationValue),
    };
  })
  .handler(async ({ data }) => {
    const owner = await requireOwner();
    await ensureProfile(owner);
    const { id, ...values } = data;
    if (id) {
      const result = await saveSafely(
        db
          .update(eventType)
          .set(values)
          .where(and(eq(eventType.id, id), eq(eventType.ownerId, owner.id)))
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
            ...values,
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
