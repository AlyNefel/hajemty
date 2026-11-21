import { test } from "node:test";
import assert from "node:assert/strict";
import { demoAdminOpen, isDemoMode } from "./demo.ts";

test("demo mode = no database", () => {
  assert.equal(isDemoMode({}), true);
  assert.equal(isDemoMode({ MONGODB_URI: "mongodb://x" }), false);
});

test("demo super admin: open locally, locked on Vercel unless opted in", () => {
  assert.equal(demoAdminOpen({}), true, "local demo");
  assert.equal(demoAdminOpen({ VERCEL: "1" }), false, "public Vercel deploy");
  assert.equal(demoAdminOpen({ VERCEL: "1", VERCEL_ENV: "preview" }), false, "previews too");
  assert.equal(demoAdminOpen({ VERCEL: "1", DEMO_ADMIN: "open" }), true, "explicit opt-in");
  assert.equal(demoAdminOpen({ MONGODB_URI: "mongodb://x" }), false, "never with a real database");
});
