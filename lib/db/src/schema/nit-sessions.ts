import { pgTable, serial, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const nitSessionsTable = pgTable("nit_sessions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  nitDetails: jsonb("nit_details").notNull(),
  works: jsonb("works").notNull().$default(() => []),
  challanEntries: jsonb("challan_entries").notNull().$default(() => []),
  diprPublication: jsonb("dipr_publication"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNitSessionSchema = createInsertSchema(nitSessionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertNitSession = z.infer<typeof insertNitSessionSchema>;
export type NitSession = typeof nitSessionsTable.$inferSelect;
