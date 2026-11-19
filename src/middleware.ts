import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import { limitKindFor, rateLimit } from "./lib/rate-limit";

const { auth } = NextAuth(authConfig);

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "geolocation=(self), camera=(), microphone=(self)",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // 1. Rate limiting for API routes
  if (pathname.startsWith("/api/")) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
    const { ok, resetMs } = rateLimit(ip, limitKindFor(pathname));
    if (!ok) {
      return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Trop de requêtes" } }, {
        status: 429, headers: { "Retry-After": String(Math.ceil(resetMs / 1000)) },
      });
    }
    // 2. CSRF: mutating API calls must come from our own origin (Auth.js protects its own routes).
    if (req.method !== "GET" && req.method !== "HEAD" && !pathname.startsWith("/api/auth") && !pathname.startsWith("/api/webhooks")) {
      const origin = req.headers.get("origin");
      if (origin && origin !== req.nextUrl.origin) {
        return NextResponse.json({ error: { code: "CSRF", message: "Invalid origin" } }, { status: 403 });
      }
    }
  }

  // 3. Coarse RBAC gates (fine-grained checks happen in each handler via authorize()).
  const user = req.auth?.user;
  if (pathname.startsWith("/admin") && user?.role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL(user ? "/" : `/login?next=${encodeURIComponent(pathname)}`, req.url));
  }
  // Demo mode (no database): the dashboard runs on fictitious in-memory data, so it is open for exploration.
  const demoMode = !process.env.MONGODB_URI;
  if (!demoMode && pathname.startsWith("/dashboard") && !(user?.role === "SUPER_ADMIN" || (user?.memberships?.length ?? 0) > 0)) {
    return NextResponse.redirect(new URL(user ? "/partenaires" : `/login?next=${encodeURIComponent(pathname)}`, req.url));
  }

  const res = NextResponse.next();
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
  return res;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|avif|ico)$).*)"],
};
