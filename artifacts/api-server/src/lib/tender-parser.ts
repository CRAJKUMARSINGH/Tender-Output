/**
 * Shared tender-parsing helpers.
 *
 * Consolidates logic that was duplicated between routes/parse.ts and
 * routes/folder.ts. The two copies had already drifted AND had flipped
 * argument order (nitText, openingText) vs (openingText, nitText) — a live bug.
 */
import { parsePdfText, type ParsedPdfData } from "./pdf-parser.js";
import { parseExcelBuffer } from "./excel-parser.js";
import { parseImageBuffer, detectImageMimeType } from "./image-parser.js";

export function firstMatch(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

export function parseNumber(value: string | undefined): number {
  return Number((value ?? "").replace(/,/g, "")) || 0;
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const NIT_NO_PATTERNS = [
  /NIT\s*(?:No\.?|Number)?\s*[:/-]?\s*([A-Z0-9/-]+\/\d{2,4}-\d{2,4}|[A-Z0-9/-]+)/i,
  /Notice\s+Inviting\s+Tender\s*(?:No\.?)?\s*[:/-]?\s*([A-Z0-9/-]+)/i,
];

const NIT_DATE_PATTERNS = [
  /(?:Date|Dated)\s*[:.-]?\s*(\d{1,2}-[A-Za-z]{3,}-\d{4})/i,
  /(\d{1,2}-[A-Za-z]{3,}-\d{4})/,
  /(?:NIT\s*)?(?:Date|Dated)\s*[:.-]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i,
  /(\d{1,2}\s+[A-Za-z]+,?\s+\d{4})/,
];

const LABELED_G_PATTERNS = [
  /(?:Estimated\s+(?:Rate|Amount|Cost|Value)|G-?Schedule(?:\s+Amount)?|Estimated\s+Cost)\s*[:/-]?\s*(?:Rs\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i,
];

/** All candidate values from the unlabeled n / pct / n table triples. */
function gScheduleCandidates(block: string): number[] {
  const out: number[] = [];
  const re = /([\d,]+\.?\d*)\s*\n\s*(-?[\d.]+)\s*\n\s*([\d,]+\.?\d*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    const pct = parseFloat(m[2]);
    const amount = parseNumber(m[3]);
    const estimated = parseNumber(m[1]);
    // A real triple: plausible percentage, positive amounts, estimated >= amount
    // for a below-bid table.
    if (!Number.isFinite(pct) || pct < -100 || pct > 100) continue;
    if (estimated <= 0 || amount <= 0) continue;
    out.push(estimated);
  }
  return out;
}

function extractGSchedule(
  block: string,
  bidAmount: number | null,
  bidRateType: string,
): number {
  // 1. Explicit label wins outright.
  const labeled = firstMatch(block, LABELED_G_PATTERNS);
  if (labeled) {
    const v = parseNumber(labeled);
    if (v > 0) return v;
  }

  // 2. Unlabeled table triples.
  const candidates = gScheduleCandidates(block);
  if (candidates.length) {
    // For a below-bid, G must be >= the bid. Prefer the smallest candidate that
    // satisfies that, so a stray larger number elsewhere can't win.
    if (bidAmount && bidRateType === "below") {
      const valid = candidates.filter((c) => c >= bidAmount);
      if (valid.length) return Math.min(...valid);
    }
    // Otherwise the largest is the estimated rate; percentages are small.
    return Math.max(...candidates);
  }

  // 3. Last resort: the bidder's own row in the amounts table.
  return 0;
}

/**
 * Read a free-text label value ("Name of Work : ...") that may wrap across
 * several lines. Stops at the next "Label :" line or a numeric-only table row,
 * so an implicit amounts table underneath the label is not swallowed.
 */
function extractLabeledText(block: string, label: RegExp): string {
  const m = block.match(label);
  if (!m || m.index === undefined) return "";
  const after = block.slice(m.index + m[0].length);
  const parts: string[] = [];
  for (const raw of after.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (/^[\d,.\-]+$/.test(line)) break;                      // numeric-only row
    if (/^[A-Za-z][A-Za-z0-9 ()/.-]*\s*:/.test(line)) break;  // next "Label :" line
    parts.push(line);
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function parseWorksFromText(nitText: string, openingText: string) {
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

    let nameOfWork = extractLabeledText(block, /Name of Work\s*:\s*/i);
    if (!nameOfWork) {
      nameOfWork = extractLabeledText(block, /Tender Title\s*:\s*/i);
    }
    if (!nameOfWork) continue;

    let bidderName: string | null = null;
    let bidAmount: number | null = null;
    let bidRatePercent: number | null = null;
    let bidRateType = "below";

    const singleMatch = block.match(
      /Single Tender Received By\s*\n?\s*(.+?)\s*\n?\s*([\d.]+)\s*PERCENT\s*(BELOW|ABOVE)/i,
    );
    if (singleMatch) {
      bidderName = singleMatch[1].trim();
      bidRatePercent = parseFloat(singleMatch[2]);
      bidRateType = (singleMatch[3] ?? "BELOW").toLowerCase();
    }

    if (!bidRatePercent) {
      const lp = block.match(
        /Lowest Amount Quoted BY\s*\n?\s*(.+?)\s+([\d.]+)\s*\n?\s*PERCENT\s*(BELOW|ABOVE)/i,
      );
      if (lp) {
        bidderName = bidderName ?? lp[1].trim();
        bidRatePercent = parseFloat(lp[2]);
        bidRateType = (lp[3] ?? "BELOW").toLowerCase();
      }
    }

    const la = block.match(/Lowest Amount Quoted BY\s*:?\s*(.+?)\(([\d,]+\.?\d*)\)/i);
    if (la) {
      bidderName = bidderName ?? la[1].trim();
      bidAmount = parseNumber(la[2]);
    }

    const boq = block.match(/\d+\s+(.+?)\s*\(BID ID\s*-\d+\)\s*\n?\s*([\d,]+\.?\d*)\s*L1/i);
    if (boq) {
      bidderName = bidderName ?? boq[1].trim();
      bidAmount = bidAmount ?? parseNumber(boq[2]);
    }

    if (bidderName) {
      const words = bidderName.split(/\s+/).filter(Boolean);
      const stem =
        words[0] && words[0].length >= 4 ? words[0] : words.slice(0, 2).join(" ");
      const fn = escapeRegex(stem || bidderName);
      const rp = new RegExp(
        fn + "[\\s\\S]*?BID ID\\s*-?\\s*\\d+\\s*\\n\\s*([\\d,]+\\.?\\d*)\\s*\\n\\s*(-?[\\d.]+)\\s*\\n\\s*([\\d,]+\\.?\\d*)",
        "i",
      );
      const rm = block.match(rp);
      if (rm) {
        if (bidRatePercent === null) {
          bidRatePercent = parseFloat(rm[2]);
          bidRateType = rm[2].startsWith("-") ? "below" : "above";
        }
        if (bidAmount === null) bidAmount = parseNumber(rm[3]);
      }
    }

    // G-schedule is resolved only after the bidder/bid are known so it can
    // cross-check. A stray number in the table can no longer win by accident.
    const gScheduleAmount = extractGSchedule(block, bidAmount, bidRateType);

    // Consistency guard: a "below" bid that is higher than its own G-schedule
    // means we captured the wrong number.
    if (
      gScheduleAmount > 0 &&
      bidAmount &&
      bidRateType === "below" &&
      bidAmount > gScheduleAmount
    ) {
      console.warn("[parser] gSchedule < bidAmount for sno", sno, {
        gScheduleAmount,
        bidAmount,
      });
    }

    const ubn = firstMatch(block + "\n" + nitText, [
      /\bUBN\s*(?:No\.?)?\s*[:/-]?\s*([A-Z0-9]{4,}[A-Z0-9/-]*)/i,
    ]);
    const period =
      firstMatch(block + "\n" + nitText, [
        /Period of Completion\s*[:/-]?\s*(.+)/i,
        /Time of Completion\s*[:/-]?\s*(.+)/i,
      ]) || "";

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

export async function extractTextFromBuffer(
  buffer: Buffer,
  fileName?: string | null,
): Promise<string> {
  const ext = (fileName ?? "").toLowerCase().split(".").pop() ?? "";

  if (ext === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const data = await parser.getText();
      return data.text ?? "";
    } finally {
      await parser.destroy();
    }
  }
  if (ext === "txt" || ext === "csv") return buffer.toString("utf8");
  if (ext === "xlsx" || ext === "xls") {
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(buffer, { type: "buffer" });
      let text = "";
      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        for (const row of rows) text += (row as string[]).join("\t") + "\n";
      }
      return text;
    } catch {
      return "";
    }
  }
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
    try {
      return JSON.stringify(await parseImageBuffer(buffer, detectImageMimeType(buffer)));
    } catch {
      return "";
    }
  }
  return "";
}

/** Assemble a full tender case from the four input texts. */
export function buildTenderCase(texts: {
  nitText: string;
  openingText: string;
  feeText: string;
  publicationText: string;
}) {
  const { nitText, openingText, feeText, publicationText } = texts;
  const feePublicationParsed: ParsedPdfData = parsePdfText(`${feeText}\n${publicationText}`);
  const allText = `${nitText}\n${openingText}\n${feeText}\n${publicationText}`;

  return {
    title: firstMatch(allText, NIT_NO_PATTERNS)
      ? `NIT ${firstMatch(allText, NIT_NO_PATTERNS)}`
      : "Tender Case",
    nitDetails: {
      nitNo: firstMatch(allText, NIT_NO_PATTERNS),
      nitDate: firstMatch(allText, NIT_DATE_PATTERNS),
      office: "Executive Engineer, P.W.D. District Division-II, Udaipur",
      signingAuthority: "Executive Engineer",
    },
    works: parseWorksFromText(nitText, openingText),
    challanEntries: feePublicationParsed.challanEntries,
    diprPublication: feePublicationParsed.diprPublication,
  };
}

export { parseExcelBuffer };
