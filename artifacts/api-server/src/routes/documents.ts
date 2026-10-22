import { Router } from "express";
import { db } from "@workspace/db";
import { nitSessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GenerateDocumentsBody, ComputeValuesBody, DownloadDocumentParams } from "@workspace/api-zod";
import {
  generateScrutinyNoteSheet,
  generateAcceptanceLetters,
  generateChallanVerificationSheet,
  generatePublicationCostStatement,
  generateMasterRecord,
  generateWorkOrders,
  generateNegotiationLetters,
  generateNegotiationReplyFormats,
  generateBankBgLetters,
  generatePlaceholderDocument,
} from "../lib/doc-generator.js";
import { storeDocument, retrieveDocument, generateToken } from "../lib/doc-store.js";
import { computeWork } from "../lib/compute.js";
import { safeSegment, contentDisposition } from "../lib/http.js";

const router = Router();

// POST /documents/compute — preview stamp duty/APS without saving
router.post("/documents/compute", async (req, res) => {
  const parsed = ComputeValuesBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  const works = (parsed.data.works as any[]).map(computeWork);
  return res.json({ works });
});

// POST /documents/generate — generate DOCX files and return download tokens
router.post("/documents/generate", async (req, res) => {
  const parsed = GenerateDocumentsBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }

  const { sessionId, documents } = parsed.data;

  const [session] = await db
    .select()
    .from(nitSessionsTable)
    .where(eq(nitSessionsTable.id, sessionId));

  if (!session) return res.status(404).json({ error: "Session not found" });

  const nit = session.nitDetails as any;
  const works = (session.works as any[]) ?? [];
  const challanEntries = (session.challanEntries as any[]) ?? [];
  const dipr = session.diprPublication as any ?? null;
  const bgVerifications = (session.bgVerifications as any[]) ?? [];
  const nitNoSafe = safeSegment(nit.nitNo ?? "NIT", "NIT");

  const results: { type: string; title: string; downloadToken: string; filename: string; error?: string }[] = [];

  const docTypeMap: Record<string, { title: string; filename: string; generator: () => Promise<Buffer> }> = {
    scrutiny_note: {
      title: "Tender Scrutiny Note Sheet",
      filename: `Tender_Scrutiny_NIT_${nitNoSafe}.docx`,
      generator: () => generateScrutinyNoteSheet(nit, works),
    },
    acceptance_letters: {
      title: "Acceptance Letters",
      filename: `Acceptance_Letters_NIT_${nitNoSafe}.docx`,
      generator: () => generateAcceptanceLetters(nit, works),
    },
    challan_verification: {
      title: "eGross Challan Verification Sheet",
      filename: `Challan_Verification_NIT_${nitNoSafe}.docx`,
      generator: () => generateChallanVerificationSheet(nit, challanEntries),
    },
    publication_cost: {
      title: "NIT Publication Cost Statement",
      filename: `Publication_Cost_NIT_${nitNoSafe}.docx`,
      generator: () =>
        dipr
          ? generatePublicationCostStatement(nit, dipr)
          : generatePlaceholderDocument("NIT Publication Cost Statement", "No DIPR data available."),
    },
    master_record: {
      title: "Master Complete Record",
      filename: `Master_Record_NIT_${nitNoSafe}.docx`,
      generator: () => generateMasterRecord(nit, works, challanEntries, dipr),
    },
    work_order: {
      title: "Written Order to Commencement of Work",
      filename: `Work_Orders_NIT_${nitNoSafe}.docx`,
      generator: () => generateWorkOrders(nit, works),
    },
    negotiation_letters: {
      title: "Negotiation Letters",
      filename: `Negotiation_Letters_NIT_${nitNoSafe}.docx`,
      generator: () => generateNegotiationLetters(nit, works),
    },
    negotiation_reply: {
      title: "Sample Format for Negotiation Reply by Contractor",
      filename: `Negotiation_Reply_Format_NIT_${nitNoSafe}.docx`,
      generator: () => generateNegotiationReplyFormats(nit, works),
    },
    bank_bg_letters: {
      title: "Letter to Bank for BG/FDR Confirmation",
      filename: `Bank_BG_FDR_Letters_NIT_${nitNoSafe}.docx`,
      generator: () => generateBankBgLetters(bgVerifications, works),
    },
  };

  for (const docType of documents) {
    const def = docTypeMap[docType];
    if (!def) continue;
    try {
      const buffer = await def.generator();
      const token = generateToken();
      await storeDocument(token, buffer, def.filename, { sessionId });
      results.push({ type: docType, title: def.title, downloadToken: token, filename: def.filename });
    } catch (err) {
      results.push({ type: docType, title: def?.title ?? docType, downloadToken: "", filename: "", error: String(err) });
    }
  }

  return res.json({
    sessionId,
    documents: results,
    generatedAt: new Date().toISOString(),
  });
});

// GET /documents/download/:token
router.get("/documents/download/:token", async (req, res, next) => {
  try {
    const parsed = DownloadDocumentParams.safeParse(req.params);
    if (!parsed.success) return res.status(400).json({ error: "Invalid token" });

    const doc = await retrieveDocument(parsed.data.token);
    if (!doc) return res.status(404).json({ error: "Document not found or expired" });

    res.setHeader("Content-Type", doc.mimeType);
    res.setHeader("Content-Disposition", contentDisposition(doc.filename));
    res.setHeader("Content-Length", String(doc.buffer.length));
    res.setHeader("Cache-Control", "private, no-store"); // confidential drafts
    return res.send(doc.buffer);
  } catch (err) {
    return next(err);
  }
});

export default router;
