import { Router } from "express";
import { parsePdfText } from "../lib/pdf-parser.js";
import { parseExcelBuffer } from "../lib/excel-parser.js";
import { parseImageBuffer, detectImageMimeType } from "../lib/image-parser.js";
import { parseRawEgrasText } from "../lib/raw-text-parser.js";
import { buildTenderCase, extractTextFromBuffer } from "../lib/tender-parser.js";
import {
  ParseChallanPdfBody,
  ParseExcelUploadBody,
  ParseImageUploadBody,
  ParseRawTextBody,
} from "@workspace/api-zod";

const router = Router();

/** Decode a base64 upload and hand it to the shared text extractor. */
async function extractFromBase64(
  fileBase64?: string | null,
  fileName?: string | null,
): Promise<string> {
  if (!fileBase64) return "";
  return extractTextFromBuffer(Buffer.from(fileBase64, "base64"), fileName);
}

router.post("/parse/challan-pdf", async (req, res) => {
  const parsed = ParseChallanPdfBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input: " + parsed.error.message });
  }

  const { fileBase64 } = parsed.data;

  let pdfText = "";
  try {
    const buffer = Buffer.from(fileBase64, "base64");
    pdfText = await extractTextFromBuffer(buffer, "challan.pdf");
  } catch (err) {
    return res.status(422).json({ error: "Failed to parse PDF: " + String(err) });
  }

  const result = parsePdfText(pdfText);

  return res.json({
    challanEntries: result.challanEntries,
    diprPublication: result.diprPublication,
    rawText: result.rawText,
  });
});

/**
 * POST /parse/excel-upload
 *
 * Accepts the user's hand-curated master Excel (base64) and returns challan
 * entries grouped by work S.No plus DIPR publication data — ready to be saved
 * directly into a NIT session.
 *
 * This is the preferred input path. The Excel is the source of truth because:
 *  - Raw eGras challan PDFs are a flat list with no work-grouping.
 *  - Work-to-challan assignment is domain knowledge the user records in Excel.
 *  - PDF text extraction is fragile; structured Excel cells are unambiguous.
 */
router.post("/parse/excel-upload", async (req, res) => {
  const parsed = ParseExcelUploadBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input: " + parsed.error.message });
  }

  const { fileBase64 } = parsed.data;

  let buffer: Buffer;
  try {
    buffer = Buffer.from(fileBase64, "base64");
  } catch {
    return res.status(422).json({ error: "fileBase64 is not valid base-64" });
  }

  try {
    const result = parseExcelBuffer(buffer);
    return res.json({
      challanEntries: result.challanEntries,
      diprPublication: result.diprPublication,
      workParticipantCounts: result.workParticipantCounts,
    });
  } catch (err) {
    return res.status(422).json({ error: "Failed to parse Excel: " + String(err) });
  }
});

/**
 * POST /parse/image-upload
 *
 * Accepts a base64-encoded image (PNG / JPEG / WebP / GIF) containing
 * challan or DIPR publication table data and returns the same structured
 * output as /parse/excel-upload.
 *
 * Handles both input formats the user encounters:
 *   FLAT   — raw eGras portal screenshot; challans listed sequentially with
 *             no work grouping; all returned entries have workSno = 0
 *   ORGANISED — photo/screenshot of user's Excel or printed table that has
 *               "WORK S.NO. N" section headers; work numbers preserved
 *
 * Uses Google Gemini 2.0 Flash (primary) or OpenAI GPT-4o (fallback) for vision.
 */
router.post("/parse/image-upload", async (req, res) => {
  const parsed = ParseImageUploadBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input: " + parsed.error.message });
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(parsed.data.fileBase64, "base64");
  } catch {
    return res.status(422).json({ error: "fileBase64 is not valid base-64" });
  }

  const mimeType = detectImageMimeType(buffer);

  try {
    const result = await parseImageBuffer(buffer, mimeType);
    return res.json({
      challanEntries: result.challanEntries,
      diprPublication: result.diprPublication,
      flatList: result.flatList,
    });
  } catch (err) {
    return res.status(422).json({ error: "Image parsing failed: " + String(err) });
  }
});

/**
 * POST /parse/raw-text
 *
 * Accepts raw tab-separated text copied directly from the eGras portal browser
 * table and returns a flat list of ChallanEntry objects.
 *
 * How the user provides input:
 *   1. Open the eGras challan list page in a browser
 *   2. Select all text in the table (Ctrl+A inside the table, or select rows)
 *   3. Copy (Ctrl+C)
 *   4. Paste the result into the `rawText` field of this request
 *
 * No AI or external API required — pure deterministic parsing.
 * All entries are returned with workSno = 0 (eGras has no work grouping).
 * Use /api/parse/excel-upload when work-to-challan grouping is needed.
 */
router.post("/parse/raw-text", async (req, res) => {
  const parsed = ParseRawTextBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input: " + parsed.error.message });
  }

  try {
    const challanEntries = parseRawEgrasText(parsed.data.rawText);
    if (challanEntries.length === 0) {
      return res.status(422).json({
        error:
          "No challan entries found in the pasted text. " +
          "Make sure you copied the full table including rows with GRN No, Challan No, Date, and Vendor columns.",
      });
    }
    return res.json({ challanEntries, flatList: true });
  } catch (err) {
    console.error("raw-text parse error:", err);
    return res.status(422).json({ error: "Parsing failed: " + String(err) });
  }
});

router.post("/parse/tender-case", async (req, res) => {
  const {
    nitPdfBase64,
    nitFileName,
    openingPdfBase64,
    openingFileName,
    feeFileBase64,
    feeFileName,
    publicationPdfBase64,
    publicationFileName,
  } = req.body ?? {};

  try {
    const [nitText, openingText, feeText, publicationText] = await Promise.all([
      extractFromBase64(nitPdfBase64, nitFileName),
      extractFromBase64(openingPdfBase64, openingFileName),
      extractFromBase64(feeFileBase64, feeFileName),
      extractFromBase64(publicationPdfBase64, publicationFileName),
    ]);

    const tenderCase = buildTenderCase({
      nitText,
      openingText,
      feeText,
      publicationText,
    });

    return res.json({
      ...tenderCase,
      rawText: {
        nit: nitText,
        opening: openingText,
        fee: feeText,
        publication: publicationText,
      },
    });
  } catch (err) {
    return res.status(422).json({ error: "Failed to parse tender documents: " + String(err) });
  }
});

export default router;
