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
const { DEFAULT_WEEK, dateKey, localMinute, fitsAvailability, slugify } =
  await import("../src/lib/scheduling.ts");
const { booking, eventType, user } = await import("../src/db/schema.ts");
const { insertBookingIfAvailable, rescheduleBookingIfAvailable } = await import(
  "../src/lib/booking-write.ts"
);

const base = Date.parse("2026-10-12T13:00:00Z");
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
        insertBookingIfAvailable(db, input("first")).all().length,
        1,
      );
      assert.equal(
        insertBookingIfAvailable(
          db,
          input("overlap", base + 15 * 60000, { eventId: "event-a2" }),
        ).all().length,
        0,
      );
      assert.equal(
        insertBookingIfAvailable(db, input("buffer", base + 35 * 60000)).all()
          .length,
        0,
      );
      assert.equal(
        insertBookingIfAvailable(db, input("touch", base + 40 * 60000)).all()
          .length,
        1,
      );
      assert.equal(
        insertBookingIfAvailable(
          db,
          input("other", base, { ownerId: "owner-b", eventId: "event-b" }),
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
      insertBookingIfAvailable(db, input("original")).all();
      insertBookingIfAvailable(db, input("busy", base + 120 * 60000)).all();
      const previous = { id: "original", ownerId: "owner-a", start: base };
      const busy = input("times", base + 120 * 60000);
      const times = {
        start: busy.start,
        end: busy.end,
        busyStart: busy.busyStart,
        busyEnd: busy.busyEnd,
        guestTimezone: "UTC",
      };
      assert.equal(
        rescheduleBookingIfAvailable(db, previous, times).all().length,
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
        rescheduleBookingIfAvailable(db, previous, safe).all().length,
        1,
      );
      assert.equal(
        rescheduleBookingIfAvailable(db, previous, times).all().length,
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
      insertBookingIfAvailable(db, input("original")).all();
      db.update(booking)
        .set({ status: "cancelled" })
        .where(eq(booking.id, "original"))
        .run();
      assert.equal(insertBookingIfAvailable(db, input("new")).all().length, 1);
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
      ).all();
      const start = base + 45 * 60000;
      assert.equal(
        insertBookingIfAvailable(
          db,
          input("new", start, {
            busyStart: start,
            busyEnd: start + 60 * 60000,
          }),
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
        ).all().length,
        0,
      );
      db.update(eventType)
        .set({ active: false })
        .where(eq(eventType.id, "event-a"))
        .run();
      assert.equal(
        insertBookingIfAvailable(db, input("inactive")).all().length,
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
}
