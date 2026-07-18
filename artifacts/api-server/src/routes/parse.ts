import { Router } from "express";
import { parsePdfText } from "../lib/pdf-parser.js";
import { parseExcelBuffer } from "../lib/excel-parser.js";
import { parseImageBuffer, detectImageMimeType } from "../lib/image-parser.js";
import { parseRawEgrasText } from "../lib/raw-text-parser.js";
import {
  ParseChallanPdfBody,
  ParseExcelUploadBody,
  ParseImageUploadBody,
  ParseRawTextBody,
} from "@workspace/api-zod";

const router = Router();

router.post("/parse/challan-pdf", async (req, res) => {
  const parsed = ParseChallanPdfBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input: " + parsed.error.message });
  }

  const { fileBase64 } = parsed.data;

  let pdfText = "";
  try {
    const buffer = Buffer.from(fileBase64, "base64");
    // Dynamically import pdf-parse to avoid CJS/ESM issues
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    pdfText = data.text;
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

async function extractPdfText(fileBase64?: string | null): Promise<string> {
  if (!fileBase64) return "";
  const buffer = Buffer.from(fileBase64, "base64");
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return data.text ?? "";
}

function firstMatch(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function parseNumber(value: string | undefined): number {
  return Number((value ?? "").replace(/,/g, "")) || 0;
}

function parseWorksFromText(nitText: string, openingText: string) {
  const combined = `${nitText}\n${openingText}`;
  const lines = combined.split("\n").map((line) => line.trim()).filter(Boolean);
  const works: any[] = [];

  for (let i = 0; i < lines.length && works.length < 40; i++) {
    const line = lines[i]!;
    const ubn = firstMatch(line, [/\b(UBN[A-Z0-9/-]+)\b/i, /\b([A-Z]{3}\d{4}[A-Z0-9]+)\b/]);
    const amountMatch = line.match(/(?:Rs\.?|INR)?\s*([\d,]{5,})(?:\.\d{1,2})?/i);
    const looksLikeWork = /work|road|repair|construction|renovation|maintenance|supply|building|pwd/i.test(line);

    if (!looksLikeWork && !ubn) continue;

    const nameParts = [line];
    for (let j = 1; j <= 2 && i + j < lines.length; j++) {
      const next = lines[i + j]!;
      if (/^\d+\s*$/.test(next) || /NIT|UBN|S\.?\s*No/i.test(next)) break;
      if (/work|road|repair|construction|renovation|maintenance|supply|building|pwd/i.test(next)) {
        nameParts.push(next);
      }
    }

    works.push({
      sno: works.length + 1,
      ubn: ubn || "",
      nameOfWork: nameParts.join(" ").slice(0, 260),
      gScheduleAmount: parseNumber(amountMatch?.[1]),
      bidAmount: null,
      bidRate: null,
      bidRatePercent: null,
      bidRateType: "below",
      period: "",
      status: "accepted",
      bidderName: null,
      bidderAddress: null,
      bidderContact: null,
      aenSubDivision: null,
      stampDuty: null,
      aps: null,
    });
  }

  works.sort((a, b) => a.sno - b.sno);
  return works;
}

async function extractTextFromFile(fileBase64?: string | null, fileName?: string): Promise<string> {
  if (!fileBase64) return "";
  const buffer = Buffer.from(fileBase64, "base64");

  if (fileName?.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text ?? "";
  }

  if (fileName?.endsWith(".txt") || fileName?.endsWith(".csv")) {
    return buffer.toString("utf8");
  }

  if (fileName?.endsWith(".xlsx") || fileName?.endsWith(".xls")) {
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      let text = "";
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        for (const row of jsonData) {
          text += (row as string[]).join("\t") + "\n";
        }
      }
      return text;
    } catch (e) {
      console.error("Error parsing Excel file:", e);
      return "";
    }
  }

  return "";
}

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
    publicationFileName
  } = req.body ?? {};

  try {
    const [nitText, openingText, feeText, publicationText] = await Promise.all([
      extractTextFromFile(nitPdfBase64, nitFileName),
      extractTextFromFile(openingPdfBase64, openingFileName),
      extractTextFromFile(feeFileBase64, feeFileName),
      extractTextFromFile(publicationPdfBase64, publicationFileName),
    ]);

    const feePublicationParsed = parsePdfText(`${feeText}\n${publicationText}`);
    const allText = `${nitText}\n${openingText}\n${feeText}\n${publicationText}`;
    const nitNo = firstMatch(allText, [
      /NIT\s*(?:No\.?|Number)?\s*[:/-]?\s*([A-Z0-9/-]+\/\d{2,4}-\d{2,4}|[A-Z0-9/-]+)/i,
      /Notice\s+Inviting\s+Tender\s*(?:No\.?)?\s*[:/-]?\s*([A-Z0-9/-]+)/i,
    ]);
    const nitDate = firstMatch(allText, [
      /(?:NIT\s*)?(?:Date|Dated)\s*[:.-]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i,
      /(\d{1,2}\s+[A-Za-z]+,?\s+\d{4})/,
    ]);

    return res.json({
      title: nitNo ? `NIT ${nitNo}` : "Tender Case",
      nitDetails: {
        nitNo,
        nitDate,
        office: "Executive Engineer, P.W.D. District Division-II, Udaipur",
        signingAuthority: "Executive Engineer",
      },
      works: parseWorksFromText(nitText, openingText),
      challanEntries: feePublicationParsed.challanEntries,
      diprPublication: feePublicationParsed.diprPublication,
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
