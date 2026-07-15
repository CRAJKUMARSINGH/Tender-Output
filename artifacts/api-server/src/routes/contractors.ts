import { Router } from "express";
import { db } from "@workspace/db";
import { contractorsTable } from "@workspace/db";
import { eq, ilike, sql } from "drizzle-orm";
import {
  ListContractorsQueryParams,
  CreateContractorBody,
  UpdateContractorBody,
  GetContractorParams,
  UpdateContractorParams,
  DeleteContractorParams,
} from "@workspace/api-zod";

const router = Router();

// GET /contractors
router.get("/contractors", async (req, res) => {
  const parsed = ListContractorsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  const { search, limit = 50, offset = 0 } = parsed.data;

  const query = db
    .select()
    .from(contractorsTable)
    .limit(Number(limit))
    .offset(Number(offset));

  if (search) {
    query.where(ilike(contractorsTable.name, `%${search}%`));
  }

  const contractors = await query;
  return res.json(contractors.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
  })));
});

// POST /contractors
router.post("/contractors", async (req, res) => {
  const parsed = CreateContractorBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  const [contractor] = await db.insert(contractorsTable).values(parsed.data).returning();
  return res.status(201).json({ ...contractor!, createdAt: contractor!.createdAt.toISOString() });
});

// GET /contractors/stats  (must come before :id)
router.get("/contractors/stats", async (_req, res) => {
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(contractorsTable);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [{ recent }] = await db
    .select({ recent: sql<number>`count(*)::int` })
    .from(contractorsTable)
    .where(sql`${contractorsTable.createdAt} >= ${sevenDaysAgo}`);

  return res.json({ totalContractors: total ?? 0, recentlyAdded: recent ?? 0 });
});

// GET /contractors/:id
router.get("/contractors/:id", async (req, res) => {
  const parsed = GetContractorParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  const [contractor] = await db
    .select()
    .from(contractorsTable)
    .where(eq(contractorsTable.id, parsed.data.id));

  if (!contractor) return res.status(404).json({ error: "Not found" });
  return res.json({ ...contractor, createdAt: contractor.createdAt.toISOString() });
});

// PUT /contractors/:id
router.put("/contractors/:id", async (req, res) => {
  const parsedParams = UpdateContractorParams.safeParse(req.params);
  const parsedBody = UpdateContractorBody.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const [updated] = await db
    .update(contractorsTable)
    .set(parsedBody.data)
    .where(eq(contractorsTable.id, parsedParams.data.id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Not found" });
  return res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

// DELETE /contractors/:id
router.delete("/contractors/:id", async (req, res) => {
  const parsed = DeleteContractorParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  await db.delete(contractorsTable).where(eq(contractorsTable.id, parsed.data.id));
  return res.json({ success: true });
});

export default router;
