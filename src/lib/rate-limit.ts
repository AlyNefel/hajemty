/**
 * Sliding-window rate limiter.
 * - Dev / single instance: in-memory map (per edge isolate).
 * - Production: set UPSTASH_REDIS_REST_URL and replace `memoryHit` with @upstash/ratelimit
 *   (same interface), so limits hold across all instances.
 */
export const LIMITS = {
  auth: { limit: 10, windowMs: 60_000 },
  booking: { limit: 20, windowMs: 60_000 },
  search: { limit: 120, windowMs: 60_000 },
  chat: { limit: 60, windowMs: 60_000 },
  default: { limit: 300, windowMs: 60_000 },
} as const;
export type LimitKey = keyof typeof LIMITS;

const hits = new Map<string, number[]>();

export function rateLimit(identifier: string, kind: LimitKey = "default") {
  const { limit, windowMs } = LIMITS[kind];
  const now = Date.now();
  const key = `${kind}:${identifier}`;
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  const ok = recent.length < limit;
  if (ok) recent.push(now);
  hits.set(key, recent);
  if (hits.size > 50_000) hits.clear(); // memory guard
  return { ok, remaining: Math.max(0, limit - recent.length), resetMs: windowMs - (now - (recent[0] ?? now)) };
}

export function limitKindFor(pathname: string): LimitKey {
  if (pathname.startsWith("/api/auth")) return "auth";
  if (pathname.startsWith("/api/bookings")) return "booking";
  if (pathname.startsWith("/api/centers")) return "search";
  if (pathname.startsWith("/api/conversations")) return "chat";
  return "default";
}
