import {
  LOCATION_LABELS,
  locationHref,
  type LocationKind,
} from "~/lib/location";
import { formatDate, formatTime } from "~/lib/scheduling";

// Pure builders for booking emails; sending lives in booking-email.ts.

export type BookingChange = "booked" | "rescheduled" | "cancelled";

export type BookingEmailDetails = {
  title: string;
  start: number;
  end: number;
  /** The start before a reschedule. */
  previousStart?: number;
  guestName: string;
  guestEmail: string;
  guestTimezone: string;
  notes: string;
  hostName: string;
  hostTimezone: string;
  locationKind: LocationKind;
  locationValue: string;
  cancelReason: string;
  cancelledBy: "guest" | "host" | null;
};

export type EmailContent = { subject: string; html: string; text: string };

type Row = { label: string; value: string; href?: string };

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

// Subjects must be a single line; names and titles come from user input.
const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();

export function formatWhen(start: number, end: number, zone: string) {
  return `${formatDate(start, zone)}, ${formatTime(start, zone)} – ${formatTime(end, zone)} (${zone.replace(/_/g, " ")})`;
}

function formatStart(start: number, zone: string) {
  return `${formatDate(start, zone)}, ${formatTime(start, zone)}`;
}

/** Full location for private emails; null when there is none to show. */
export function emailLocation(kind: LocationKind, value: string): Row | null {
  if (kind === "none") return null;
  return {
    label: "Where",
    value:
      kind === "video" || kind === "phone"
        ? `${LOCATION_LABELS[kind]}: ${value}`
        : value || LOCATION_LABELS[kind],
    href: locationHref(kind, value),
  };
}

function render(
  subject: string,
  intro: string,
  rows: Row[],
  link: { label: string; url: string },
  note?: string,
): EmailContent {
  const cell = (row: Row) => {
    const value = escapeHtml(row.value).replace(/\n/g, "<br>");
    return row.href
      ? `<a href="${escapeHtml(row.href)}" style="color:#b45309">${value}</a>`
      : value;
  };
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.5;color:#18181b;max-width:560px">
<p style="margin:0 0 16px">${escapeHtml(intro)}</p>
<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px">${rows
    .map(
      (row) =>
        `<tr><td style="padding:4px 16px 4px 0;color:#71717a;vertical-align:top;white-space:nowrap">${escapeHtml(row.label)}</td><td style="padding:4px 0;vertical-align:top">${cell(row)}</td></tr>`,
    )
    .join("")}</table>
<p style="margin:0 0 16px"><a href="${escapeHtml(link.url)}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">${escapeHtml(link.label)}</a></p>${
    note
      ? `\n<p style="margin:0;color:#71717a;font-size:13px">${escapeHtml(note)}</p>`
      : ""
  }
</div>`;
  const text = [
    intro,
    "",
    // Location values already carry the link or number, so hrefs stay in html.
    ...rows.map((row) => `${row.label}: ${row.value}`),
    "",
    `${link.label}: ${link.url}`,
    ...(note ? ["", note] : []),
  ].join("\n");
  return { subject: oneLine(subject), html, text };
}

/** Email to the guest; times use the guest's chosen timezone. */
export function guestBookingEmail(
  change: BookingChange,
  details: BookingEmailDetails,
  manageUrl: string,
): EmailContent {
  const zone = details.guestTimezone;
  const host = details.hostName;
  const what: Row = { label: "What", value: `${details.title} with ${host}` };
  const when: Row = {
    label: "When",
    value: formatWhen(details.start, details.end, zone),
  };
  const where = emailLocation(details.locationKind, details.locationValue);
  const note =
    "Keep this link private. Anyone with it can change your booking.";
  if (change === "cancelled") {
    const reason = details.cancelReason
      ? [{ label: "Reason", value: details.cancelReason }]
      : [];
    return render(
      `Cancelled: ${details.title} with ${host}`,
      details.cancelledBy === "host"
        ? `${host} cancelled your booking.`
        : `Your booking with ${host} is cancelled.`,
      [what, when, ...reason],
      { label: "View booking", url: manageUrl },
    );
  }
  const notes = details.notes ? [{ label: "Notes", value: details.notes }] : [];
  if (change === "rescheduled") {
    const was =
      details.previousStart === undefined
        ? []
        : [{ label: "Was", value: formatStart(details.previousStart, zone) }];
    return render(
      `Rescheduled: ${details.title} with ${host}`,
      `Your booking with ${host} has a new time.`,
      [what, when, ...was, ...(where ? [where] : []), ...notes],
      { label: "Manage booking", url: manageUrl },
      note,
    );
  }
  return render(
    `Confirmed: ${details.title} with ${host}`,
    `You're booked with ${host}. Add it to your calendar, reschedule, or cancel from your booking page.`,
    [what, when, ...(where ? [where] : []), ...notes],
    { label: "Manage booking", url: manageUrl },
    note,
  );
}

/** Email to the host; times use the host's availability timezone. */
export function hostBookingEmail(
  change: BookingChange,
  details: BookingEmailDetails,
  dashboardUrl: string,
): EmailContent {
  const zone = details.hostTimezone;
  const guest = details.guestName;
  const when: Row = {
    label: "When",
    value: formatWhen(details.start, details.end, zone),
  };
  const who: Row = {
    label: "Guest",
    value: `${guest} <${details.guestEmail}>`,
  };
  const link = { label: "View booking", url: dashboardUrl };
  if (change === "cancelled") {
    const reason = details.cancelReason
      ? [{ label: "Reason", value: details.cancelReason }]
      : [];
    return render(
      `Cancelled: ${details.title} with ${guest}`,
      details.cancelledBy === "host"
        ? `You cancelled ${details.title} with ${guest}.`
        : `${guest} cancelled ${details.title}.`,
      [when, who, ...reason],
      link,
    );
  }
  const where = emailLocation(details.locationKind, details.locationValue);
  const notes = details.notes ? [{ label: "Notes", value: details.notes }] : [];
  if (change === "rescheduled") {
    const was =
      details.previousStart === undefined
        ? []
        : [{ label: "Was", value: formatStart(details.previousStart, zone) }];
    return render(
      `Rescheduled: ${details.title} with ${guest}`,
      `${guest} moved ${details.title} to a new time.`,
      [when, ...was, who, ...(where ? [where] : []), ...notes],
      link,
    );
  }
  return render(
    `New booking: ${details.title} with ${guest}`,
    `${guest} booked ${details.title}.`,
    [when, who, ...(where ? [where] : []), ...notes],
    link,
  );
}
