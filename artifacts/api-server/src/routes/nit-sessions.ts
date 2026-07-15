import { Router } from "express";
import { db } from "@workspace/db";
import { nitSessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateNitSessionBody,
  UpdateNitSessionBody,
  GetNitSessionParams,
  UpdateNitSessionParams,
  DeleteNitSessionParams,
  GetNitSessionSummaryParams,
} from "@workspace/api-zod";
import { computeWork } from "../lib/compute.js";

const router = Router();

function serializeSession(s: typeof nitSessionsTable.$inferSelect) {
  return {
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

// GET /nit-sessions
router.get("/nit-sessions", async (_req, res) => {
  const sessions = await db.select().from(nitSessionsTable).orderBy(nitSessionsTable.createdAt);
  return res.json(sessions.map(serializeSession));
});

// POST /nit-sessions
router.post("/nit-sessions", async (req, res) => {
  const parsed = CreateNitSessionBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  const [session] = await db
    .insert(nitSessionsTable)
    .values({
      title: parsed.data.title as string,
      nitDetails: parsed.data.nitDetails as object,
      works: (parsed.data.works as object[]) ?? [],
      challanEntries: (parsed.data.challanEntries as object[]) ?? [],
      diprPublication: parsed.data.diprPublication as object ?? null,
    })
    .returning();
  return res.status(201).json(serializeSession(session!));
});

// GET /nit-sessions/:id/summary  (must come before :id)
router.get("/nit-sessions/:id/summary", async (req, res) => {
  const parsed = GetNitSessionSummaryParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  const [session] = await db
    .select()
    .from(nitSessionsTable)
    .where(eq(nitSessionsTable.id, parsed.data.id));

  if (!session) return res.status(404).json({ error: "Not found" });

  const works = (session.works as any[]) ?? [];
  const accepted = works.filter((w: any) => w.status === "accepted");
  const cancelled = works.filter((w: any) => w.status === "cancelled");

  const workComputations = works.map((w: any) => computeWork(w));
  const totalBidValue = accepted.reduce((sum: number, w: any) => sum + (w.bidAmount ?? 0), 0);
  const totalStampDuty = workComputations.reduce((sum, c) => sum + (c.stampDuty ?? 0), 0);
  const totalAps = workComputations.reduce((sum, c) => sum + (c.aps ?? 0), 0);

  return res.json({
    sessionId: session.id,
    totalWorks: works.length,
    acceptedWorks: accepted.length,
    cancelledWorks: cancelled.length,
    totalBidValue,
    totalStampDuty,
    totalAps,
    workComputations,
  });
});

// GET /nit-sessions/:id
router.get("/nit-sessions/:id", async (req, res) => {
  const parsed = GetNitSessionParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  const [session] = await db
    .select()
    .from(nitSessionsTable)
    .where(eq(nitSessionsTable.id, parsed.data.id));

  if (!session) return res.status(404).json({ error: "Not found" });
  return res.json(serializeSession(session));
});

// PUT /nit-sessions/:id
router.put("/nit-sessions/:id", async (req, res) => {
  const parsedParams = UpdateNitSessionParams.safeParse(req.params);
  const parsedBody = UpdateNitSessionBody.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const [updated] = await db
    .update(nitSessionsTable)
    .set({
      title: parsedBody.data.title as string,
      nitDetails: parsedBody.data.nitDetails as object,
      works: (parsedBody.data.works as object[]) ?? [],
      challanEntries: (parsedBody.data.challanEntries as object[]) ?? [],
      diprPublication: parsedBody.data.diprPublication as object ?? null,
      updatedAt: new Date(),
    })
    .where(eq(nitSessionsTable.id, parsedParams.data.id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Not found" });
  return res.json(serializeSession(updated));
});

// DELETE /nit-sessions/:id
router.delete("/nit-sessions/:id", async (req, res) => {
  const parsed = DeleteNitSessionParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  await db.delete(nitSessionsTable).where(eq(nitSessionsTable.id, parsed.data.id));
  return res.json({ success: true });
});

export default router;
