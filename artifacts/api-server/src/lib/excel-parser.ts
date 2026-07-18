/**
 * Excel parser for the PWD NIT master input spreadsheet.
 *
 * The Excel is the human-curated master input — the user takes raw eGras
 * challan data (a flat portal dump with no work grouping) and manually assigns
 * each challan to its work number, then appends DIPR publication data below.
 * This file reads that organised Excel and returns the exact same data shapes
 * that the rest of the system (doc-generator, NIT session store) already uses.
 *
 * ── Excel structure ──────────────────────────────────────────────────────────
 *
 *  Row 1  : Title          "NIT NO-7 / 26-27 STATEMENT OF EARNEST MONEY…"
 *  Row 2  : Column headers  Sno | GRN No | Challan No | Challan Date | Vendor | HeadCode | Amount
 *
 *  [Challan section — one block per work]
 *  Row N  : Work header    "WORK S.NO.1   TOTAL PARTICIPANTS - ONE"
 *  Row N+1: Participant    1 | 126623182 | 24663348 | 10/7/26 | MAESTRO… | RISL Comm: Not to be included | 500.00
 *  Row N+2: Sub-row                                                        | 0075-00-800-52-01              | 500.00
 *  Row N+3: Sub-row                                                        | 8443-00-108-00-00              | 19,425.00
 *  … repeated for every participant in this work, then next work block …
 *
 *  [DIPR section — after a blank separator row]
 *  Row M  : "EXCERPTS OF DIPR WEB PUBLICATION"
 *  Row M+1: Headers   RO No. | Release Date | NIT No | Form Issuing Date | Form Submission Date | Tender Opening Date
 *  Row M+2: Values    11632  | 4 July, 2026 | D-463  | 3 July, 2026      | 3 July, 2026          | 3 July, 2026
 *  Row M+3: (blank)
 *  Row M+4: "Release Details RO Number : 11632"
 *  Row M+5: Headers   Sr. No. | News Paper Name | Edition Name | Advt. Size | Sq.cm. | Release Date | Rate | Amount
 *  Row M+6…: Newspaper entries
 *  Last row: (blank) | … | Total Amount: | (blank) | 25,874.24
 */

import XLSX from "xlsx";
import type { ChallanEntry, DiprEntry, DiprPublication } from "./pdf-parser.js";

export interface ExcelParseResult {
  challanEntries: ChallanEntry[];
  diprPublication: DiprPublication | null;
  workParticipantCounts: Record<number, number>; // workSno → participant count
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function str(v: unknown): string {
  return String(v ?? "").trim();
}

function parseAmount(v: unknown): number {
  return parseFloat(str(v).replace(/,/g, "")) || 0;
}

/**
 * Normalise date strings from the Excel.
 * "10/7/26" (dd/mm/yy)  →  "10/7/2026"
 * "09-07-2026"           →  "09/07/2026"
 * "4 July, 2026"         →  "4 July, 2026"  (already human-readable, keep as-is)
 */
function normaliseDate(raw: unknown): string {
  const s = str(raw);
  // dd/mm/yy → dd/mm/20yy
  const shortSlash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (shortSlash) return `${shortSlash[1]}/${shortSlash[2]}/20${shortSlash[3]}`;
  // dd-mm-yyyy → dd/mm/yyyy
  const dashFull = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashFull) return `${dashFull[1]}/${dashFull[2]}/${dashFull[3]}`;
  return s;
}

// ── Main parser ───────────────────────────────────────────────────────────────

