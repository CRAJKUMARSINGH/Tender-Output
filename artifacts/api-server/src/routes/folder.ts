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
import { computeWork } from "../lib/compute.js";
import { buildTenderCase, extractTextFromBuffer } from "../lib/tender-parser.js";
import { safeSegment } from "../lib/http.js";
import {
  generateScrutinyNoteSheet,
  generateAcceptanceLetters,
  generateChallanVerificationSheet,
  generatePublicationCostStatement,
  generatePlaceholderDocument,
  generateMasterRecord,
  generateWorkOrders,
  generateNegotiationLetters,
  generateNegotiationReplyFormats,
  generateBankBgLetters,
} from "../lib/doc-generator.js";

const router = Router();

// ── Helpers ──────────────────────────────────────────────────────────

// Broken symlinks and entries removed between readdir and stat no longer crash.
function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    try {
      if (ent.isFile()) out.push(full);
      else if (ent.isSymbolicLink() && fs.statSync(full).isFile()) out.push(full);
    } catch {
      // broken symlink, or removed between readdir and stat — skip
    }
  }
  return out;
}

function resolveDir(input: string, opts: { mustExist: boolean }): string {
  if (input.includes("\0")) throw new Error("path contains a null byte");
  const resolved = path.resolve(input);

  const roots = (process.env.ALLOWED_FS_ROOTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (roots.length) {
    const inside = roots.some((r) => {
      const rr = path.resolve(r);
      return resolved === rr || resolved.startsWith(rr + path.sep);
    });
    if (!inside) throw new Error(`Path outside ALLOWED_FS_ROOTS: ${resolved}`);
  }
  if (opts.mustExist && !fs.existsSync(resolved)) {
    throw new Error(`Directory not found: ${resolved}`);
  }
  return resolved;
}

async function extractTextFromDisk(filePath: string): Promise<string> {
  return extractTextFromBuffer(fs.readFileSync(filePath), filePath);
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

  let root: string;
  try {
    root = resolveDir(String(dir), { mustExist: true });
  } catch (err) {
    return res.status(404).json({ error: String(err) });
  }

  try {
    // Accept either the NIT-XX root or its Inputs subfolder
    let inputDir = root;
    const inputsSub = path.join(root, "Inputs");
    const inputsSubLower = path.join(root, "inputs");
    if (fs.existsSync(inputsSub)) inputDir = inputsSub;
    else if (fs.existsSync(inputsSubLower)) inputDir = inputsSubLower;

    const files = listFiles(inputDir);

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

    // Same parser as /parse/tender-case — one source of truth for the heuristics.
    const tenderCase = buildTenderCase({ nitText, openingText, feeText, publicationText });

    return res.json({
      inputDir,
      files: { nit: nitFile, opening: openingFile, fee: feeFile, publication: publicationFile },
      ...tenderCase,
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
    const outDir = resolveDir(String(outputDir), { mustExist: false });
    // Guarantee the destination exists before any writeFileSync.
    fs.mkdirSync(outDir, { recursive: true });

    const nit = sessionData.nitDetails ?? {};
    const works = (sessionData.works ?? []).map((w: any) => ({
      ...w,
      ...computeWork(w),
    }));
    const challanEntries = sessionData.challanEntries ?? [];
    const dipr = sessionData.diprPublication ?? null;
    const bgVerifications = sessionData.bgVerifications ?? [];
    const nitNoSafe = safeSegment(nit.nitNo ?? "NIT", "NIT");

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
            : generatePlaceholderDocument(
                "NIT Publication Cost Statement",
                "No DIPR data available.",
              ),
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
        const filePath = path.join(outDir, def.filename);
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

export default router;
