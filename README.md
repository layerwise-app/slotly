<a href="https://layerwise.app"><picture><source media="(prefers-color-scheme: dark)" srcset="https://layerwise.app/powered-by-dark.png"><img src="https://layerwise.app/powered-by.png" alt="Powered by Layerwise" width="174" height="28"></picture></a>

# Slotly

Slotly is a personal scheduling app for anyone who books meetings with other
people: consultants, coaches, recruiters, freelancers. A host signs up, sets
their weekly hours, and creates event types such as a 30-minute intro call.
Each event type gets a public booking link where guests pick a date and time
in their own timezone and book without an account. Guests get a confirmation
email and a private page to add the booking to their calendar, reschedule, or
cancel; the host gets an email and sees every booking in a dashboard. Try the
live demo at [slotly.layerwise.site](https://slotly.layerwise.site/).

Slotly was built with [Layerwise](https://layerwise.app), and you can open it
in Layerwise to make your own version.

## Pages

- `/`: landing page
- `/demo`: read-only dashboard with sample data, no account needed
- `/sign-up`, `/sign-in`, `/forgot-password`: accounts (email and password, or
  a one-time email code)
- `/dashboard`: overview, plus `/dashboard/events`, `/dashboard/bookings`,
  `/dashboard/availability`, and `/dashboard/settings`
- `/book/{username}/{event-slug}`: public booking page for one event type
- `/booking/{token}`: a guest's private booking page

## Features

- Overview: upcoming/booked/cancelled counts, bookings per week, bookings by
  event type, and a today/next-up agenda.
- Event types: title, description, duration, color (amber, coral, violet, sky,
  rose, slate), visibility, and a live preview of the booking page.
- Per-event rules: minimum notice (default 30 min), booking window (default 180
  days), slot interval (default 15 min), and an optional daily limit. The server
  enforces all of them when listing slots, booking, and rescheduling.
- Per-event location: video link, phone, in person, custom, or none. Public pages
  show only the kind for video/phone; the full value appears on the private
  booking page, in the `.ics` file, and in booking emails.
- Availability: one window per weekday, an IANA timezone, date overrides, and
  before/after buffers. The booking calendar disables days without working hours
  in the guest's timezone; the slot list for a day remains authoritative.
- Bookings: list and calendar views, search and event filter, and a detail sheet
  where the owner can cancel with a reason that the guest sees.
- Guests pick a date, time, and timezone. The private booking page offers `.ics`
  download, rescheduling under the same link, and cancellation with a reason.
- Booking emails (Layerwise Email): guests get a confirmation and notices when
  the booking is rescheduled or cancelled, with the private booking link;
  hosts get notices of new bookings, reschedules, and guest cancellations, with
  a link that opens the booking in the dashboard. Guest emails reply to the
  host's account email and host emails reply to the guest.
- Host photo (Layerwise Storage): uploaded in Settings and shown on public
  booking pages. The file stays private in Storage and is served by
  `/avatars/<ownerId>/<file>` only while it is a host's current photo.
- Calendar sync, payments, and team scheduling are not included.

## Make it yours

| What                                    | Where                                                                                          |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Landing page copy and feature sections  | `src/routes/index.tsx` (`FEATURES`), with the illustrations in `src/components/landing/`       |
| Site title and description              | `src/routes/__root.tsx` and the `head` of each route                                           |
| Name, logo mark, and wordmark           | `src/components/slotly/brand.tsx`; icons in `public/` (`favicon.svg`, `logo.svg`, PNG sizes)  |
| Brand colors, fonts, and radius         | `src/styles/app.css` (`:root` variables such as `--primary`, `--ink`, `--background`)          |
| Event colors                            | `COLORS` in `src/lib/scheduling.ts` and the matching `[data-color="…"]` blocks in `app.css`   |
| Default hours and event rules           | `DEFAULT_WEEK` in `src/lib/scheduling.ts`; rule defaults on `eventType` in `src/db/schema.ts` |
| Demo workspace data                     | `src/components/slotly/demo-data.ts`                                                           |
| Booking email wording                   | `src/lib/booking-email-content.ts`                                                             |
| Accepted host photo types and size      | `AVATAR_TYPES` and `MAX_AVATAR_BYTES` in `src/lib/avatar.functions.ts`                         |
| GitHub link on the landing page         | `REPO_URL` in `src/components/landing/github-button.tsx`                                       |

To add an event color, add its name to `COLORS` in `src/lib/scheduling.ts` and
a `[data-color="name"]` block in `src/styles/app.css` that sets `--event`,
`--event-soft`, and `--event-ink`. The event editor lists every color in
`COLORS`, and the server only accepts those.

Event types themselves are data, not code: sign in and add them under
**Event types** in the dashboard.

## Code map

- `src/routes/`: TanStack Router file routes (pages and the avatar route)
- `src/components/slotly/`: dashboard, booking flow, and shared UI
- `src/lib/scheduling.ts`, `src/lib/open-days.ts`: slot and calendar math
- `src/lib/booking-write.ts`: atomic booking and reschedule statements
- `src/lib/scheduling.functions.ts`, `src/lib/booking.functions.ts`: server
  functions for the dashboard and the public booking flow
- `src/lib/booking-email.ts`, `src/lib/booking-email-content.ts`: booking
  emails through `env.EMAIL` (`src/lib/email.ts`)
- `src/lib/avatar.functions.ts`: host photo through `env.STORAGE`
  (`src/lib/storage.ts`)
- `src/lib/auth.ts`: Better Auth server configuration
- `src/db/schema.ts`: Drizzle schema; `drizzle/` holds generated migrations
- `wrangler.jsonc`: Worker, D1, Storage, and Email bindings

## Commands

Layerwise runs the development server; check `.layerwise/dev-server.log` for
errors.

```bash
pnpm test                               # scheduling and email tests
pnpm check-types                        # TypeScript
pnpm build                              # type check and production build
pnpm db:generate --name <what_changed>  # migration after editing src/db/schema.ts
pnpm db:migrate                         # apply migrations to the local database
pnpm cf-typegen                         # regenerate worker-configuration.d.ts
pnpm auth:generate                      # regenerate Better Auth schema
```

Layerwise applies the same migrations to the production database when you
publish.

Tests need Node.js 22.18+ (native TypeScript stripping and `node:sqlite`).
They cover timezone/date boundaries, DST folds, overrides, buffers, cross-event
overlaps, per-event rules and daily limits, open-day calculation, locations,
calendar files, stale and failed reschedules, cancellations,
inactive/owner-mismatched events, 12 concurrent independent SQLite connections
claiming one slot, and booking email content (guest timezone, HTML escaping,
and location visibility). Tests apply the generated migrations only to
temporary databases.

## Security and data

Every owner server operation checks the Better Auth session and scopes its
query to that owner. TanStack Start's same-origin CSRF middleware protects all
server-function calls. Booking writes use a single `INSERT ... SELECT ... WHERE
NOT EXISTS` statement covering host-wide overlaps, buffers, and the event's
daily limit. Rescheduling uses the same atomic check in an `UPDATE`, excludes
only the original booking, and checks the original start to reject stale
edits, so the old time is released only once the new one is secured.

Private booking URLs contain random UUID tokens: anyone with the link can view
and manage that booking. Those pages are marked `noindex` with a no-referrer
policy. Event types with booking history are kept instead of deleted.

Booking emails are sent only after a booking write succeeds; an email failure is
logged and never fails or rolls back the booking. User-provided values are
escaped in email HTML. In the local preview, email is never sent: it appears
under Email → Local in the Layerwise app. Sign-in codes and password resets go
through `sendAuthEmail` in `src/lib/auth-email.ts`.

Keep secrets server-side: variables prefixed with `VITE_` end up in the browser
bundle. `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `AUTH_EMAIL_URL` belong in
the Worker environment.

See `THIRD_PARTY_NOTICES.md` for third-party licenses.
