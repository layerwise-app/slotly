# Slotly

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
- Calendar sync, payments, booking emails, and team scheduling are deferred.

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
download. It does not claim to send booking emails. Authentication OTP and
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
inactive/owner-mismatched events, and 12 concurrent independent SQLite
connections claiming one slot.
Tests apply Drizzle's generated migrations only to isolated temporary databases.

See `THIRD_PARTY_NOTICES.md` for the Cal.diy MIT license and adapted slug utility.

## Layerwise Integration

<a href="https://layerwise.app"><img src="https://layerwise.app/powered-by.png" alt="Powered by Layerwise" width="320" /></a>

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
- `src/db/schema.ts`: Drizzle schema
- `vite.config.ts`: Cloudflare, TanStack Start, React, Tailwind, and Layerwise
  plugins
- `wrangler.jsonc`: local Worker and D1 bindings

Keep secrets server-side. Variables prefixed with `VITE_` are included in the
browser bundle. `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `AUTH_EMAIL_URL`
belong in the Worker environment.
