import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { connectDB, hasDatabase } from "@/lib/db";
import type { Role } from "@/lib/rbac";
import { User } from "@/models/User";

/**
 * Customer accounts for email + password sign-in (OAuth users are handled in src/auth.ts).
 * Passwords are hashed with scrypt (N=16384, r=8, p=1, 64-byte key, 16-byte random salt), the
 * memory-hard KDF built into Node, so there are no native dependencies.
 * In demo mode (no MONGODB_URI) accounts live in memory, shared through globalThis.
 */
export type AppUser = { id: string; name: string; email: string; phone?: string; role: Role };
type StoredUser = AppUser & { passwordHash?: string };

const g = globalThis as unknown as { __hajemtiUsers?: Map<string, StoredUser> };
const demoUsers: Map<string, StoredUser> = (g.__hajemtiUsers ??= new Map());

export const DEMO_CUSTOMER: AppUser = { id: "demo-client", name: "Yasmine Ben Ali", email: "demo@hajemti.tn", role: "CUSTOMER" };
demoUsers.set(DEMO_CUSTOMER.email, DEMO_CUSTOMER);

const KEYLEN = 64;
const scrypt = (password: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) => scryptCb(password, salt, KEYLEN, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? reject(e) : resolve(k))));

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string | undefined | null): Promise<boolean> {
  if (!stored?.startsWith("scrypt$")) {
    await scrypt(password, randomBytes(16)); // equalize timing when the account doesn't exist
    return false;
  }
  const [, saltB64, keyB64] = stored.split("$");
  const expected = Buffer.from(keyB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export class AccountError extends Error {}

export async function registerUser(input: { name: string; email: string; password: string; phone?: string }): Promise<AppUser> {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);
  if (!hasDatabase()) {
    if (demoUsers.has(email)) throw new AccountError("Un compte existe déjà avec cet e-mail");
    const user: StoredUser = { id: `u-${randomBytes(6).toString("hex")}`, name: input.name.trim(), email, phone: input.phone, role: "CUSTOMER", passwordHash };
    demoUsers.set(email, user);
    return strip(user);
  }
  await connectDB();
  if (await User.exists({ email })) throw new AccountError("Un compte existe déjà avec cet e-mail");
  const doc = await User.create({ name: input.name.trim(), email, phone: input.phone || undefined, passwordHash, role: "CUSTOMER", providers: [] });
  return { id: String(doc._id), name: doc.name, email, phone: doc.phone ?? undefined, role: "CUSTOMER" };
}

export async function authenticate(emailRaw: string, password: string): Promise<AppUser | null> {
  const email = emailRaw.trim().toLowerCase();
  if (!hasDatabase()) {
    const u = demoUsers.get(email);
    return u && (await verifyPassword(password, u.passwordHash)) ? strip(u) : (await verifyPassword(password, null), null);
  }
  await connectDB();
  const doc = await User.findOne({ email, status: "active" }).select("+passwordHash").lean();
  if (!(await verifyPassword(password, doc?.passwordHash)) || !doc) return null;
  await User.updateOne({ _id: doc._id }, { $set: { lastLoginAt: new Date() } });
  return { id: String(doc._id), name: doc.name, email, phone: doc.phone ?? undefined, role: doc.role as Role };
}

export async function getUserById(id: string): Promise<AppUser | null> {
  if (!hasDatabase()) {
    for (const u of demoUsers.values()) if (u.id === id) return strip(u);
    return null;
  }
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  await connectDB();
  const doc = await User.findById(id).lean();
  return doc ? { id, name: doc.name, email: doc.email ?? "", phone: doc.phone ?? undefined, role: doc.role as Role } : null;
}

const strip = ({ passwordHash: _ph, ...u }: StoredUser): AppUser => u;
