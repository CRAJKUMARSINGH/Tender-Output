import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contractorsTable = pgTable("contractors", {
  id: serial("id").primaryKey(),
  sno: integer("sno"),
  name: text("name").notNull(),
  address: text("address").notNull(),
  contactNo: text("contact_no"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContractorSchema = createInsertSchema(contractorsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertContractor = z.infer<typeof insertContractorSchema>;
export type Contractor = typeof contractorsTable.$inferSelect;
