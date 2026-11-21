/**
 * Demo-mode access rules. This file has no imports, so it is safe in edge middleware and in tests.
 *
 * Demo mode = no MONGODB_URI. The app then runs on fictitious in-memory data and, to make every
 * screen explorable, the visitor is treated as owner of the demo salons.
 *
 * Super-admin powers in demo mode (e.g. /admin/apparence, which re-themes the site for EVERY
 * visitor) are a different matter: on a public deployment that would let anyone change the site.
 * So the demo super admin is only granted:
 *   - locally (not running on Vercel), or
 *   - when explicitly opted in with DEMO_ADMIN=open (e.g. a private preview).
 */
export const isDemoMode = (env: Record<string, string | undefined> = process.env) => !env.MONGODB_URI;

export const demoAdminOpen = (env: Record<string, string | undefined> = process.env) =>
  isDemoMode(env) && (!env.VERCEL || env.DEMO_ADMIN === "open");
