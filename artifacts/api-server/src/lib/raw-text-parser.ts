/**
 * Parser for raw tab-separated eGras portal text.
 *
 * Usage: user opens eGras portal in browser, selects all text in the
 * challan table, copies it, and pastes into the API body.
 *
 * Expected format (TSV, 8 columns):
 *
 *   Sno  GRN No  Challan No  Challan Date  Vendor  HeadCode  Amount  Status/Action
 *   1.   126552493  24601390  09-07-2026  Someshwar InfraProjects  RISL Comm: Not to be included  500.00    Include in wam Account
 *    (blank)  (blank)  (blank)  (blank)  0075-00-800-52-01  500.00
 *    (blank)  (blank)  (blank)  (blank)  8443-00-108-00-00  19,800.00
 *   2.   ...
 *
 * Each participant occupies exactly 3 rows:
 *   Row A — Sno, GRN, Challan, Date, Vendor, "RISL Comm: Not to be included", rislComm
 *   Row B — blanks, 0075-00-800-52-01, head0075Amount
 *   Row C — blanks, 8443-00-108-00-00, head8443Amount
 *
 * Returns a flat list (workSno = 0) because eGras has no work grouping.
 */

import type { ChallanEntry } from "./pdf-parser.js";

/** Strip all commas (Indian number format) and parse float */
function parseAmount(raw: string): number {
  if (!raw) return 0;
  return parseFloat(raw.replace(/,/g, "").trim()) || 0;
}

export function parseRawEgrasText(text: string): ChallanEntry[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd());

  const results: ChallanEntry[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip blank lines and the header row
    if (!line || !line.trim()) { i++; continue; }
    const cols = line.split("\t");
    const snoCol = cols[0]?.trim() ?? "";

    // Header detection: starts with "Sno" (case-insensitive)
    if (/^sno$/i.test(snoCol)) { i++; continue; }

    // Main entry row: Sno column matches "N." pattern (e.g. "1.", "10.")
    if (/^\d+\.$/.test(snoCol)) {
      const grnNo     = (cols[1] ?? "").trim();
      const challanNo = (cols[2] ?? "").trim();
      const challanDate = (cols[3] ?? "").trim();
      const vendorName  = (cols[4] ?? "").trim();
      const headCode    = (cols[5] ?? "").trim();
      const amountRaw   = (cols[6] ?? "").trim();

      // Row A must be the RISL Comm row
      const rislComm = headCode.toLowerCase().includes("risl") ? parseAmount(amountRaw) : 0;

      let head0075Amount = 0;
      let head8443Amount = 0;

      // Read the next two sub-rows
      for (let sub = 1; sub <= 2; sub++) {
        const subLine = lines[i + sub] ?? "";
        if (!subLine.trim()) continue;
        const subCols  = subLine.split("\t");
        const subSno   = (subCols[0] ?? "").trim();
        // Sub-rows have blank Sno column
        if (subSno !== "" && /^\d+\.$/.test(subSno)) break; // next main row reached early
        const subHead  = (subCols[5] ?? "").trim();
        const subAmt   = (subCols[6] ?? "").trim();
        if (subHead.includes("0075")) head0075Amount = parseAmount(subAmt);
        else if (subHead.includes("8443")) head8443Amount = parseAmount(subAmt);
      }

      results.push({
        workSno: 0,
        grnNo,
        challanNo,
        challanDate,
        vendorName,
        rislComm,
        head0075Amount,
        head8443Amount,
      });

      i += 3; // skip the two sub-rows we just consumed
      continue;
    }

    i++;
  }

  return results;
}
