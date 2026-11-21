/**
 * Grant a role to an existing account (database mode).
 *
 *   npm run grant-role -- you@example.com super-admin
 *   npm run grant-role -- you@example.com owner maison-jasmin-la-marsa
 *   npm run grant-role -- you@example.com manager le-barbier-de-carthage
 *   npm run grant-role -- you@example.com customer          (removes super admin)
 *
 * The account must exist (sign up at /inscription first). Role changes reach the user's session
 * within 15 minutes, or immediately after they sign out and back in.
 */
import { readFileSync, existsSync } from "node:fs";
import mongoose from "mongoose";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const [emailArg, roleArg, slug] = process.argv.slice(2);
const ROLES = ["super-admin", "customer", "owner", "manager", "employee"];

async function main() {
  if (!emailArg || !ROLES.includes(roleArg ?? "")) {
    console.error(`Usage: npm run grant-role -- <email> <${ROLES.join("|")}> [center-slug]`);
    process.exit(1);
  }
  const { connectDB } = await import("../src/lib/db");
  const { User } = await import("../src/models/User");
  const { Center } = await import("../src/models/Center");
  await connectDB();

  const email = emailArg.trim().toLowerCase();
  const user = await User.findOne({ email });
  if (!user) throw new Error(`No account with e-mail ${email}. Sign up at /inscription first.`);

  if (roleArg === "super-admin" || roleArg === "customer") {
    user.role = roleArg === "super-admin" ? "SUPER_ADMIN" : "CUSTOMER";
    await user.save();
    console.log(`✓ ${email} is now ${user.role}`);
  } else {
    if (!slug) throw new Error("A center slug is required for owner/manager/employee");
    const center = await Center.findOne({ slug });
    if (!center) throw new Error(`No center with slug "${slug}"`);
    const role = roleArg.toUpperCase() as "OWNER" | "MANAGER" | "EMPLOYEE";
    await User.updateOne({ _id: user._id }, { $pull: { memberships: { centerId: center._id } } });
    await User.updateOne({ _id: user._id }, { $push: { memberships: { centerId: center._id, role } } });
    if (role === "OWNER") await Center.updateOne({ _id: center._id }, { $set: { ownerId: user._id } });
    console.log(`✓ ${email} is now ${role} of ${center.name?.fr ?? slug}`);
  }
  console.log("  (takes effect within 15 min, or right after signing out and back in)");
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error("✗", (e as Error).message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
