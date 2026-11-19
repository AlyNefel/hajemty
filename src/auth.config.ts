import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import Apple from "next-auth/providers/apple";
import type { Membership, Role } from "@/lib/rbac";

/**
 * Edge-safe Auth.js config (no DB imports) shared by middleware and the full server config.
 * Providers are enabled only when their credentials exist, so local dev works with zero setup.
 */
const providers: NextAuthConfig["providers"] = [];
if (process.env.AUTH_GOOGLE_ID) providers.push(Google);
if (process.env.AUTH_FACEBOOK_ID) providers.push(Facebook);
if (process.env.AUTH_APPLE_ID) providers.push(Apple);

export const authConfig = {
  providers,
  session: { strategy: "jwt", maxAge: 30 * 24 * 3600 },
  pages: { signIn: "/login" },
  trustHost: true,
  // Demo mode (no database) falls back to a fixed secret so the app runs with zero setup. Sessions then
  // only ever unlock fictitious demo data. With a database, AUTH_SECRET is mandatory (Auth.js throws).
  secret: process.env.AUTH_SECRET ?? (process.env.MONGODB_URI ? undefined : "hajemti-demo-mode-secret-not-for-production"),
  callbacks: {
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.revoked ? "" : (token.sub ?? "");
        session.user.role = (token.role as Role) ?? "CUSTOMER";
        session.user.memberships = (token.memberships as Membership[]) ?? [];
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role; memberships: Membership[]; name?: string | null; email?: string | null; image?: string | null };
  }
}
