import { test } from "node:test";
import assert from "node:assert/strict";
import { cloudinaryConfig, isOwnUpload, signParams } from "./media-core.ts";

test("Cloudinary signature matches the documented example", () => {
  // https://cloudinary.com/documentation/authentication_signatures
  const sig = signParams({ eager: "w_400,h_300,c_pad|w_260,h_200,c_crop", public_id: "sample_image", timestamp: 1315060510 }, "abcd");
  assert.equal(sig, "bfd09f95f331f558cbd1320e67aa8d488770583e");
});

test("uploads need all three Cloudinary settings", () => {
  assert.equal(cloudinaryConfig({}), null);
  assert.equal(cloudinaryConfig({ CLOUDINARY_CLOUD_NAME: "x", CLOUDINARY_API_KEY: "k" }), null);
  assert.deepEqual(cloudinaryConfig({ NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "x", CLOUDINARY_API_KEY: "k", CLOUDINARY_API_SECRET: "s" }), { cloudName: "x", apiKey: "k", apiSecret: "s" });
});

test("only our own folder on our own Cloudinary account is accepted", () => {
  const cfg = { cloudName: "hajemti", apiKey: "k", apiSecret: "s" };
  const folder = "hajemti/centers/c1";
  assert.ok(isOwnUpload("https://res.cloudinary.com/hajemti/image/upload/v1/hajemti/centers/c1/a.jpg", folder, cfg));
  assert.ok(!isOwnUpload("https://res.cloudinary.com/hajemti/image/upload/v1/hajemti/centers/c2/a.jpg", folder, cfg), "another salon's folder");
  assert.ok(!isOwnUpload("https://res.cloudinary.com/other/image/upload/v1/hajemti/centers/c1/a.jpg", folder, cfg), "another account");
  assert.ok(!isOwnUpload("http://res.cloudinary.com/hajemti/image/upload/v1/hajemti/centers/c1/a.jpg", folder, cfg), "not https");
  assert.ok(!isOwnUpload("https://evil.example/hajemti/image/upload/hajemti/centers/c1/a.jpg", folder, cfg), "other host");
  assert.ok(!isOwnUpload("not a url", folder, cfg));
  assert.ok(!isOwnUpload("https://res.cloudinary.com/hajemti/image/upload/v1/hajemti/centers/c1/a.jpg", folder, null), "uploads disabled");
});
