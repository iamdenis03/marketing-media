/**
 * Minimal in-memory rate limiter (the app runs as a single process).
 * Used to stop password guessing on login and on the 6-digit reset codes.
 */

type Bucket = { hits: number[] };
const buckets = new Map<string, Bucket>();

function prune(b: Bucket, windowMs: number, now: number) {
  while (b.hits.length && now - b.hits[0] > windowMs) b.hits.shift();
}

/** Seconds to wait if `key` already used up `limit` attempts in the window, otherwise 0. */
export function blockedFor(key: string, limit: number, windowMs: number): number {
  const b = buckets.get(key);
  if (!b) return 0;
  const now = Date.now();
  prune(b, windowMs, now);
  if (b.hits.length < limit) return 0;
  return Math.ceil((windowMs - (now - b.hits[0])) / 1000);
}

/** Records one attempt (call it for failures, or for every request on endpoints that send emails). */
export function recordAttempt(key: string, windowMs: number): void {
  const now = Date.now();
  const b = buckets.get(key) || { hits: [] };
  prune(b, windowMs, now);
  b.hits.push(now);
  buckets.set(key, b);
}

export function clearAttempts(key: string): void {
  buckets.delete(key);
}

/** Best-effort client IP (behind Tailscale Funnel / proxies, falls back to "unknown"). */
export function clientIp(headers: Headers | Record<string, any> | undefined): string {
  if (!headers) return 'unknown';
  const get = (name: string): string | undefined =>
    typeof (headers as Headers).get === 'function'
      ? (headers as Headers).get(name) ?? undefined
      : (headers as Record<string, any>)[name];
  const fwd = get('x-forwarded-for');
  if (fwd) return String(fwd).split(',')[0].trim();
  return String(get('x-real-ip') || 'unknown');
}

export function waitMessage(seconds: number): string {
  const min = Math.ceil(seconds / 60);
  return `Prea multe încercări. Încearcă din nou peste ${min} ${min === 1 ? 'minut' : 'minute'}.`;
}

// Housekeeping so the map doesn't grow forever
setInterval(() => {
  const now = Date.now();
  buckets.forEach((b, k) => {
    prune(b, 60 * 60 * 1000, now);
    if (!b.hits.length) buckets.delete(k);
  });
}, 10 * 60 * 1000).unref?.();
