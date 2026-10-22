/**
 * Folder-workflow routes — enable the NIT-XX folder convention:
 *   POST /parse/folder          → read input files from a directory, return parsed tender data
 *   POST /documents/generate-batch → generate all .docx reports and write them to disk
 *
 * These routes only work when the API server runs locally (has filesystem access).
 * On Netlify/serverless they should be disabled or return 501.
 */
import { Router } from "express";
import * as fs from "fs";
import * as path from "path";
import { parsePdfText } from "../lib/pdf-parser.js";
import { computeWork } from "../lib/compute.js";
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
} from "../lib/doc-generator.js";

const router = Router();

// ── Helpers ──────────────────────────────────────────────────────────

function readDir(dir: string): string[] {
  return fs.readdirSync(dir).map((f) => path.join(dir, f));
}

async function extractTextFromDisk(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase().slice(1);
  const buffer = fs.readFileSync(filePath);

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
        for (const row of jsonData) text += (row as string[]).join("\t") + "\n";
      }
      return text;
    } catch { return ""; }
  }
  return "";
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

// ── POST /parse/folder ───────────────────────────────────────────────
//
// Body: { dir: "C:/Users/Rajkumar/Tender-Output/test-data/NIT-14" }
// or   { dir: "C:/Users/Rajkumar/Tender-Output/test-data/NIT-14/Inputs" }
//
// Reads all files in the directory (or ./Inputs subdirectory), identifies
// NIT PDF, opening PDF, fee file, publication file by name/extension,
// extracts text, and returns a parsed NitSessionInput-shaped object.
router.post("/parse/folder", async (req, res) => {
  const { dir } = req.body ?? {};
  if (!dir) return res.status(400).json({ error: "Missing 'dir' field" });

  try {
    if (!fs.existsSync(dir)) {
      return res.status(404).json({ error: `Directory not found: ${dir}` });
    }

    // Accept either the NIT-XX root or its Inputs subfolder
    let inputDir = dir;
    const inputsSub = path.join(dir, "Inputs");
    const inputsSubLower = path.join(dir, "inputs");
    if (fs.existsSync(inputsSub)) inputDir = inputsSub;
    else if (fs.existsSync(inputsSubLower)) inputDir = inputsSubLower;

    const files = readDir(inputDir).filter((f) => fs.statSync(f).isFile());

    // Classify files
    let nitFile = "";
    let openingFile = "";
    let feeFile = "";
    let publicationFile = "";

    for (const f of files) {
      const name = path.basename(f).toLowerCase();
      const ext = path.extname(f).toLowerCase().slice(1);

      if (ext === "pdf") {
        if (/nit|tender/.test(name) && !/opening|bid.*open/.test(name) && !/challan|emd|fee|dipr|pub/.test(name)) {
          if (!nitFile) nitFile = f;
        } else if (/opening|bid.*open|open.*nit/.test(name)) {
          openingFile = f;
        } else if (/emd|fee|challan|deposit/.test(name)) {
          feeFile = f;
        } else if (/pub|dipr|publication/.test(name)) {
          publicationFile = f;
        }
      } else if (["xlsx", "xls", "csv"].includes(ext)) {
        if (/emd|fee|challan|deposit/.test(name)) feeFile = f;
        else if (/pub|dipr|publication/.test(name)) publicationFile = f;
      } else if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
        if (/emd|fee|challan|deposit/.test(name)) feeFile = f;
        else if (/pub|dipr|publication/.test(name)) publicationFile = f;
      }

      // If no opening file matched by name, use any remaining PDF as opening
      if (!openingFile && ext === "pdf" && f !== nitFile && f !== feeFile && f !== publicationFile) {
        // Prefer files with "open" in name; otherwise pick the first unmatched PDF
        if (/open/.test(name)) openingFile = f;
      }
    }

    // Fallback: if no NIT file was found, treat the opening file as the NIT too
    if (!nitFile && openingFile) nitFile = openingFile;
    // If still no opening file but we have unmatched PDFs, pick the first
    if (!openingFile) {
      const unmatched = files.filter(
        (f) => f !== nitFile && f !== feeFile && f !== publicationFile && path.extname(f).toLowerCase() === ".pdf"
      );
      if (unmatched.length > 0) openingFile = unmatched[0]!;
    }

    // Extract text
    const [nitText, openingText, feeText, publicationText] = await Promise.all([
      nitFile ? extractTextFromDisk(nitFile) : Promise.resolve(""),
      openingFile ? extractTextFromDisk(openingFile) : Promise.resolve(""),
      feeFile ? extractTextFromDisk(feeFile) : Promise.resolve(""),
      publicationFile ? extractTextFromDisk(publicationFile) : Promise.resolve(""),
    ]);

    // Parse fee + publication for challan/DIPR data
    const feePublicationParsed = parsePdfText(`${feeText}\n${publicationText}`);

    // Build allText for NIT number/date extraction
    const allText = `${nitText}\n${openingText}\n${feeText}\n${publicationText}`;
    const nitNo = firstMatch(allText, [
      /NIT\s*(?:No\.?|Number)?\s*[:/-]?\s*([A-Z0-9/-]+\/\d{2,4}-\d{2,4}|[A-Z0-9/-]+)/i,
      /Notice\s+Inviting\s+Tender\s*(?:No\.?)?\s*[:/-]?\s*([A-Z0-9/-]+)/i,
    ]);
    const nitDate = firstMatch(allText, [
      /(?:Date|Dated)\s*[:.-]?\s*(\d{1,2}-[A-Za-z]{3,}-\d{4})/i,
      /(\d{1,2}-[A-Za-z]{3,}-\d{4})/,
      /(?:NIT\s*)?(?:Date|Dated)\s*[:.-]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i,
      /(\d{1,2}\s+[A-Za-z]+,?\s+\d{4})/,
    ]);

    // Parse works from opening text (same logic as parse.ts)
    const works = parseWorksFromOpeningText(openingText, nitText);

    return res.json({
      inputDir,
      files: { nit: nitFile, opening: openingFile, fee: feeFile, publication: publicationFile },
      title: nitNo ? `NIT ${nitNo}` : "Tender Case",
      nitDetails: {
        nitNo,
        nitDate,
        office: "Executive Engineer, P.W.D. District Division-II, Udaipur",
        signingAuthority: "Executive Engineer",
      },
      works,
      challanEntries: feePublicationParsed.challanEntries,
      diprPublication: feePublicationParsed.diprPublication,
    });
  } catch (err) {
    return res.status(422).json({ error: "Failed to parse folder: " + String(err) });
  }
});

