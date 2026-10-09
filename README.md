# Slotly

A focused individual scheduling app inspired by Cal.diy, built on the existing
Layerwise React / TypeScript / TanStack Start / TanStack Query stack. Styling uses
Tailwind and shadcn/ui; authentication uses Better Auth; Drizzle owns the local
and production Cloudflare D1 schema. Publishing targets Cloudflare Workers.

## Scheduling

- `/` is the public landing page for signed-out and signed-in visitors alike.
  `/demo` is an isolated, read-only preview that never fetches account data.
  `/dashboard` contains the owner's event types; `/dashboard/bookings`,
  `/dashboard/availability`, and `/dashboard/settings` are authenticated pages.
- Create event types with a title, description, duration, color, visibility,
  and `/book/{username}/{event-slug}` booking URL.
- Availability supports one time window per weekday, an IANA timezone, date
  overrides, and before/after buffers. Slots are on a 15-minute grid with a
  30-minute minimum notice and a 180-day booking horizon.
- Guests choose a date, time, timezone, and details. Confirmation pages support
  calendar-file download, cancellation, and atomic rescheduling.
- The owner can search upcoming, past, and cancelled bookings in list/calendar
  views. No guest or private booking data is exposed by public event/slot queries.
- Calendar sync, payments, video integrations, and team scheduling are deferred.

## Security And Persistence

Every owner server operation checks a Better Auth session and scopes its query
to the session's owner ID. TanStack Start's same-origin CSRF middleware protects
all server-function RPCs. Booking writes use a single `INSERT ... SELECT ...
WHERE NOT EXISTS` statement, including the host-wide overlapping interval and
buffers. Rescheduling uses the same atomic predicate in an `UPDATE`, excludes
only the original booking, and checks the original start to reject stale edits.
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
overlaps, stale and failed reschedules, cancellations, inactive/owner-mismatched
events, and 12 concurrent independent SQLite connections claiming one slot.
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
