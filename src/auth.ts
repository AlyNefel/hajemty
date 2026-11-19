import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { connectDB, hasDatabase } from "@/lib/db";
import { User } from "@/models/User";
import type { Actor } from "@/lib/rbac";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    /**
     * On sign-in: upsert the user and embed role + memberships in the JWT.
     * Every 15 minutes the claims are refreshed from the DB, so role changes and "log out everywhere"
     * (a tokenVersion bump) take effect without a session table.
     */
    async jwt({ token, account, profile }) {
      if (!hasDatabase()) return token;
      const stale = !token.refreshedAt || Date.now() - (token.refreshedAt as number) > 15 * 60_000;
      if (!account && !stale) return token;

      await connectDB();
      let user = token.uid ? await User.findById(token.uid).lean() : null;
      if (account && !user) {
        const email = (profile?.email ?? token.email)?.toLowerCase();
        user = await User.findOneAndUpdate(
          email ? { email } : { "providers.provider": account.provider, "providers.providerAccountId": account.providerAccountId },
          {
            $setOnInsert: { name: token.name ?? "Utilisateur", email, avatarUrl: token.picture, role: "CUSTOMER" },
            $addToSet: { providers: { provider: account.provider, providerAccountId: account.providerAccountId } },
            $set: { lastLoginAt: new Date() },
          },
          { upsert: true, new: true, lean: true },
        );
      }
      if (!user || user.status !== "active" || (token.ver != null && token.ver !== user.tokenVersion)) {
        return { ...token, role: "CUSTOMER", memberships: [], revoked: true };
      }
      return {
        ...token,
        sub: String(user._id),
        uid: String(user._id),
        role: user.role,
        ver: user.tokenVersion,
        memberships: user.memberships.map((m) => ({ centerId: String(m.centerId), role: m.role, employeeId: m.employeeId ? String(m.employeeId) : undefined })),
        refreshedAt: Date.now(),
      };
    },
  },
});

/** Current actor for RBAC checks in Server Actions and Route Handlers. */
export async function currentActor(): Promise<Actor | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { id: session.user.id, role: session.user.role, memberships: session.user.memberships };
}
