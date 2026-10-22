import { pgTable, text, timestamp, integer, customType, index } from "drizzle-orm/pg-core";

/** drizzle has no built-in bytea; node-postgres hands back a Buffer for it. */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

export const generatedDocumentsTable = pgTable(
  "generated_documents",
  {
    token: text("token").primaryKey(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type")
      .notNull()
      .default("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    sessionId: integer("session_id"),
    sizeBytes: integer("size_bytes").notNull(),
    content: bytea("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (t) => ({ expiresIdx: index("generated_documents_expires_at_idx").on(t.expiresAt) }),
);
