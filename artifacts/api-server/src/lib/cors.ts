export function corsOrigins(): boolean | string[] {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw) return true; // dev: reflect any origin
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
