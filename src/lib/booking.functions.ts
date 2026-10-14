import { createServerFn } from "@tanstack/react-start";
import { and, eq, lt, gt, gte } from "drizzle-orm";
import { db } from "~/db";
import { schedulingProfile, eventType, booking, user } from "~/db/schema";
import {
  insertBookingIfAvailable,
  rescheduleBookingIfAvailable,
} from "~/lib/booking-write";
import { publicLocation } from "~/lib/location";
import {
  availableSlots,
  dateKey,
  dayRange,
  slotAllowed,
} from "~/lib/scheduling";
import type { Booking } from "~/lib/scheduling.functions";
import {
  integer,
  requireOwner,
  saveSafely,
  text,
  timezone,
} from "~/lib/server-input";

// Public booking flow: anyone with the booking link or a private token.

export const getPublicEvent = createServerFn({ method: "GET" })
  .validator((raw: { handle: string; slug: string }) => ({
    handle: text(raw.handle, "username", 80),
    slug: text(raw.slug, "event URL", 80),
  }))
  .handler(async ({ data }) => {
    const rows = await db
      .select({
        event: {
          id: eventType.id,
          title: eventType.title,
          slug: eventType.slug,
          description: eventType.description,
          duration: eventType.duration,
          color: eventType.color,
          minNotice: eventType.minNotice,
          bookingWindow: eventType.bookingWindow,
          locationKind: eventType.locationKind,
          locationValue: eventType.locationValue,
        },
        name: user.name,
        image: user.image,
        handle: schedulingProfile.handle,
        timezone: schedulingProfile.timezone,
        bio: schedulingProfile.bio,
        weekly: schedulingProfile.weekly,
        overrides: schedulingProfile.overrides,
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
    const row = rows[0];
    if (!row) return null;
    const { locationKind, locationValue } = row.event;
    // Working hours only mark open days on the calendar; slot lists already
    // reveal them. Past overrides are dropped.
    const yesterday = dateKey(Date.now() - 86400000, row.timezone);
    return {
      ...row,
      overrides: row.overrides.filter((item) => item.date >= yesterday),
      event: {
        ...row.event,
        locationValue: publicLocation(locationKind, locationValue),
      },
    };
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
    if (
      base > now + event.bookingWindow * 86400000 ||
      base < now - 2 * 86400000
    )
      return [];
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
    // Host-local days around the guest's date can span up to ~2.5 UTC days.
    const booked =
      event.dailyLimit === null
        ? []
        : await db
            .select({ id: booking.id, start: booking.start })
            .from(booking)
            .where(
              and(
                eq(booking.eventId, event.id),
                eq(booking.status, "confirmed"),
                gte(booking.start, base - 2 * 86400000),
                lt(booking.start, base + 3 * 86400000),
              ),
            );
    const excludedId = data.rescheduleToken
      ? busy.find(
          (item) =>
            item.token === data.rescheduleToken && item.eventId === event.id,
        )?.id
      : undefined;
    return availableSlots({
      date: data.date,
      timezone: data.timezone,
      now,
      event,
      profile,
      busy,
      booked,
      excludedId,
    });
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
    if (!slotAllowed(data.start, Date.now(), event, profile))
      throw new Error(
        "This time is outside the current availability. Choose another slot.",
      );
    const day = dayRange(dateKey(data.start, profile.timezone), profile.timezone);
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
        rescheduleBookingIfAvailable(
          db,
          previous,
          {
            start: data.start,
            end,
            busyStart,
            busyEnd,
            guestTimezone: data.guestTimezone,
          },
          day,
        ),
      );
      if (!changed.length)
        throw new Error(
          "That time was just taken or your booking changed. Please choose another time.",
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
      }, day),
    );
    if (!inserted.length)
      throw new Error("That time was just taken. Please choose another time.");
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
        color: eventType.color,
        locationKind: eventType.locationKind,
        locationValue: eventType.locationValue,
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
  .validator((raw: { token?: string; id?: string; reason?: string }) => {
    if (!raw.token && !raw.id) throw new Error("Booking required.");
    return {
      token: raw.token ? text(raw.token, "booking token", 100) : undefined,
      id: raw.id ? text(raw.id, "booking ID", 100) : undefined,
      reason: text(raw.reason ?? "", "reason", 500, false),
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
        .set({
          status: "cancelled",
          cancelReason: data.reason,
          cancelledBy: data.token ? "guest" : "host",
          cancelledAt: Date.now(),
        })
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
