import type { Booking, EventType, Profile } from "~/lib/scheduling.functions";
import { DEFAULT_WEEK, dateKey, dayStart } from "~/lib/scheduling";

const RULES = {
  ownerId: "demo",
  active: true,
  minNotice: 60,
  bookingWindow: 60,
  slotInterval: 30,
  dailyLimit: null,
} as const;

export const DEMO_EVENTS: EventType[] = [
  {
    ...RULES,
    id: "demo-intro",
    title: "Intro call",
    slug: "intro-call",
    description: "A quick first conversation to see if we're a fit.",
    duration: 20,
    color: "amber",
    locationKind: "video",
    locationValue: "https://meet.example.com/slotly-demo",
    createdAt: 1,
  },
  {
    ...RULES,
    id: "demo-strategy",
    title: "Strategy session",
    slug: "strategy-session",
    description: "Bring a problem; leave with a plan.",
    duration: 50,
    color: "violet",
    locationKind: "video",
    locationValue: "https://meet.example.com/slotly-demo",
    dailyLimit: 2,
    createdAt: 2,
  },
  {
    ...RULES,
    id: "demo-coffee",
    title: "Coffee chat",
    slug: "coffee-chat",
    description: "",
    duration: 30,
    color: "coral",
    locationKind: "in_person",
    locationValue: "Blue Bottle, 54 W 40th St, New York",
    minNotice: 1440,
    createdAt: 3,
  },
];

export const DEMO_PROFILE: Profile = {
  ownerId: "demo",
  handle: "alex",
  bio: "Product designer. Happy to talk shop.",
  timezone: "America/New_York",
  weekly: DEFAULT_WEEK,
  overrides: [],
  bufferBefore: 0,
  bufferAfter: 10,
};

const GUESTS = [
  ["Maya Chen", "maya@northwind.co", "America/Los_Angeles"],
  ["Jonas Weber", "jonas@kleinwerk.de", "Europe/Berlin"],
  ["Priya Raman", "priya@lumen.studio", "Asia/Kolkata"],
  ["Sam Okafor", "sam@fieldnotes.io", "Europe/London"],
  ["Lucía Ortega", "lucia@marea.mx", "America/Mexico_City"],
  ["Ethan Brooks", "ethan@brooks.dev", "America/New_York"],
  ["Hana Sato", "hana@kumo.jp", "Asia/Tokyo"],
] as const;

const HOUR = 3600000;
const DAY = 24 * HOUR;

// Deterministic sample history around `now`, so the demo overview has shape.
export function demoBookings(now: number): Booking[] {
  const zone = DEMO_PROFILE.timezone;
  const items: Booking[] = [];
  let seed = 11;
  const next = () => (seed = (seed * 48271) % 2147483647);
  for (let offset = -55; offset <= 12; offset += 1) {
    const day = dateKey(now + offset * DAY, zone);
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    const count = offset === 0 ? 3 : next() % (offset < 0 ? 3 : 2);
    for (let index = 0; index < count; index += 1) {
      const event = DEMO_EVENTS[next() % DEMO_EVENTS.length]!;
      const guest = GUESTS[next() % GUESTS.length]!;
      const start = dayStart(day, zone) + (9 + index * 3 + (next() % 2)) * HOUR;
      const createdAt = Math.min(start - (1 + (next() % 6)) * DAY, now - HOUR);
      const cancelled = next() % 8 === 0;
      items.push({
        id: `demo-booking-${items.length}`,
        token: `demo-${items.length}`,
        ownerId: "demo",
        eventId: event.id,
        title: event.title,
        start,
        end: start + event.duration * 60000,
        busyStart: start,
        busyEnd: start + event.duration * 60000,
        guestName: guest[0],
        guestEmail: guest[1],
        guestTimezone: guest[2],
        notes: index === 0 ? "Would love to talk through onboarding." : "",
        status: cancelled ? "cancelled" : "confirmed",
        createdAt,
        cancelReason: cancelled ? "Something came up, sorry!" : "",
        cancelledBy: cancelled ? "guest" : null,
        cancelledAt: cancelled ? createdAt + HOUR : null,
      });
    }
  }
  return items.sort((a, b) => b.start - a.start);
}
