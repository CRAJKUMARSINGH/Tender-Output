import type { RequestHandler } from "express";
import { timingSafeEqual } from "crypto";

const OPEN_PATHS = new Set(["/healthz"]);

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function extractKey(headers: Record<string, unknown>): string | null {
  const auth = headers["authorization"];
  if (typeof auth === "string" && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  const xKey = headers["x-api-key"];
  return typeof xKey === "string" && xKey.trim() ? xKey.trim() : null;
}

/**
 * Shared-secret bearer auth. When API_KEY is unset the API stays open (dev
 * convenience) — set it in production or every endpoint is public.
 */
export function apiKeyAuth(): RequestHandler {
  const expected = process.env.API_KEY?.trim();

  return (req, res, next) => {
    if (!expected) return next(); // open mode
    if (OPEN_PATHS.has(req.path)) return next();

    const provided = extractKey(req.headers as Record<string, unknown>);
    if (!provided) {
      return res.status(401).json({ error: "Missing credentials" });
    }
    if (!safeEqual(provided, expected)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    return next();
  };
}
