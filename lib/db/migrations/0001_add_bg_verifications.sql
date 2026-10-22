-- Adds the bank BG/FDR verification column.
-- NOT NULL + DEFAULT so existing rows backfill in one statement; the DEFAULT
-- is then dropped so drizzle's runtime value is the single source of truth.
ALTER TABLE "nit_sessions"
  ADD COLUMN IF NOT EXISTS "bg_verifications" jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "nit_sessions"
  ALTER COLUMN "bg_verifications" DROP DEFAULT;
