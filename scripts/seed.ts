/**
 * Seeds MongoDB with the demo dataset: npm run seed (requires MONGODB_URI in .env, .env.local or env).
 * It is idempotent and upserts by slug. Transactions need a replica set (Atlas, or `mongod --replSet rs0` locally).
 */
import { readFileSync, existsSync } from "node:fs";
import mongoose from "mongoose";

// Same precedence as Next.js: real env > .env.local > .env (empty values are ignored)
for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

async function main() {
  const { connectDB } = await import("../src/lib/db");
  const { DEMO_CENTERS } = await import("../src/data/demo");
  const { GOVERNORATES } = await import("../src/data/tunisia");
  const { Center } = await import("../src/models/Center");
  const { Employee, Service } = await import("../src/models/Catalog");
  const { User } = await import("../src/models/User");
  await import("../src/models/Booking");
  await import("../src/models/Engagement");

  await connectDB();
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));

  for (const d of DEMO_CENTERS) {
    const owner = await User.findOneAndUpdate(
      { email: `owner+${d.slug}@hajemti.test` },
      { $setOnInsert: { name: `Owner ${d.name}`, role: "OWNER" } },
      { upsert: true, new: true },
    );
    const center = await Center.findOneAndUpdate(
      { slug: d.slug },
      {
        slug: d.slug, name: { fr: d.name }, description: { fr: d.description }, categories: d.categories, ownerId: owner._id,
        address: { line1: d.address, governorate: d.governorate, delegation: d.delegation, city: GOVERNORATES.find((g) => g.slug === d.governorate)?.name.fr },
        location: { type: "Point", coordinates: [d.location.lng, d.location.lat] },
        contact: { phone: d.phone, whatsapp: d.whatsapp, instagram: d.instagram },
        openingHours: d.openingHours, theme: d.theme, plan: d.plan, verified: d.verified, genderFocus: d.genderFocus,
        priceFromMillimes: d.priceFromMillimes, status: "published",
        // Ratings are derived from verified reviews only, and a fresh database has none yet.
        stats: { ratingAvg: 0, reviewCount: 0, followerCount: 0 },
      },
      { upsert: true, new: true },
    );
    await User.updateOne({ _id: owner._id, "memberships.centerId": { $ne: center._id } }, { $push: { memberships: { centerId: center._id, role: "OWNER" } } });

    await Promise.all([Service.deleteMany({ centerId: center._id }), Employee.deleteMany({ centerId: center._id })]);
    const services = await Service.insertMany(d.services.map((s, i) => ({
      centerId: center._id, categoryKey: s.category, name: { fr: s.name }, durationMin: s.durationMin, priceMillimes: s.priceMillimes, sortOrder: i,
    })));
    const employees = await Employee.insertMany(d.team.map((t) => ({
      centerId: center._id, displayName: t.name, title: t.title, serviceIds: services.map((s) => s._id), workingHours: d.openingHours,
    })));
    await Service.updateMany({ centerId: center._id }, { employeeIds: employees.map((e) => e._id) });
    console.log(`✓ ${d.name} (${services.length} services, ${employees.length} staff)`);
  }
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
