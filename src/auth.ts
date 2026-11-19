import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { connectDB, hasDatabase } from "@/lib/db";
import { User } from "@/models/User";
import type { Actor } from "@/lib/rbac";
import { authenticate, DEMO_CUSTOMER } from "@/lib/users";

const LoginSchema = z.object({ email: z.string().email().max(120), password: z.string().min(1).max(200) });

/**
 * Node-only providers (they touch the DB / scrypt), so they're kept out of the edge-safe
 * auth.config.ts that middleware imports.
 */
const nodeProviders = [
  Credentials({
    id: "password",
    name: "E-mail",
    credentials: { email: { type: "email" }, password: { type: "password" } },
    async authorize(raw) {
      const parsed = LoginSchema.safeParse(raw);
      if (!parsed.success) throw new CredentialsSignin();
      const user = await authenticate(parsed.data.email, parsed.data.password);
      if (!user) throw new CredentialsSignin();
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    },
  }),
  // One-click demo customer, available ONLY in demo mode (no database configured).
  ...(hasDatabase()
    ? []
    : [Credentials({ id: "demo", name: "Démo", credentials: {}, authorize: async () => ({ ...DEMO_CUSTOMER }) })]),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [...authConfig.providers, ...nodeProviders],
  callbacks: {
    ...authConfig.callbacks,
    /**
     * On sign-in: resolve the user and embed role + memberships in the JWT.
     * Every 15 minutes the claims are refreshed from the DB, so role changes and "log out everywhere"
     * (a tokenVersion bump) take effect without a session table.
     */
    async jwt({ token, account, profile, user }) {
      if (account && user?.id && (account.provider === "password" || account.provider === "demo")) {
        token.uid = user.id;
        token.sub = user.id;
        token.role = (user as { role?: string }).role ?? "CUSTOMER";
      }
      if (!hasDatabase()) {
        token.role ??= "CUSTOMER";
        token.memberships ??= [];
        return token;
      }
      const stale = !token.refreshedAt || Date.now() - (token.refreshedAt as number) > 15 * 60_000;
      if (!account && !stale) return token;

      await connectDB();
      let dbUser = token.uid ? await User.findById(token.uid).lean() : null;
      if (account && !dbUser) {
        const email = (profile?.email ?? token.email)?.toLowerCase();
        dbUser = await User.findOneAndUpdate(
          email ? { email } : { "providers.provider": account.provider, "providers.providerAccountId": account.providerAccountId },
          {
            $setOnInsert: { name: token.name ?? "Utilisateur", email, avatarUrl: token.picture, role: "CUSTOMER" },
            $addToSet: { providers: { provider: account.provider, providerAccountId: account.providerAccountId } },
            $set: { lastLoginAt: new Date() },
          },
          { upsert: true, new: true, lean: true },
        );
      }
      if (!dbUser || dbUser.status !== "active" || (token.ver != null && token.ver !== dbUser.tokenVersion)) {
        return { ...token, role: "CUSTOMER", memberships: [], revoked: true };
      }
      return {
        ...token,
        sub: String(dbUser._id),
        uid: String(dbUser._id),
        name: dbUser.name,
        role: dbUser.role,
        ver: dbUser.tokenVersion,
        memberships: dbUser.memberships.map((m) => ({ centerId: String(m.centerId), role: m.role, employeeId: m.employeeId ? String(m.employeeId) : undefined })),
        refreshedAt: Date.now(),
      };
    },
  },
});

/** Current actor for RBAC checks in Server Actions and Route Handlers. Revoked sessions resolve to null. */
export async function currentActor(): Promise<Actor | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { id: session.user.id, role: session.user.role, memberships: session.user.memberships };
}
