import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} from "node:worker_threads";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { eq } from "drizzle-orm";

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
const {
  DEFAULT_WEEK,
  availableSlots,
  calendarText,
  dateKey,
  dayRange,
  localMinute,
  fitsAvailability,
  slugify,
} = await import("../src/lib/scheduling.ts");
const { parseLocation, publicLocation } = await import(
  "../src/lib/location.ts"
);
const { bookingOverview, weekOf } = await import("../src/lib/overview.ts");
const { booking, eventType, user } = await import("../src/db/schema.ts");
const { insertBookingIfAvailable, rescheduleBookingIfAvailable } = await import(
  "../src/lib/booking-write.ts"
);

const base = Date.parse("2026-10-12T13:00:00Z");
const DAY = dayRange("2026-10-12", "America/New_York");
function input(id, start = base, overrides = {}) {
  return {
    id,
    token: `token-${id}`,
    ownerId: "owner-a",
    eventId: "event-a",
    title: "A conversation",
    start,
    end: start + 30 * 60000,
    busyStart: start - 5 * 60000,
    busyEnd: start + 35 * 60000,
    guestName: "Test Guest",
    guestEmail: "guest@example.com",
    guestTimezone: "UTC",
    notes: "",
    createdAt: base,
    ...overrides,
  };
}

function fixture(path = ":memory:") {
  const sqlite = new DatabaseSync(path, { timeout: 10000 });
  const db = drizzle({ client: sqlite });
  migrate(db, { migrationsFolder: resolve(root, "drizzle") });
  db.insert(user)
    .values([
      { id: "owner-a", name: "Owner A", email: "a@example.com" },
      { id: "owner-b", name: "Owner B", email: "b@example.com" },
    ])
    .run();
  db.insert(eventType)
    .values([
      {
        id: "event-a",
        ownerId: "owner-a",
        title: "30 minutes",
        slug: "thirty",
        duration: 30,
        createdAt: base,
      },
      {
        id: "event-a2",
        ownerId: "owner-a",
        title: "15 minutes",
        slug: "fifteen",
        duration: 15,
        createdAt: base,
      },
      {
        id: "event-b",
        ownerId: "owner-b",
        title: "Other host",
        slug: "other",
        duration: 30,
        createdAt: base,
      },
    ])
    .run();
  return { db, sqlite };
}