// ── POST /documents/generate-batch ────────────────────────────────────
//
// Body: {
//   sessionData: NitSessionInput,        // parsed tender data
//   outputDir: "C:/.../test-data/NIT-14/outputs",
//   documents: ["scrutiny_note", ...]     // which docs to generate (default: all 9)
// }
//
// Generates each .docx and writes it to outputDir. Returns a list of
// generated files with their paths and any errors.
router.post("/documents/generate-batch", async (req, res) => {
  const { sessionData, outputDir, documents } = req.body ?? {};
  if (!sessionData) return res.status(400).json({ error: "Missing 'sessionData'" });
  if (!outputDir) return res.status(400).json({ error: "Missing 'outputDir'" });

  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const nit = sessionData.nitDetails ?? {};
    const works = (sessionData.works ?? []).map((w: any) => ({
      ...w,
      ...computeWork(w),
    }));
    const challanEntries = sessionData.challanEntries ?? [];
    const dipr = sessionData.diprPublication ?? null;
    const bgVerifications = sessionData.bgVerifications ?? [];
    const nitNoSafe = (nit.nitNo ?? "NIT").replace(/\//g, "-");

    const ALL_DOCS = [
      "scrutiny_note", "acceptance_letters", "work_order",
      "negotiation_letters", "bank_bg_letters", "negotiation_reply",
      "challan_verification", "publication_cost", "master_record",
    ];
    const docList = documents?.length ? documents : ALL_DOCS;

    const docTypeMap: Record<string, { title: string; filename: string; generator: () => Promise<Buffer> }> = {
      scrutiny_note: {
        title: "Scrutiny Sheet",
        filename: `01-Scrutiny-Sheet-NIT-${nitNoSafe}.docx`,
        generator: () => generateScrutinyNoteSheet(nit, works),
      },
      acceptance_letters: {
        title: "Acceptance Letters",
        filename: `02-Acceptance-Letters-NIT-${nitNoSafe}.docx`,
        generator: () => generateAcceptanceLetters(nit, works),
      },
      work_order: {
        title: "Work Orders",
        filename: `03-Work-Orders-NIT-${nitNoSafe}.docx`,
        generator: () => generateWorkOrders(nit, works),
      },
      negotiation_letters: {
        title: "Negotiation Letters",
        filename: `04-Negotiation-Letters-NIT-${nitNoSafe}.docx`,
        generator: () => generateNegotiationLetters(nit, works),
      },
      bank_bg_letters: {
        title: "Bank BG/FDR Letters",
        filename: `05-Bank-BG-FDR-Letters-NIT-${nitNoSafe}.docx`,
        generator: () => generateBankBgLetters(bgVerifications, works),
      },
      negotiation_reply: {
        title: "Negotiation Reply Format",
        filename: `06-Negotiation-Reply-Format-NIT-${nitNoSafe}.docx`,
        generator: () => generateNegotiationReplyFormats(nit, works),
      },
      challan_verification: {
        title: "Challan Verification Sheet",
        filename: `07-Challan-Verification-NIT-${nitNoSafe}.docx`,
        generator: () => generateChallanVerificationSheet(nit, challanEntries),
      },
      publication_cost: {
        title: "Publication Cost Statement",
        filename: `08-Publication-Cost-NIT-${nitNoSafe}.docx`,
        generator: () =>
          dipr
            ? generatePublicationCostStatement(nit, dipr)
            : Promise.resolve(Buffer.from("No DIPR data available")),
      },
      master_record: {
        title: "Master Complete Record",
        filename: `09-Master-Record-NIT-${nitNoSafe}.docx`,
        generator: () => generateMasterRecord(nit, works, challanEntries, dipr),
      },
    };

    const results: { type: string; title: string; filename: string; filePath: string; error?: string }[] = [];

    for (const docType of docList) {
      const def = docTypeMap[docType];
      if (!def) {
        results.push({ type: docType, title: docType, filename: "", filePath: "", error: "Unknown document type" });
        continue;
      }
      try {
        const buffer = await def.generator();
        const filePath = path.join(outputDir, def.filename);
        fs.writeFileSync(filePath, buffer);
        results.push({ type: docType, title: def.title, filename: def.filename, filePath });
      } catch (err) {
        results.push({ type: docType, title: def.title, filename: def.filename, filePath: "", error: String(err) });
      }
    }

    return res.json({ outputDir, documents: results, generatedAt: new Date().toISOString() });
  } catch (err) {
    return res.status(422).json({ error: "Failed to generate batch: " + String(err) });
  }
});

