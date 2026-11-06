# Slotly

<a href="https://layerwise.app">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://layerwise.app/powered-by-dark.png" />
    <img src="https://layerwise.app/powered-by.png" alt="Powered by Layerwise" width="320" />
  </picture>
</a>

A focused individual scheduling app inspired by Cal.diy, built on the existing
Layerwise React / TypeScript / TanStack Start / TanStack Query stack. Styling uses
Tailwind and shadcn/ui; authentication uses Better Auth; Drizzle owns the local
and production Cloudflare D1 schema. Publishing targets Cloudflare Workers.

## Scheduling

- Routes: `/` landing, `/demo` read-only preview (no account data),
  `/dashboard` overview, `/dashboard/events`, `/dashboard/bookings`,
  `/dashboard/availability`, `/dashboard/settings`, public
  `/book/{username}/{event-slug}`, and private `/booking/{token}`.
- Overview: upcoming/booked/cancelled counts, bookings per week, bookings by
  event type, and a today/next-up agenda.
- Event types: title, description, duration, color (amber, coral, violet, sky,
  rose, slate), visibility, and a live preview of the booking page.
- Per-event rules: minimum notice (default 30 min), booking window (default 180
  days), slot interval (default 15 min), and an optional daily limit. The server
  enforces all of them when listing slots, booking, and rescheduling.
- Per-event location: video link, phone, in person, custom, or none. Public pages
  show only the kind for video/phone; the full value appears on the private
  confirmation page and in the `.ics` file.
- Availability: one window per weekday, an IANA timezone, date overrides, and
  before/after buffers. The booking calendar disables days without working hours
  in the guest's timezone; the slot list for a day remains authoritative.
- Bookings: list and calendar views, search and event filter, and a detail sheet
  where the owner can cancel with a reason that the guest sees.
- Guests pick a date, time, and timezone. The confirmation page offers `.ics`
  download, rescheduling under the same link, and cancellation with a reason.
- Booking emails (Layerwise Email): guests get a confirmation and notices when
  the booking is rescheduled or cancelled, with the private management link;
  hosts get notices of new bookings, reschedules, and guest cancellations, with
  a link to the booking in the dashboard. Guest emails reply to the host's
  account email and host emails reply to the guest.
- Host photo (Layerwise Storage): uploaded in Settings and shown on public
  booking pages. The file stays private in Storage and is served by
  `/avatars/<ownerId>/<file>` only while it is a host's current photo.
- Calendar sync, payments, and team scheduling are deferred.

## Security And Persistence

Every owner server operation checks a Better Auth session and scopes its query
to the session's owner ID. TanStack Start's same-origin CSRF middleware protects
all server-function RPCs. Booking writes use a single `INSERT ... SELECT ...
WHERE NOT EXISTS` statement, including the host-wide overlapping interval,
buffers, and the event's daily limit. Rescheduling uses the same atomic
predicate in an `UPDATE`, excludes only the original booking, and checks the
original start to reject stale edits.
The old time is not released unless the new time is secured. Existing protected
intervals also respect newly increased buffers.

Confirmation URLs contain random UUID capability tokens. Treat them as private:
anyone with a token can view and manage that booking. These pages are marked
`noindex` with a no-referrer policy. Events with booking history are retained
instead of deleted. React escapes guest-provided content.

Booking confirmation is on-page, with a private management link and `.ics`
download, and is also emailed once the booking is saved. Booking emails are
sent only after a booking write succeeds; an email failure is logged and never
fails or rolls back the booking. Guest emails include the full location like
the confirmation page, and all user-provided values are escaped in HTML. In the
local preview, email appears under Email → Local in the Layerwise app; real
email is sent after publishing. Authentication OTP and
password-reset emails use the existing `sendAuthEmail` integration, with visible
delivery errors and development logging when a provider is not injected.

## Verification

```bash
pnpm run test
pnpm run check-types
pnpm run build
```

Tests require Node.js 22.18+ with native TypeScript stripping and `node:sqlite`.
They cover timezone/date boundaries, DST folds, overrides, buffers, cross-event
overlaps, per-event rules and daily limits, open-day calculation, locations,
calendar files, stale and failed reschedules, cancellations,
inactive/owner-mismatched events, 12 concurrent independent SQLite
connections claiming one slot, and booking email content (guest timezone,
HTML escaping, and location visibility).
Tests apply Drizzle's generated migrations only to isolated temporary databases.

See `THIRD_PARTY_NOTICES.md` for the Cal.diy MIT license and adapted slug utility.

## Layerwise Integration

This is the starter used for new Layerwise projects. It is a full-stack React
app built with TanStack Start and deployed to Cloudflare Workers. The template
includes Better Auth, a D1 database with Drizzle ORM, Tailwind CSS, shadcn/ui,
and the Layerwise preview bridge.

## Commands

Layerwise owns the development server. Do not start, stop, or restart it manually.
Use `.layerwise/dev-server.log` to diagnose development errors.

```bash
pnpm check-types
pnpm build
pnpm auth:generate
pnpm db:generate --name <migration_name>
pnpm db:migrate
pnpm cf-typegen
pnpm release
```

`db:migrate` applies generated Drizzle migrations to the local D1 database.
Layerwise applies the same migrations to the project's production D1 database
during publishing.

## Important files

- `src/routes/`: TanStack Router file routes
- `src/lib/auth.ts`: Better Auth server configuration
- `src/lib/auth.functions.ts`: client-callable server functions
- `src/lib/booking-email.ts`, `src/lib/booking-email-content.ts`: booking
  emails through `env.EMAIL` (`src/lib/email.ts`)
- `src/lib/avatar.functions.ts`: host photo through `env.STORAGE`
  (`src/lib/storage.ts`)
- `src/db/schema.ts`: Drizzle schema
- `vite.config.ts`: Cloudflare, TanStack Start, React, Tailwind, and Layerwise
  plugins
- `wrangler.jsonc`: local Worker, D1, Storage, and Email bindings

Keep secrets server-side. Variables prefixed with `VITE_` are included in the
browser bundle. `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `AUTH_EMAIL_URL`
belong in the Worker environment.
