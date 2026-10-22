/**
 * Download-token store.
 *
 * The old version was a module-level Map. On Netlify/autoscale the /generate
 * call and the /download call routinely land on *different* lambda instances,
 * so a token issued a second earlier 404'd.
 *
 * Driver selection:
 *   DOC_STORE_DRIVER=pg      -> Postgres (default when DATABASE_URL is set)
 *   DOC_STORE_DRIVER=memory  -> in-process Map (dev / tests)
 */
import { randomUUID } from "crypto";
import { and, eq, gt, lt } from "drizzle-orm";

export interface StoredDoc {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  expiresAt: number;
}

export interface StoreOptions {
  mimeType?: string;
  sessionId?: number | null;
  ttlMs?: number;
}

const DEFAULT_TTL_MS = 30 * 60 * 1000;
const DEFAULT_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const ttlMs = () => Number(process.env.DOC_TTL_MS ?? DEFAULT_TTL_MS);

// ── driver: memory ──────────────────────────────────────────────────────────
const mem = new Map<string, StoredDoc>();

const memoryDriver = {
  async put(token: string, doc: StoredDoc) {
    mem.set(token, doc);
  },
  async get(token: string) {
    const doc = mem.get(token);
    if (!doc) return null;
    if (Date.now() > doc.expiresAt) {
      mem.delete(token);
      return null;
    }
    return doc;
  },
  async sweep() {
    const now = Date.now();
    let n = 0;
    for (const [k, d] of mem)
      if (now > d.expiresAt) {
        mem.delete(k);
        n++;
      }
    return n;
  },
};

// ── driver: postgres ────────────────────────────────────────────────────────
const pgDriver = {
  async put(token: string, doc: StoredDoc, opts: StoreOptions) {
    const { db } = await import("@workspace/db");
    const { generatedDocumentsTable } = await import("@workspace/db/schema");
    await db
      .insert(generatedDocumentsTable)
      .values({
        token,
        filename: doc.filename,
        mimeType: doc.mimeType,
        sessionId: opts.sessionId ?? null,
        sizeBytes: doc.buffer.length,
        content: doc.buffer,
        expiresAt: new Date(doc.expiresAt),
      })
      .onConflictDoUpdate({
        target: generatedDocumentsTable.token,
        set: { content: doc.buffer, expiresAt: new Date(doc.expiresAt) },
      });
  },
  async get(token: string): Promise<StoredDoc | null> {
    const { db } = await import("@workspace/db");
    const { generatedDocumentsTable } = await import("@workspace/db/schema");
    const [row] = await db
      .select()
      .from(generatedDocumentsTable)
      .where(
        and(
          eq(generatedDocumentsTable.token, token),
          gt(generatedDocumentsTable.expiresAt, new Date()),
        ),
      );
    if (!row) return null;
    return {
      buffer: row.content,
      filename: row.filename,
      mimeType: row.mimeType,
      expiresAt: row.expiresAt.getTime(),
    };
  },
  async sweep(): Promise<number> {
    const { db } = await import("@workspace/db");
    const { generatedDocumentsTable } = await import("@workspace/db/schema");
    const gone = await db
      .delete(generatedDocumentsTable)
      .where(lt(generatedDocumentsTable.expiresAt, new Date()))
      .returning({ token: generatedDocumentsTable.token });
    return gone.length;
  },
};

function driver() {
  const explicit = process.env.DOC_STORE_DRIVER?.toLowerCase();
  if (explicit === "memory") return memoryDriver;
  if (explicit === "pg") return pgDriver;
  return process.env.DATABASE_URL ? pgDriver : memoryDriver;
}

// ── public API ──────────────────────────────────────────────────────────────
export function generateToken(): string {
  return randomUUID();
}

export async function storeDocument(
  token: string,
  buffer: Buffer,
  filename: string,
  opts: StoreOptions = {},
): Promise<void> {
  const doc: StoredDoc = {
    buffer,
    filename,
    mimeType: opts.mimeType ?? DEFAULT_MIME,
    expiresAt: Date.now() + (opts.ttlMs ?? ttlMs()),
  };
  const d = driver();
  if (d === pgDriver) await pgDriver.put(token, doc, opts);
  else await memoryDriver.put(token, doc);
}

export async function retrieveDocument(token: string): Promise<StoredDoc | null> {
  const d = driver();
  return d === pgDriver ? pgDriver.get(token) : memoryDriver.get(token);
}

export async function sweepExpired(): Promise<number> {
  const d = driver();
  return d === pgDriver ? pgDriver.sweep() : memoryDriver.sweep();
}

/** Returns a stop function. Only call from a long-running process. */
export function startSweeper(intervalMs = 60_000): () => void {
  const t = setInterval(() => {
    sweepExpired().catch((e) => console.error("[doc-store] sweep failed:", e));
  }, intervalMs);
  t.unref?.();
  return () => clearInterval(t);
}