// ── Shared parser (mirrors parse.ts logic, kept here to avoid circular imports) ──
function parseWorksFromOpeningText(openingText: string, nitText: string) {
  const tenderBlocks = openingText.split(/(?=Tender ID\s*:\s*\d+)/i);
  const works: any[] = [];

  for (const block of tenderBlocks) {
    if (!block.trim()) continue;
    if (!/Tender ID\s*:\s*\d+/i.test(block)) continue;

    let sno = 0;
    const snoMatch = block.match(/Contract No\s*:?\s*.*?S\.No\.\s*(\d+)/i);
    if (snoMatch) sno = parseInt(snoMatch[1], 10);
    else {
      const tidMatch = block.match(/Tender ID\s*:\s*\d+[_/](\d+)/i);
      if (tidMatch) sno = parseInt(tidMatch[1], 10);
    }
    if (sno === 0) continue;

    let nameOfWork = "";
    const nameMatch = block.match(/Name of Work\s*:\s*([\s\S]*?)(?:\nContract No|\nSCHEDULE)/i);
    if (nameMatch) nameOfWork = nameMatch[1].replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    if (!nameOfWork) {
      const titleMatch = block.match(/Tender Title\s*:\s*\n([\s\S]*?)(?:\nPacket Name|\nDecrypted)/i);
      if (titleMatch) nameOfWork = titleMatch[1].replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    }
    if (!nameOfWork) continue;

    // G-Schedule from amounts line pattern
    let gScheduleAmount = 0;
    const amountsLinePattern = /([\d,]+\.?\d*)\s*\n\s*(-?[\d.]+)\s*\n\s*([\d,]+\.?\d*)/g;
    let m;
    while ((m = amountsLinePattern.exec(block)) !== null) {
      const val = parseNumber(m[1]);
      if (val > 10000) { gScheduleAmount = val; break; }
    }

    let bidderName: string | null = null;
    let bidAmount: number | null = null;
    let bidRatePercent: number | null = null;
    let bidRateType = "below";

    // Single tender
    const singleMatch = block.match(/Single Tender Received By\s*\n?\s*(.+?)\s*\n?\s*([\d.]+)\s*PERCENT\s*(BELOW|ABOVE)/i);
    if (singleMatch) {
      bidderName = singleMatch[1].trim();
      bidRatePercent = parseFloat(singleMatch[2]);
      bidRateType = (singleMatch[3] ?? "BELOW").toLowerCase();
    }

    // Lowest Amount Quoted BY with percentage
    if (!bidRatePercent) {
      const lp = block.match(/Lowest Amount Quoted BY\s*\n?\s*(.+?)\s+([\d.]+)\s*\n?\s*PERCENT\s*(BELOW|ABOVE)/i);
      if (lp) {
        bidderName = bidderName ?? lp[1].trim();
        bidRatePercent = parseFloat(lp[2]);
        bidRateType = (lp[3] ?? "BELOW").toLowerCase();
      }
    }

    // Lowest Amount Quoted BY: NAME(AMOUNT)
    const la = block.match(/Lowest Amount Quoted BY\s*:?\s*(.+?)\(([\d,]+\.?\d*)\)/i);
    if (la) {
      bidderName = bidderName ?? la[1].trim();
      bidAmount = parseNumber(la[2]);
    }

    // BOQ summary L1
    const boq = block.match(/\d+\s+(.+?)\s*\(BID ID\s*-\d+\)\s*\n?\s*([\d,]+\.?\d*)\s*L1/i);
    if (boq) {
      bidderName = bidderName ?? boq[1].trim();
      bidAmount = bidAmount ?? parseNumber(boq[2]);
    }

    // Fallback: amounts table for bidder row
    if (bidderName) {
      const fn = escapeRegex(bidderName.split(/\s+/)[0] ?? bidderName);
      const rp = new RegExp(fn + "[\\s\\S]*?BID ID\\s*-?\\s*\\d+\\s*\\n\\s*([\\d,]+\\.?\\d*)\\s*\\n\\s*(-?[\\d.]+)\\s*\\n\\s*([\\d,]+\\.?\\d*)", "i");
      const rm = block.match(rp);
      if (rm) {
        if (!gScheduleAmount) gScheduleAmount = parseNumber(rm[1]);
        if (bidRatePercent === null) {
          bidRatePercent = parseFloat(rm[2]);
          bidRateType = rm[2].startsWith("-") ? "below" : "above";
        }
        if (bidAmount === null) bidAmount = parseNumber(rm[3]);
      }
    }

    const ubn = firstMatch(block + "\n" + nitText, [/\bUBN\s*(?:No\.?)?\s*[:/-]?\s*([A-Z0-9]{4,}[A-Z0-9/-]*)/i]);
    const period = firstMatch(block + "\n" + nitText, [/Period of Completion\s*[:/-]?\s*(.+)/i, /Time of Completion\s*[:/-]?\s*(.+)/i]) || "";

    let status = "accepted";
    if (!bidderName || /No responsive bidder|Nil.*CANCELLED|CANCELLED/i.test(block)) status = "cancelled";

    works.push({
      sno, ubn: ubn || "", nameOfWork: nameOfWork.slice(0, 260),
      gScheduleAmount, bidAmount, bidRate: bidRatePercent, bidRatePercent, bidRateType,
      period, status, bidderName, bidderAddress: null, bidderContact: null,
      aenSubDivision: null, stampDuty: null, aps: null,
    });
  }

  works.sort((a, b) => a.sno - b.sno);
  return works;
}

export default router;
