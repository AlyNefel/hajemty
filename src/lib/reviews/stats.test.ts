import { test } from "node:test";
import assert from "node:assert/strict";
import { bayesianRating, reviewStats } from "./stats.ts";

test("stats: average, distribution, response rate; hidden reviews excluded", () => {
  const s = reviewStats([
    { rating: 5, reply: { text: "merci" } },
    { rating: 4 },
    { rating: 5 },
    { rating: 1, reply: { text: "désolés" } },
    { rating: 2, status: "hidden" },
  ]);
  assert.equal(s.count, 4);
  assert.equal(s.average, 3.8);
  assert.deepEqual(s.distribution, [1, 0, 0, 1, 2]);
  assert.equal(s.replied, 2);
  assert.equal(s.responseRate, 0.5);
});

test("stats: empty", () => {
  assert.deepEqual(reviewStats([]), { average: 0, count: 0, distribution: [0, 0, 0, 0, 0], replied: 0, responseRate: 0 });
});

test("bayesian rating: volume beats a single perfect review", () => {
  assert.ok(bayesianRating(4.8, 300) > bayesianRating(5, 1));
});
