import { test } from "node:test";
import assert from "node:assert/strict";
import { computeAvailability, lockIdsFor, subtract, localMinutesToUtc } from "./availability.ts";

const hours = [{ day: 4, open: 9 * 60, close: 13 * 60, breaks: [{ start: 11 * 60, end: 11 * 60 + 30 }] }]; // Thursday
const date = "2026-11-19"; // a Thursday

test("local Tunis minutes convert to UTC (UTC+1)", () => {
  assert.equal(new Date(localMinutesToUtc(date, 9 * 60)).toISOString(), "2026-11-19T08:00:00.000Z");
});

test("subtract splits intervals", () => {
  assert.deepEqual(subtract([{ start: 0, end: 10 }], [{ start: 3, end: 5 }]), [{ start: 0, end: 3 }, { start: 5, end: 10 }]);
});

test("slots respect breaks, bookings and notice", () => {
  const slots = computeAvailability({
    date,
    centerHours: hours,
    employees: [{ id: "e1", workingHours: hours }],
    busy: [{ employeeId: "e1", start: "2026-11-19T08:30:00.000Z", end: "2026-11-19T09:00:00.000Z" }], // 09:30–10:00 local
    durationMin: 45,
    stepMin: 15,
    minNoticeMin: 0,
    now: new Date("2026-11-19T00:00:00Z"),
  });
  const local = slots.map((s) => new Date(Date.parse(s.start) + 3600_000).toISOString().slice(11, 16));
  // 09:00 fails (would overlap the 09:30 booking), 10:00 and 10:15 fit before the 11:00 break, 11:30..12:15 after it.
  assert.deepEqual(local, ["10:00", "10:15", "11:30", "11:45", "12:00", "12:15"]);
});

test("any-employee slots merge employee ids", () => {
  const slots = computeAvailability({
    date, centerHours: hours,
    employees: [{ id: "a", workingHours: hours }, { id: "b", workingHours: hours }],
    busy: [], durationMin: 30, minNoticeMin: 0, now: new Date("2026-11-19T00:00:00Z"),
  });
  assert.deepEqual(slots[0].employeeIds.sort(), ["a", "b"]);
});

test("lock ids cover every 5-minute granule", () => {
  const ids = lockIdsFor("e1", new Date("2026-11-19T08:00:00Z"), new Date("2026-11-19T08:20:00Z"));
  assert.equal(ids.length, 4);
  assert.equal(ids[0], "e1:2026-11-19T08:00:00.000Z");
});
