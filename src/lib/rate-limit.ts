import { tooMany } from "./errors";

/**
 * Fixed-window in-memory rate limiter. Good for one server; swap for Redis
 * (same interface) when running several instances.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  b.count++;
  if (b.count > limit) throw tooMany();
}

/** Occasionally drop expired buckets so memory doesn't grow forever. */
export function sweepRateLimits(now = Date.now()) {
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}
setInterval(() => sweepRateLimits(), 60_000).unref?.();

export function resetRateLimits() {
  buckets.clear();
}
