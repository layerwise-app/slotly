import { env } from "cloudflare:workers";
import { getRequestUrl } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { db } from "~/db";
import { booking, eventType, schedulingProfile, user } from "~/db/schema";
import {
  guestBookingEmail,
  hostBookingEmail,
  type BookingChange,
  type EmailContent,
} from "~/lib/booking-email-content";
import type { SendEmailInput } from "~/lib/email";

// Call only after the booking write succeeded. Never throws: an email failure
// must not fail or roll back the booking, so problems are logged instead.
export async function sendBookingEmails(
  change: BookingChange,
  bookingId: string,
  previousStart?: number,
) {
  try {
    const row = (
      await db
        .select({
          booking,
          hostName: user.name,
          hostEmail: user.email,
          hostTimezone: schedulingProfile.timezone,
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
        .where(eq(booking.id, bookingId))
    )[0];
    if (!row) return;
    const { booking: item, ...host } = row;
    const details = { ...item, ...host, previousStart };
    const origin = getRequestUrl().origin;
    const sends = [
      send(bookingId, "guest", {
        to: item.guestEmail,
        replyTo: host.hostEmail,
        ...guestBookingEmail(
          change,
          details,
          `${origin}/booking/${item.token}`,
        ),
      }),
    ];
    // Hosts already know about their own cancellations.
    if (!(change === "cancelled" && item.cancelledBy === "host"))
      sends.push(
        send(bookingId, "host", {
          to: host.hostEmail,
          replyTo: item.guestEmail,
          ...hostBookingEmail(
            change,
            details,
            `${origin}/dashboard/bookings?booking=${encodeURIComponent(item.id)}`,
          ),
        }),
      );
    await Promise.all(sends);
  } catch (error) {
    console.warn(
      `[email] booking ${bookingId} ${change}:`,
      error instanceof Error ? error.message : error,
    );
  }
}

async function send(
  bookingId: string,
  recipient: "guest" | "host",
  message: SendEmailInput & EmailContent,
) {
  try {
    const { error } = await env.EMAIL.send(message);
    if (error)
      console.warn(
        `[email] booking ${bookingId} ${recipient}: ${error.code} ${error.message}`,
      );
  } catch (error) {
    console.warn(
      `[email] booking ${bookingId} ${recipient}:`,
      error instanceof Error ? error.message : error,
    );
  }
}
