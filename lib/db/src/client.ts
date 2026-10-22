import { Pool, type PoolConfig } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema/index.js";

const isServerless = () =>
  Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL);

function poolConfig(): PoolConfig {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const serverless = isServerless();
  const needsSsl = /sslmode=require/i.test(url) || process.env.DB_SSL === "1";

  return {
    connectionString: url,
    // One connection per lambda: warm invocations reuse it, and 50 lambdas
    // cannot open 50 x 10 sockets against a free-tier Postgres.
    max: Number(process.env.DB_POOL_MAX ?? (serverless ? 1 : 10)),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS ?? 10_000),
    connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS ?? 10_000),
    // Let a lambda freeze/shutdown without waiting on idle sockets.
    allowExitOnIdle: serverless,
    application_name: "pwd-nit",
    statement_timeout: 15_000,
    query_timeout: 15_000,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  };
}

function createPool(): Pool {
  const p = new Pool(poolConfig());
  // Without this, a dropped idle socket crashes the process unhandled.
  p.on("error", (err) => console.error("[db] idle client error:", err.message));
  return p;
}

// Survive module re-evaluation across warm lambda invocations.
const g = globalThis as unknown as { __pwdPool?: Pool };

export const pool: Pool = g.__pwdPool ?? (g.__pwdPool = createPool());
export const db = drizzle(pool, { schema });

export async function pingDb(): Promise<boolean> {
  try {
    await pool.query("select 1");
    return true;
  } catch {
    return false;
  }
}

export async function closeDb(): Promise<void> {
  await pool.end();
}

export { schema };