export function parseExcelBuffer(buffer: Buffer): ExcelParseResult {
  const wb = XLSX.read(buffer, { type: "buffer", raw: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { challanEntries: [], diprPublication: null, workParticipantCounts: {} };

  const ws = wb.Sheets[sheetName]!;
  const rows: string[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: "",
    raw: false,
  }) as string[][];

  const challanEntries: ChallanEntry[] = [];
  const workParticipantCounts: Record<number, number> = {};

  // DIPR state
  let diprRoNo = "";
  let diprReleaseDate = "";
  let diprNitNo = "";
  let diprFormIssuingDate = "";
  let diprFormSubmissionDate = "";
  let diprTenderOpeningDate = "";
  const diprEntries: DiprEntry[] = [];
  let diprTotal = 0;

  let currentWorkSno = 0;
  let pending: Partial<ChallanEntry> | null = null;
  let inDipr = false;
  let diprTableStarted = false;

  function finalisePending() {
    if (pending?.grnNo) {
      challanEntries.push({
        workSno: pending.workSno ?? 0,
        grnNo: pending.grnNo,
        challanNo: pending.challanNo ?? "",
        challanDate: pending.challanDate ?? "",
        vendorName: pending.vendorName ?? "",
        rislComm: pending.rislComm ?? 0,
        head0075Amount: pending.head0075Amount ?? 0,
        head8443Amount: pending.head8443Amount ?? 0,
      });
    }
    pending = null;
  }

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri]!;
    const c0 = str(row[0]);
    const c1 = str(row[1]);
    const c2 = str(row[2]);
    const c3 = str(row[3]);
    const c4 = str(row[4]);
    const c5 = str(row[5]);
    const c6 = str(row[6]);
    const c7 = str(row[7]);

    // ── Detect DIPR section start ───────────────────────────────────────────
    if (c0.toUpperCase().includes("EXCERPTS OF DIPR") || c0.toUpperCase().includes("DIPR WEB PUBLICATION")) {
      finalisePending();
      inDipr = true;
      continue;
    }

    // ══════════════════════════════════════════════════════════════════════════
    if (!inDipr) {
      // ── Challan section ───────────────────────────────────────────────────

      // Work section header: "WORK S.NO.1   TOTAL PARTICIPANTS - THREE"
      const workMatch = c0.match(/WORK\s+S\.?\s*NO\.?\s*(\d+)/i);
      if (workMatch) {
        finalisePending();
        currentWorkSno = parseInt(workMatch[1]!);

        // Extract participant count from the header text
        const countMatch = c0.match(/TOTAL\s+PARTICIPANTS\s*[-–]\s*(\w+)/i);
        if (countMatch) {
          const word = countMatch[1]!.toUpperCase();
          const wordMap: Record<string, number> = {
            ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, SIX: 6,
            SEVEN: 7, EIGHT: 8, NINE: 9, TEN: 10,
          };
          workParticipantCounts[currentWorkSno] = wordMap[word] ?? 0;
        }
        continue;
      }

      // Skip title / column-header rows
      if (c0 === "Sno" || c0.toLowerCase().startsWith("nit no")) {
        continue;
      }

      // Participant row: c0 is a serial number, c1 is GRN No (non-empty)
      if (/^\d+$/.test(c0) && c1 !== "" && currentWorkSno > 0) {
        finalisePending();

        // RISL commission is on the same row in column F (c5) / amount in G (c6)
        const rislComm = c5.toUpperCase().includes("RISL") ? parseAmount(c6) : 0;

        pending = {
          workSno: currentWorkSno,
          grnNo: c1,
          challanNo: c2,
          challanDate: normaliseDate(c3),
          vendorName: c4,
          rislComm,
          head0075Amount: 0,
          head8443Amount: 0,
        };
        continue;
      }

      // Amount sub-row: c0 is blank, c5 has the head code, c6 has the amount
      if (c0 === "" && c5 !== "" && pending) {
        if (c5.includes("0075")) {
          pending.head0075Amount = parseAmount(c6);
        } else if (c5.includes("8443")) {
          pending.head8443Amount = parseAmount(c6);
        } else if (c5.toUpperCase().includes("RISL")) {
          // RISL comm can also appear as a sub-row in some formats
          pending.rislComm = parseAmount(c6);
        }
      }

    } else {
      // ── DIPR section ─────────────────────────────────────────────────────

      // Metadata header row: "RO No." | "Release Date" | "NIT No" | …
      if (c0 === "RO No." || c0 === "RO No" || c0 === "RO NO.") {
        // The NEXT row is the values row
        const valRow = rows[ri + 1];
        if (valRow) {
          diprRoNo            = str(valRow[0]);
          diprReleaseDate     = str(valRow[1]);
          diprNitNo           = str(valRow[2]);
          diprFormIssuingDate = str(valRow[3]);
          diprFormSubmissionDate = str(valRow[4]);
          diprTenderOpeningDate  = str(valRow[5]);
          ri++; // consume the values row
        }
        continue;
      }

      // Newspaper table header row
      if (c0 === "Sr. No." || c0 === "Sr.No." || c0.toLowerCase().startsWith("sr")) {
        diprTableStarted = true;
        continue;
      }

      // "Release Details …" separator line — skip
      if (c0.toLowerCase().startsWith("release details")) {
        continue;
      }

      // Total Amount row — always in the last data row
      // Col F (c5) = "Total Amount:" and Col H (c7) = amount value
      if (c5.toLowerCase().includes("total amount") || c0.toLowerCase().includes("total amount")) {
        diprTotal = parseAmount(c7 || c6);
        continue;
      }

      // Newspaper entry row: c0 is Sr.No number, c1 is newspaper name
      if (diprTableStarted && /^\d+$/.test(c0) && c1 !== "") {
        const amount = parseAmount(c7);
        diprEntries.push({
          srNo: parseInt(c0),
          newspaperName: c1,
          editionName: c2,
          advtSize: c3,
          sqCm: parseFloat(c4) || 0,
          releaseDate: c5,
          rate: parseFloat(c6) || 0,
          amount,
        });
      }
    }
  }

  // Finalise any entry that was still pending at EOF
  finalisePending();

  // Derive total from entries if the Total row wasn't found
  if (diprTotal === 0 && diprEntries.length > 0) {
    diprTotal = diprEntries.reduce((s, e) => s + e.amount, 0);
  }

  // Build DiprPublication only if we have something meaningful
  const diprPublication: DiprPublication | null =
    diprRoNo || diprEntries.length > 0
      ? {
          roNo: diprRoNo,
          releaseDate: diprReleaseDate,
          nitNo: diprNitNo,
          formIssuingDate: diprFormIssuingDate,
          formSubmissionDate: diprFormSubmissionDate,
          tenderOpeningDate: diprTenderOpeningDate,
          entries: diprEntries,
          totalAmount: diprTotal,
        }
      : null;

  // Sort by work then by challan order within work
  challanEntries.sort((a, b) => a.workSno - b.workSno);

  return { challanEntries, diprPublication, workParticipantCounts };
}
