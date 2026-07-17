/**
 * Parse the NIT eGross Challan + DIPR Publication PDF text.
 *
 * Structure of the PDF text:
 * - STATEMENT OF EARNEST MONEY AND OTHER FEES DEPOSIT
 *   Per work: WORK S.NO. N — entries with GRN, Challan No, Date, Vendor, HeadCodes, Amounts
 * - EXCERPTS OF DIPR WEB PUBLICATION
 *   RO No., Release Details table
 */

export interface ChallanEntry {
  workSno: number;
  grnNo: string;
  challanNo: string;
  challanDate: string;
  vendorName: string;
  rislComm: number;
  head0075Amount: number;
  head8443Amount: number;
}

export interface DiprEntry {
  srNo: number;
  newspaperName: string;
  editionName: string;
  advtSize: string;
  sqCm: number;
  releaseDate: string;
  rate: number;
  amount: number;
}

export interface DiprPublication {
  roNo: string;
  releaseDate: string;
  nitNo: string;
  formIssuingDate: string;
  tenderOpeningDate: string;
  entries: DiprEntry[];
  totalAmount: number;
}

export interface ParsedPdfData {
  challanEntries: ChallanEntry[];
  diprPublication: DiprPublication | null;
  rawText: string;
}

function parseAmount(s: string): number {
  // Remove commas, trim, parse
  return parseFloat(s.replace(/,/g, "").trim()) || 0;
}

export function parsePdfText(text: string): ParsedPdfData {
  const challanEntries: ChallanEntry[] = [];
  let diprPublication: DiprPublication | null = null;

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // ── CHALLAN SECTION ────────────────────────────────────────────────────────
  let currentWorkSno = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    // Detect work section header
    const workMatch = line.match(/WORK\s+S\.?\s*NO\.?\s*(\d+)/i);
    if (workMatch) {
      currentWorkSno = parseInt(workMatch[1]!);
      i++;
      continue;
    }

    // Stop at DIPR section
    if (line.includes("DIPR WEB PUBLICATION") || line.includes("EXCERPTS OF DIPR")) {
      break;
    }

    // Detect a challan row: starts with a number (sno), then GRN, Challan, Date, Vendor...
    // Pattern: optional sno, GRN No (9 digits), Challan No (8 digits), Date (d/m/yyyy), Vendor
    const challanMatch = line.match(/(\d{9})\s+(\d{8})\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(.*)/);
    if (challanMatch && currentWorkSno > 0) {
      const grnNo = challanMatch[1]!;
      const challanNo = challanMatch[2]!;
      const challanDate = challanMatch[3]!;
      let vendorName = challanMatch[4]!.trim();

      // Vendor name may continue on next line(s) before amount lines
      while (
        i + 1 < lines.length &&
        !lines[i + 1]!.match(/RISL|0075|8443|\d{3,}\.00/)
      ) {
        i++;
        const nextLine = lines[i]!;
        if (
          nextLine.match(/WORK\s+S\.?\s*NO/i) ||
          nextLine.match(/DIPR/i) ||
          nextLine.match(/^\d+\s+\d{9}/)
        ) {
          break;
        }
        vendorName += " " + nextLine;
      }
      vendorName = vendorName.replace(/RISL.*/i, "").trim();

      // Read amount lines
      let rislComm = 0;
      let head0075 = 0;
      let head8443 = 0;

      for (let j = 1; j <= 5 && i + j < lines.length; j++) {
        const amtLine = lines[i + j]!;
        if (amtLine.match(/RISL/i)) {
          const amtMatch = amtLine.match(/([\d,]+\.\d{2})\s*$/);
          if (amtMatch) rislComm = parseAmount(amtMatch[1]!);
        } else if (amtLine.includes("0075-00-800-52-01")) {
          const amtMatch = amtLine.match(/([\d,]+\.\d{2})\s*$/);
          if (amtMatch) head0075 = parseAmount(amtMatch[1]!);
        } else if (amtLine.includes("8443-00-108-00-00")) {
          const amtMatch = amtLine.match(/([\d,]+\.\d{2})\s*$/);
          if (amtMatch) head8443 = parseAmount(amtMatch[1]!);
        } else if (
          amtLine.match(/WORK\s+S\.?\s*NO/i) ||
          amtLine.match(/DIPR/i) ||
          amtLine.match(/^\d+\s+\d{9}/)
        ) {
          break;
        }
      }

      challanEntries.push({
        workSno: currentWorkSno,
        grnNo,
        challanNo,
        challanDate,
        vendorName: vendorName.trim(),
        rislComm,
        head0075Amount: head0075,
        head8443Amount: head8443,
      });
    }

    i++;
  }

  // ── DIPR SECTION ───────────────────────────────────────────────────────────
  const diprStart = lines.findIndex(
    (l) => l.includes("DIPR WEB PUBLICATION") || l.includes("EXCERPTS OF DIPR")
  );

  if (diprStart !== -1) {
    const diprLines = lines.slice(diprStart);

    // RO No
    const roMatch = diprLines.join(" ").match(/RO\s*No[.\s]*:?\s*(\d+)/i);
    const roNo = roMatch ? roMatch[1]! : "";

    // Release date
    const relDateMatch = diprLines.join(" ").match(/(\d+\s+\w+,?\s+\d{4})/);
    const releaseDate = relDateMatch ? relDateMatch[1]! : "";

    // NIT No
    const nitMatch = diprLines.join(" ").match(/NIT\s+No[.\s]+([A-Z-\d]+)/i);
    const nitNo = nitMatch ? nitMatch[1]! : "";

    // Parse table entries
    const diprEntries: DiprEntry[] = [];
    let diprSrNo = 1;
    let totalAmount = 0;

    for (const dLine of diprLines) {
      // Match: srNo  NEWSPAPER  EDITION  SIZE  sqCm  DATE  RATE  AMOUNT
      // e.g.: "1  KHABAR SAMRAT  UDAIPUR  4x2  32  4 July, 2026  23.08  738.56"
      const entryMatch = dLine.match(
        /^(\d+)\s+([A-Z][A-Z\s]+?)\s{2,}([A-Z][A-Z\s]+?)\s{2,}([\dx]+)\s+([\d.]+)\s+(.+?)\s+([\d.]+)\s+([\d,]+\.?\d*)\s*$/i
      );
      if (entryMatch) {
        const amount = parseAmount(entryMatch[8]!);
        diprEntries.push({
          srNo: diprSrNo++,
          newspaperName: entryMatch[2]!.trim(),
          editionName: entryMatch[3]!.trim(),
          advtSize: entryMatch[4]!.trim(),
          sqCm: parseFloat(entryMatch[5]!),
          releaseDate: entryMatch[6]!.trim(),
          rate: parseFloat(entryMatch[7]!),
          amount,
        });
        totalAmount += amount;
      }

      // Total Amount line
      const totalMatch = dLine.match(/Total\s+Amount[:\s]+([\d,]+\.?\d*)/i);
      if (totalMatch) {
        totalAmount = parseAmount(totalMatch[1]!);
      }
    }

    if (roNo || diprEntries.length > 0) {
      diprPublication = {
        roNo,
        releaseDate,
        nitNo,
        formIssuingDate: "",
        tenderOpeningDate: "",
        entries: diprEntries,
        totalAmount,
      };
    }
  }

  // Sort challan entries by workSno to match Excel order
  challanEntries.sort((a, b) => a.workSno - b.workSno);
  return { challanEntries, diprPublication, rawText: text };
}
