import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("~/"))
      return nextResolve(
        pathToFileURL(resolve(root, "src", `${specifier.slice(2)}.ts`)).href,
        context,
      );
    return nextResolve(specifier, context);
  },
});
const { escapeHtml, guestBookingEmail, hostBookingEmail } =
  await import("../src/lib/booking-email-content.ts");

// 2026-10-12 13:00 UTC = 9:00 AM New York = 10:00 PM Tokyo.
const start = Date.parse("2026-10-12T13:00:00Z");
function details(overrides = {}) {
  return {
    title: "Intro call",
    start,
    end: start + 30 * 60000,
    guestName: "Ada",
    guestEmail: "ada@example.com",
    guestTimezone: "Asia/Tokyo",
    notes: "",
    hostName: "Sam",
    hostTimezone: "America/New_York",
    locationKind: "video",
    locationValue: "https://meet.example.com/abc",
    cancelReason: "",
    cancelledBy: null,
    ...overrides,
  };
}
const MANAGE = "https://slotly.example/booking/token-1";
const DASHBOARD = "https://slotly.example/dashboard/bookings?booking=b1";

test("guest email uses the guest's timezone and host email the host's", () => {
  const guest = guestBookingEmail("booked", details(), MANAGE);
  assert.match(
    guest.text,
    /Monday, October 12, 2026, 10:00 PM – 10:30 PM \(Asia\/Tokyo\)/,
  );
  assert.equal(guest.subject, "Confirmed: Intro call with Sam");
  const host = hostBookingEmail("booked", details(), DASHBOARD);
  assert.match(
    host.text,
    /Monday, October 12, 2026, 9:00 AM – 9:30 AM \(America\/New York\)/,
  );
  assert.equal(host.subject, "New booking: Intro call with Ada");
});

test("guest email shows the private link and full location", () => {
  const email = guestBookingEmail("booked", details(), MANAGE);
  assert.ok(email.text.includes(MANAGE));
  assert.ok(email.html.includes(`href="${MANAGE}"`));
  assert.match(
    email.text,
    /Where: Video call: https:\/\/meet\.example\.com\/abc/,
  );
  assert.ok(email.html.includes('href="https://meet.example.com/abc"'));
  const phone = guestBookingEmail(
    "booked",
    details({ locationKind: "phone", locationValue: "+1 555 010 2000" }),
    MANAGE,
  );
  assert.ok(phone.html.includes('href="tel:+15550102000"'));
  const none = guestBookingEmail(
    "booked",
    details({ locationKind: "none", locationValue: "" }),
    MANAGE,
  );
  assert.doesNotMatch(none.text, /Where:/);
});

test("cancellation emails hide the location and include the reason", () => {
  const host = details({ cancelledBy: "host", cancelReason: "Out sick" });
  const email = guestBookingEmail("cancelled", host, MANAGE);
  assert.equal(email.subject, "Cancelled: Intro call with Sam");
  assert.match(email.text, /^Sam cancelled your booking\./);
  assert.match(email.text, /Reason: Out sick/);
  assert.doesNotMatch(email.text, /Where:|meet\.example/);
  const guest = hostBookingEmail(
    "cancelled",
    details({ cancelledBy: "guest", cancelReason: "Conflict" }),
    DASHBOARD,
  );
  assert.match(guest.text, /^Ada cancelled Intro call\./);
  assert.match(guest.text, /Reason: Conflict/);
  assert.ok(guest.text.includes(DASHBOARD));
});

test("reschedule emails show the new and previous times", () => {
  const moved = details({
    start: start + 86400000,
    end: start + 86400000 + 30 * 60000,
    previousStart: start,
  });
  const guest = guestBookingEmail("rescheduled", moved, MANAGE);
  assert.match(guest.text, /When: Tuesday, October 13, 2026, 10:00 PM/);
  assert.match(guest.text, /Was: Monday, October 12, 2026, 10:00 PM/);
  const host = hostBookingEmail("rescheduled", moved, DASHBOARD);
  assert.match(host.text, /Was: Monday, October 12, 2026, 9:00 AM/);
});

test("user-provided values are escaped in html and subjects stay on one line", () => {
  const email = hostBookingEmail(
    "booked",
    details({
      guestName: '<script>alert("x")</script>',
      title: "Tea &\r\nBcc: evil@example.com",
      notes: "line 1\n<b>line 2</b>",
      locationKind: "in_person",
      locationValue: `5 Main St" onclick="x`,
    }),
    DASHBOARD,
  );
  assert.doesNotMatch(email.html, /<script>|<b>|" onclick="/);
  assert.ok(
    email.html.includes("&#60;script&#62;alert(&#34;x&#34;)&#60;/script&#62;"),
  );
  assert.ok(email.html.includes("line 1<br>&#60;b&#62;line 2&#60;/b&#62;"));
  assert.doesNotMatch(email.subject, /[\r\n]/);
  assert.equal(
    email.subject,
    'New booking: Tea & Bcc: evil@example.com with <script>alert("x")</script>',
  );
  assert.equal(escapeHtml(`&<>"'`), "&#38;&#60;&#62;&#34;&#39;");
});
