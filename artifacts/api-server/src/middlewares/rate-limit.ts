import type { RequestHandler } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 30_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) if (now > b.resetAt) buckets.delete(k);
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix?: string;
}

export function rateLimit({ windowMs, max, keyPrefix = "" }: RateLimitOptions): RequestHandler {
  return (req, res, next) => {
    const now = Date.now();
    sweep(now);

    // trust proxy must be enabled for req.ip to be the real client behind Netlify
    const key = `${keyPrefix}:${req.ip ?? "unknown"}`;
    const bucket = buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader("X-RateLimit-Remaining", String(max - 1));
      return next();
    }

    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({
        error: `Rate limit exceeded. Retry in ${retryAfter}s.`,
      });
    }

    res.setHeader("X-RateLimit-Remaining", String(max - bucket.count));
    return next();
  };
}
