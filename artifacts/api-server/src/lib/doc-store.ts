/**
 * In-memory document store for generated DOCX files.
 * Tokens expire after 30 minutes.
 */

interface StoredDoc {
  buffer: Buffer;
  filename: string;
  expiresAt: number;
}

const store = new Map<string, StoredDoc>();

export function storeDocument(token: string, buffer: Buffer, filename: string): void {
  store.set(token, {
    buffer,
    filename,
    expiresAt: Date.now() + 30 * 60 * 1000, // 30 min
  });
}

export function retrieveDocument(token: string): StoredDoc | null {
  const doc = store.get(token);
  if (!doc) return null;
  if (Date.now() > doc.expiresAt) {
    store.delete(token);
    return null;
  }
  return doc;
}

export function generateToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