if (!isMainThread) {
  const sqlite = new DatabaseSync(workerData.path, { timeout: 10000 });
  try {
    const result = insertBookingIfAvailable(
      drizzle({ client: sqlite }),
      input(workerData.id),
      DAY,
    ).all();
    parentPort.postMessage({ won: result.length === 1 });
  } catch (error) {
    parentPort.postMessage({ error: error.cause?.message || error.message });
  } finally {
    sqlite.close();
  }
} else {
  test("booking URLs normalize accented names and punctuation", () => {
    assert.equal(slugify("  Café & a little chat!  "), "cafe-a-little-chat");
    assert.equal(slugify("---"), "");
  });
  test("guest dates and host local minutes respect timezone boundaries", () => {
    const instant = Date.parse("2026-10-09T01:00:00Z");
    assert.equal(dateKey(instant, "America/New_York"), "2026-10-08");
    assert.equal(dateKey(instant, "Asia/Shanghai"), "2026-10-09");
    assert.equal(localMinute(instant, "Asia/Kolkata"), 390);
  });
  test("weekly hours reject weekends and meetings beyond closing time", () => {
    const profile = {
      timezone: "America/New_York",
      weekly: DEFAULT_WEEK,
      overrides: [],
    };
    assert.equal(fitsAvailability(base, base + 30 * 60000, profile), true);
    const saturday = Date.parse("2026-10-10T13:00:00Z");
    assert.equal(
      fitsAvailability(saturday, saturday + 30 * 60000, profile),
      false,
    );
    const late = Date.parse("2026-10-12T20:45:00Z");
    assert.equal(fitsAvailability(late, late + 30 * 60000, profile), false);
  });
  test("date overrides replace weekly hours and allow a weekday off", () => {
    const profile = {
      timezone: "America/New_York",
      weekly: DEFAULT_WEEK,
      overrides: [
        { date: "2026-10-12", unavailable: true, start: "09:00", end: "17:00" },
      ],
    };
    assert.equal(fitsAvailability(base, base + 30 * 60000, profile), false);
    profile.overrides = [
      { date: "2026-10-10", unavailable: false, start: "09:00", end: "12:00" },
    ];
    const saturday = Date.parse("2026-10-10T13:00:00Z");
    assert.equal(
      fitsAvailability(saturday, saturday + 30 * 60000, profile),
      true,
    );
  });
  test("DST transitions use real instants and local weekly hours", () => {
    const profile = {
      timezone: "America/New_York",
      weekly: DEFAULT_WEEK,
      overrides: [],
    };
    const before = Date.parse("2026-10-30T13:00:00Z");
    const after = Date.parse("2026-11-02T14:00:00Z");
    assert.equal(localMinute(before, profile.timezone), 540);
    assert.equal(localMinute(after, profile.timezone), 540);
    assert.equal(fitsAvailability(after, after + 30 * 60000, profile), true);
    assert.equal(fitsAvailability(after - 60 * 60000, after, profile), false);
  });
  test("a DST fold cannot slip through a narrow availability window", () => {
    const profile = {
      timezone: "America/New_York",
      weekly: DEFAULT_WEEK,
      overrides: [
        {
          date: "2026-11-01",
          unavailable: false,
          start: "01:30",
          end: "02:30",
        },
      ],
    };
    assert.equal(
      fitsAvailability(
        Date.parse("2026-11-01T05:30:00Z"),
        Date.parse("2026-11-01T07:30:00Z"),
        profile,
      ),
      false,
    );
  });
  test("overlap prevention covers different event types and buffers, but not other hosts", () => {
    const { db, sqlite } = fixture();
    try {
      assert.equal(
        insertBookingIfAvailable(db, input("first"), DAY).all().length,
        1,
      );
      assert.equal(
        insertBookingIfAvailable(
          db,
          input("overlap", base + 15 * 60000, { eventId: "event-a2" }),
          DAY,
        ).all().length,
        0,
      );
      assert.equal(
        insertBookingIfAvailable(db, input("buffer", base + 35 * 60000), DAY).all()
          .length,
        0,
      );
      assert.equal(
        insertBookingIfAvailable(db, input("touch", base + 40 * 60000), DAY).all()
          .length,
        1,
      );
      assert.equal(
        insertBookingIfAvailable(
          db,
          input("other", base, { ownerId: "owner-b", eventId: "event-b" }),
          DAY,
        ).all().length,
        1,
      );
    } finally {
      sqlite.close();
    }
  });
  test("failed rescheduling preserves the original booking; stale reschedules cannot overwrite", () => {
    const { db, sqlite } = fixture();
    try {
      insertBookingIfAvailable(db, input("original"), DAY).all();
      insertBookingIfAvailable(db, input("busy", base + 120 * 60000), DAY).all();
      const previous = {
        id: "original",
        ownerId: "owner-a",
        eventId: "event-a",
        start: base,
      };
      const busy = input("times", base + 120 * 60000);
      const times = {
        start: busy.start,
        end: busy.end,
        busyStart: busy.busyStart,
        busyEnd: busy.busyEnd,
        guestTimezone: "UTC",
      };
      assert.equal(
        rescheduleBookingIfAvailable(db, previous, times, DAY).all().length,
        0,
      );
      assert.equal(
        db.select().from(booking).where(eq(booking.id, "original")).get().start,
        base,
      );
      const next = input("next", base + 60 * 60000);
      const safe = {
        start: next.start,
        end: next.end,
        busyStart: next.busyStart,
        busyEnd: next.busyEnd,
        guestTimezone: "UTC",
      };
      assert.equal(
        rescheduleBookingIfAvailable(db, previous, safe, DAY).all().length,
        1,
      );
      assert.equal(
        rescheduleBookingIfAvailable(db, previous, times, DAY).all().length,
        0,
      );
      assert.equal(
        db.select().from(booking).where(eq(booking.id, "original")).get().start,
        next.start,
      );
    } finally {
      sqlite.close();
    }
  });
  test("cancelled bookings release their protected interval", () => {
    const { db, sqlite } = fixture();
    try {
      insertBookingIfAvailable(db, input("original"), DAY).all();
      db.update(booking)
        .set({ status: "cancelled" })
        .where(eq(booking.id, "original"))
        .run();
      assert.equal(insertBookingIfAvailable(db, input("new"), DAY).all().length, 1);
    } finally {
      sqlite.close();
    }
  });
  test("increasing buffers also protects meetings booked under older buffer settings", () => {
    const { db, sqlite } = fixture();
    try {
      insertBookingIfAvailable(
        db,
        input("first", base, { busyStart: base, busyEnd: base + 30 * 60000 }),
        DAY,
      ).all();
      const start = base + 45 * 60000;
      assert.equal(
        insertBookingIfAvailable(
          db,
          input("new", start, {
            busyStart: start,
            busyEnd: start + 60 * 60000,
          }),
          DAY,
        ).all().length,
        0,
      );
    } finally {
      sqlite.close();
    }
  });
  test("disabled events and owner-mismatched event IDs cannot accept bookings", () => {
    const { db, sqlite } = fixture();
    try {
      assert.equal(
        insertBookingIfAvailable(
          db,
          input("mismatch", base, { ownerId: "owner-b" }),
          DAY,
        ).all().length,
        0,
      );
      db.update(eventType)
        .set({ active: false })
        .where(eq(eventType.id, "event-a"))
        .run();
      assert.equal(
        insertBookingIfAvailable(db, input("inactive"), DAY).all().length,
        0,
      );
    } finally {
      sqlite.close();
    }
  });
  test("12 concurrent connections competing for a slot produce exactly one booking", async () => {
    const directory = mkdtempSync(resolve(tmpdir(), "slotly-booking-test-"));
    const path = resolve(directory, "concurrency.sqlite");
    const { sqlite } = fixture(path);
    sqlite.close();
    try {
      const outcomes = await Promise.all(
        Array.from(
          { length: 12 },
          (_, index) =>
            new Promise((resolveResult, reject) => {
              const worker = new Worker(new URL(import.meta.url), {
                workerData: { path, id: `concurrent-${index}` },
              });
              worker.once("message", resolveResult);
              worker.once("error", reject);
              worker.once("exit", (code) => {
                if (code !== 0) reject(new Error(`Worker exited with ${code}`));
              });
            }),
        ),
      );
      assert.deepEqual(
        outcomes.filter((result) => result.error),
        [],
      );
      assert.equal(outcomes.filter((result) => result.won).length, 1);
      const check = new DatabaseSync(path);
      assert.equal(
        drizzle({ client: check }).select().from(booking).all().length,
        1,
      );
      check.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("host-local day ranges follow DST and half-hour offsets", () => {
    const hours = ({ start, end }) => (end - start) / 3600000;
    assert.equal(hours(dayRange("2026-10-12", "America/New_York")), 24);
    assert.equal(hours(dayRange("2026-11-01", "America/New_York")), 25);
    assert.equal(hours(dayRange("2026-03-08", "America/New_York")), 23);
    assert.equal(
      dayRange("2026-10-12", "Asia/Kolkata").start,
      Date.parse("2026-10-11T18:30:00Z"),
    );
  });
  test("slot lists apply notice, booking window, interval, buffers, and daily limits", () => {
    const profile = {
      timezone: "America/New_York",
      weekly: DEFAULT_WEEK,
      overrides: [],
      bufferBefore: 0,
      bufferAfter: 0,
    };
    const event = {
      duration: 30,
      minNotice: 60,
      bookingWindow: 30,
      slotInterval: 30,
      dailyLimit: null,
    };
    const slots = (overrides = {}) =>
      availableSlots({
        date: "2026-10-12",
        timezone: "America/New_York",
        now: base,
        event,
        profile,
        busy: [],
        ...overrides,
      });
    const all = slots();
    assert.equal(all.length, 14);
    assert.equal(all[0], Date.parse("2026-10-12T14:00:00Z"));
    assert.equal(
      slots({ event: { ...event, slotInterval: 60 } }).length,
      7,
    );
    assert.deepEqual(
      slots({ now: Date.parse("2026-10-01T13:00:00Z"), event: { ...event, bookingWindow: 5 } }),
      [],
    );
    const busy = [
      {
        id: "busy",
        start: all[0],
        end: all[0] + 30 * 60000,
        busyStart: all[0],
        busyEnd: all[0] + 30 * 60000,
      },
    ];
    assert.equal(slots({ busy })[0], all[1]);
    const booked = [
      { id: "one", start: all[3] },
      { id: "two", start: all[5] },
    ];
    const limited = { ...event, dailyLimit: 2 };
    assert.deepEqual(slots({ event: limited, booked }), []);
    assert.equal(
      slots({ event: limited, booked, excludedId: "two" }).length,
      14,
    );
  });
  test("daily limits are enforced atomically per event type and host day", () => {
    const { db, sqlite } = fixture();
    try {
      db.update(eventType)
        .set({ dailyLimit: 1 })
        .where(eq(eventType.id, "event-a"))
        .run();
      const later = base + 120 * 60000;
      assert.equal(insertBookingIfAvailable(db, input("first"), DAY).all().length, 1);
      assert.equal(
        insertBookingIfAvailable(db, input("second", later), DAY).all().length,
        0,
      );
      assert.equal(
        insertBookingIfAvailable(
          db,
          input("other-event", later, { eventId: "event-a2" }),
          DAY,
        ).all().length,
        1,
      );
      const tomorrow = base + 86400000;
      assert.equal(
        insertBookingIfAvailable(
          db,
          input("tomorrow", tomorrow),
          dayRange("2026-10-13", "America/New_York"),
        ).all().length,
        1,
      );
      const move = input("move", base + 240 * 60000);
      assert.equal(
        rescheduleBookingIfAvailable(
          db,
          { id: "first", ownerId: "owner-a", eventId: "event-a", start: base },
          {
            start: move.start,
            end: move.end,
            busyStart: move.busyStart,
            busyEnd: move.busyEnd,
            guestTimezone: "UTC",
          },
          DAY,
        ).all().length,
        1,
      );
      db.update(booking)
        .set({ status: "cancelled" })
        .where(eq(booking.id, "first"))
        .run();
      assert.equal(
        insertBookingIfAvailable(
          db,
          input("after-cancel", base + 360 * 60000),
          DAY,
        ).all().length,
        1,
      );
    } finally {
      sqlite.close();
    }
  });
  test("locations are validated, and private ones stay off public pages", () => {
    assert.deepEqual(parseLocation("video", " https://meet.example.com/abc "), {
      locationKind: "video",
      locationValue: "https://meet.example.com/abc",
    });
    assert.throws(() => parseLocation("video", "javascript:alert(1)"));
    assert.throws(() => parseLocation("video", "meet.example.com"));
    assert.throws(() => parseLocation("phone", "call me"));
    assert.equal(parseLocation("phone", "+1 (415) 555-0100").locationKind, "phone");
    assert.throws(() => parseLocation("in_person", "  "));
    assert.throws(() => parseLocation("teleport", "Mars"));
    assert.deepEqual(parseLocation("none", "ignored"), {
      locationKind: "none",
      locationValue: "",
    });
    assert.equal(publicLocation("video", "https://meet.example.com/abc"), "");
    assert.equal(publicLocation("phone", "+14155550100"), "");
    assert.equal(publicLocation("in_person", "12 Main St"), "12 Main St");
  });
  test("calendar files carry an escaped location and a stable non-secret UID", () => {
    const text = calendarText(
      {
        id: "booking-1",
        title: "Intro, call",
        start: base,
        end: base + 30 * 60000,
        location: "12 Main St; Suite 4",
      },
      base,
    );
    assert.match(text, /\r\nLOCATION:12 Main St\\; Suite 4\r\n/);
    assert.match(text, /\r\nUID:booking-1@slotly\r\n/);
    assert.match(text, /\r\nSUMMARY:Intro\\, call\r\n/);
    assert.doesNotMatch(
      calendarText({ id: "b", title: "T", start: base, end: base }, base),
      /LOCATION/,
    );
  });
  test("overview buckets bookings by local week and splits today from what is next", () => {
    const zone = "America/New_York";
    assert.equal(weekOf(base, zone), "2026-10-12");
    assert.equal(weekOf(Date.parse("2026-10-12T02:00:00Z"), zone), "2026-10-05");
    const day = 86400000;
    const item = (eventId, start, createdAt, status = "confirmed") => ({
      eventId,
      start,
      createdAt,
      status,
    });
    const result = bookingOverview(
      [
        item("a", base + 2 * 3600000, base - day),
        item("a", base + 2 * day, base),
        item("b", base + 3 * day, base - 7 * day),
        item("b", base + 4 * day, base - 7 * day, "cancelled"),
        item("a", base + 5 * day, base - 70 * day),
      ],
      base,
      zone,
    );
    assert.equal(result.weekly.length, 8);
    assert.equal(result.weekly.at(-1).week, "2026-10-12");
    assert.deepEqual(
      result.weekly.slice(-2).map((week) => [week.confirmed, week.cancelled]),
      [
        [2, 1],
        [1, 0],
      ],
    );
    assert.equal(result.booked, 3);
    assert.equal(result.cancelled, 1);
    assert.equal(result.byEvent.get("a"), 2);
    assert.equal(result.upcoming, 4);
    assert.equal(result.today.length, 1);
    assert.equal(result.next.length, 3);
  });

  test("open days follow weekly hours, overrides, notice, and the guest's zone", async () => {
    const { openDays } = await import("../src/lib/open-days.ts");
    const profile = {
      timezone: "America/New_York",
      weekly: DEFAULT_WEEK,
      overrides: [{ date: "2026-10-21", unavailable: true, start: "09:00", end: "17:00" }],
    };
    const event = { duration: 30, minNotice: 0, bookingWindow: 30 };
    // Monday Oct 12, 2026 at 06:00 New York.
    const now = Date.parse("2026-10-12T10:00:00Z");
    const days = openDays({ month: "2026-10", timezone: "America/New_York", now, event, profile });
    assert.ok(days.has("2026-10-12") && days.has("2026-10-16"));
    assert.ok(!days.has("2026-10-17") && !days.has("2026-10-18"), "weekend");
    assert.ok(!days.has("2026-10-21"), "unavailable override");
    assert.ok(!days.has("2026-10-11"), "before now");
    // Late notice pushes today past the working day.
    const late = openDays({ month: "2026-10", timezone: "America/New_York", now, event: { ...event, minNotice: 720 }, profile });
    assert.ok(!late.has("2026-10-12") && late.has("2026-10-13"));
    // In Tokyo, New York's Friday afternoon is already Saturday; Sunday stays closed.
    const tokyo = openDays({ month: "2026-10", timezone: "Asia/Tokyo", now, event, profile });
    assert.ok(tokyo.has("2026-10-17") && !tokyo.has("2026-10-18"));
    // The booking window ends on Nov 11; days past it stay closed.
    const november = openDays({ month: "2026-11", timezone: "America/New_York", now, event, profile });
    assert.ok(november.has("2026-11-10") && !november.has("2026-11-12"));
  });
}
