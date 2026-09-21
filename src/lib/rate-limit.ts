// src/lib/rate-limit.ts
/**
 * Minimal in-memory sliding-window rate limiter.
 * Demo limitation: single-instance only. Production should use
 * Redis/Upstash or edge middleware for distributed limiting.
 */
type Bucket = { hits: number[] };
const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - bucket.hits[0])) / 1000));
    buckets.set(key, bucket);
    return { ok: false, retryAfterSec };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { ok: true, retryAfterSec: 0 };
}