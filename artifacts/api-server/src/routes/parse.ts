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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Parse works from the tender opening PDF text.
 *
 * The opening PDF has a well-defined structure per tender block:
 *   Tender ID : 2026_CEPWD_603219_1
 *   ...
 *   Name of Work : <work name>
 *   Contract No : NIT No. 14/2026-27 S.No. 1
 *   ...
 *   [amounts table with Estimated Rate, Quoted %, Rate Amount per bidder]
 *   Lowest Amount Quoted BY: <L1 bidder>(<amount>)
 *   ...
 *   [BOQ summary with L1/L2/L3 rankings]
 *
 * This replaces the old heuristic line-scanner that left bidAmount/bidderName/bidRatePercent
 * as null for every work (B7, B8, B9, B10, B11).
 */
function parseWorksFromText(nitText: string, openingText: string) {
  // Anchor on real structure: split opening text by Tender ID blocks
  const tenderBlocks = openingText.split(/(?=Tender ID\s*:\s*\d+)/i);
  const works: any[] = [];

  for (const block of tenderBlocks) {
    if (!block.trim()) continue;
    if (!/Tender ID\s*:\s*\d+/i.test(block)) continue;

    // ── S.No ── from "Contract No : NIT No. 14/2026-27 S.No. N" or Tender ID suffix
    let sno = 0;
    const snoMatch = block.match(/Contract No\s*:?\s*.*?S\.No\.\s*(\d+)/i);
    if (snoMatch) {
      sno = parseInt(snoMatch[1], 10);
    } else {
      const tidMatch = block.match(/Tender ID\s*:\s*\d+[_/](\d+)/i);
      if (tidMatch) sno = parseInt(tidMatch[1], 10);
    }
    if (sno === 0) continue;

    // ── Work name ── prefer "Name of Work", fall back to "Tender Title"
    let nameOfWork = "";
    const nameMatch = block.match(/Name of Work\s*:\s*([\s\S]*?)(?:\nContract No|\nSCHEDULE)/i);
    if (nameMatch) {
      nameOfWork = nameMatch[1].replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    }
    if (!nameOfWork) {
      const titleMatch = block.match(/Tender Title\s*:\s*\n([\s\S]*?)(?:\nPacket Name|\nDecrypted)/i);
      if (titleMatch) {
        nameOfWork = titleMatch[1].replace(/\n/g, " ").replace(/\s+/g, " ").trim();
      }
    }
    if (!nameOfWork) continue;

    // ── G-Schedule (Estimated Rate) ──
    // All bidders share the same estimated rate; take the first occurrence.
    // Pattern: a large number followed by a negative/positive percentage and another amount
    let gScheduleAmount = 0;
    const amountsLinePattern = /([\d,]+\.?\d*)\s*\n\s*(-?[\d.]+)\s*\n\s*([\d,]+\.?\d*)/g;
    let amountsMatch;
    while ((amountsMatch = amountsLinePattern.exec(block)) !== null) {
      const val = parseNumber(amountsMatch[1]);
      if (val > 10000) {
        gScheduleAmount = val;
        break;
      }
    }

    // ── Lowest bidder extraction ──
    let bidderName: string | null = null;
    let bidAmount: number | null = null;
    let bidRatePercent: number | null = null;
    let bidRateType = "below";

    // Case 1: Single Tender
    const singleMatch = block.match(
      /Single Tender Received By\s*\n?\s*(.+?)\s*\n?\s*([\d.]+)\s*PERCENT\s*(BELOW|ABOVE)/i
    );
    if (singleMatch) {
      bidderName = singleMatch[1].trim();
      bidRatePercent = parseFloat(singleMatch[2]);
      bidRateType = (singleMatch[3] ?? "BELOW").toLowerCase();
    }

    // Case 2: "Lowest Amount Quoted BY\nNAME PCT\nPERCENT BELOW" (summary section)
    if (!bidRatePercent) {
      const lowestPctMatch = block.match(
        /Lowest Amount Quoted BY\s*\n?\s*(.+?)\s+([\d.]+)\s*\n?\s*PERCENT\s*(BELOW|ABOVE)/i
      );
      if (lowestPctMatch) {
        bidderName = bidderName ?? lowestPctMatch[1].trim();
        bidRatePercent = parseFloat(lowestPctMatch[2]);
        bidRateType = (lowestPctMatch[3] ?? "BELOW").toLowerCase();
      }
    }

    // Case 3: "Lowest Amount Quoted BY: NAME(AMOUNT)" (after amounts table)
    const lowestAmtMatch = block.match(
      /Lowest Amount Quoted BY\s*:?\s*(.+?)\(([\d,]+\.?\d*)\)/i
    );
    if (lowestAmtMatch) {
      bidderName = bidderName ?? lowestAmtMatch[1].trim();
      bidAmount = parseNumber(lowestAmtMatch[2]);
    }

    // Case 4: BOQ summary L1 entry — authoritative source
    // Format: "BoQ1\n1 BIDDER_NAME (BID ID -XXXX)\nAMOUNT L1"
    const boqL1Match = block.match(
      /\d+\s+(.+?)\s*\(BID ID\s*-\d+\)\s*\n?\s*([\d,]+\.?\d*)\s*L1/i
    );
    if (boqL1Match) {
      bidderName = bidderName ?? boqL1Match[1].trim();
      bidAmount = bidAmount ?? parseNumber(boqL1Match[2]);
    }

    // Case 5: Fall back to amounts table for G-Schedule / bid details
    // Match the bidder's row in the amounts table: NAME ... BID ID -XXXX \n G \n pct \n amount
    if (bidderName) {
      const firstName = escapeRegex(bidderName.split(/\s+/)[0] ?? bidderName);
      const rowPattern = new RegExp(
        firstName +
          "[\\s\\S]*?BID ID\\s*-?\\s*\\d+\\s*\\n\\s*([\\d,]+\\.?\\d*)\\s*\\n\\s*(-?[\\d.]+)\\s*\\n\\s*([\\d,]+\\.?\\d*)",
        "i"
      );
      const rowMatch = block.match(rowPattern);
      if (rowMatch) {
        if (!gScheduleAmount) gScheduleAmount = parseNumber(rowMatch[1]);
        if (bidRatePercent === null) {
          bidRatePercent = parseFloat(rowMatch[2]);
          bidRateType = rowMatch[2].startsWith("-") ? "below" : "above";
        }
        if (bidAmount === null) bidAmount = parseNumber(rowMatch[3]);
      }
    }

    // ── UBN (from NIT text if available) ──
    const ubn = firstMatch(block + "\n" + nitText, [
      /\bUBN\s*(?:No\.?)?\s*[:/-]?\s*([A-Z0-9]{4,}[A-Z0-9/-]*)/i,
    ]);

    // ── Period of completion ──
    const period =
      firstMatch(block + "\n" + nitText, [
        /Period of Completion\s*[:/-]?\s*(.+)/i,
        /Time of Completion\s*[:/-]?\s*(.+)/i,
      ]) || "";

    // ── Status ──
    let status = "accepted";
    if (!bidderName || /No responsive bidder|Nil.*CANCELLED|CANCELLED/i.test(block)) {
      status = "cancelled";
    }

    works.push({
      sno,
      ubn: ubn || "",
      nameOfWork: nameOfWork.slice(0, 260),
      gScheduleAmount,
      bidAmount,
      bidRate: bidRatePercent,
      bidRatePercent,
      bidRateType,
      period,
      status,
      bidderName,
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

  // Case-insensitive extension dispatch (B6)
  const ext = (fileName ?? "").toLowerCase().split(".").pop() ?? "";

  if (ext === "pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text ?? "";
  }

  if (ext === "txt" || ext === "csv") {
    return buffer.toString("utf8");
  }

  if (ext === "xlsx" || ext === "xls") {
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

  // NEW: images -> vision model (B5) — Gemini/GPT-4o vision parser
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
    try {
      const mimeType = detectImageMimeType(buffer);
      const result = await parseImageBuffer(buffer, mimeType);
      return JSON.stringify(result);
    } catch (e) {
      console.error("Error parsing image file:", e);
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
      // d-Mon-yyyy e.g. "21-Oct-2026" (eProcurement format — B12)
      /(?:Date|Dated)\s*[:.-]?\s*(\d{1,2}-[A-Za-z]{3,}-\d{4})/i,
      /(\d{1,2}-[A-Za-z]{3,}-\d{4})/,
      // dd/mm/yyyy or dd.mm.yyyy
      /(?:NIT\s*)?(?:Date|Dated)\s*[:.-]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i,
      // "d Month yyyy" e.g. "3 July 2026"
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
