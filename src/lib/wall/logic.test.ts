import { test } from "node:test";
import assert from "node:assert/strict";
import { applyReaction, cleanText, feedOrder, timeAgo, topReactions, totalReactions, WallInputError } from "./logic.ts";
import { emptyReactions } from "./types.ts";

test("reactions: add, switch, remove, never negative", () => {
  let c = emptyReactions();
  c = applyReaction(c, null, "love");
  assert.deepEqual(c, { love: 1, wow: 0, want: 0, clap: 0 });
  c = applyReaction(c, "love", "want");
  assert.deepEqual(c, { love: 0, wow: 0, want: 1, clap: 0 });
  c = applyReaction(c, "want", "want");
  assert.equal(c.want, 1, "same reaction twice is a no-op");
  c = applyReaction(c, "want", null);
  assert.equal(totalReactions(c), 0);
  assert.equal(applyReaction(emptyReactions(), "wow", null).wow, 0, "clamped at zero");
});

test("top reactions: most used first, unused dropped", () => {
  assert.deepEqual(topReactions({ love: 3, wow: 0, want: 7, clap: 3 }), ["want", "love", "clap"]);
  assert.deepEqual(topReactions(emptyReactions()), []);
});

test("cleanText trims, strips control and bidi characters, limits blank lines", () => {
  assert.equal(cleanText("  Super  \r\n\r\n\r\n\r\nmerci\u0007 ‮", 100), "Super\n\nmerci");
  assert.throws(() => cleanText("   \n ", 100), WallInputError);
  assert.throws(() => cleanText("x".repeat(101), 100), /trop long/);
  assert.throws(() => cleanText("https://a.tn https://b.tn www.c.tn", 500), /liens/);
  assert.equal(cleanText("voir https://hajemti.tn", 500), "voir https://hajemti.tn");
});

test("timeAgo in French", () => {
  const now = Date.parse("2026-11-25T12:00:00Z");
  assert.equal(timeAgo("2026-11-25T11:59:30Z", now), "à l'instant");
  assert.equal(timeAgo("2026-11-25T11:55:00Z", now), "il y a 5 min");
  assert.equal(timeAgo("2026-11-25T09:00:00Z", now), "il y a 3 h");
  assert.equal(timeAgo("2026-11-24T10:00:00Z", now), "hier");
  assert.equal(timeAgo("2026-11-21T12:00:00Z", now), "il y a 4 j");
  assert.equal(timeAgo("2026-10-02T12:00:00Z", now), "2 octobre");
  assert.equal(timeAgo("2025-10-02T12:00:00Z", now), "2 octobre 2025");
});

test("feed order: pinned first, then newest", () => {
  const posts = [
    { id: "a", pinned: false, createdAt: "2026-11-20" },
    { id: "b", pinned: true, createdAt: "2026-10-01" },
    { id: "c", pinned: false, createdAt: "2026-11-24" },
  ];
  assert.deepEqual(posts.sort(feedOrder).map((p) => p.id), ["b", "c", "a"]);
});
