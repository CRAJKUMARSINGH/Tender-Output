import { Router } from "express";
import { parsePdfText } from "../lib/pdf-parser.js";
import { ParseChallanPdfBody } from "@workspace/api-zod";

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

  // Sort works by sno to match Excel order
  works.sort((a, b) => a.sno - b.sno);
  return works;
}

async function extractTextFromFile(fileBase64?: string | null, fileName?: string): Promise<string> {
  if (!fileBase64) return "";
  const buffer = Buffer.from(fileBase64, "base64");
  
  // For PDF
  if (fileName?.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text ?? "";
  }
  
  // For plain text files
  if (fileName?.endsWith(".txt") || fileName?.endsWith(".csv")) {
    return buffer.toString("utf8");
  }
  
  // For Excel files
  if (fileName?.endsWith(".xlsx") || fileName?.endsWith(".xls")) {
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      let text = "";
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        for (const row of jsonData) {
          text += row.join("\t") + "\n";
        }
      }
      return text;
    } catch (e) {
      console.error("Error parsing Excel file:", e);
      return "";
    }
  }
  
  // For images - we can add OCR later, for now just return empty
  return "";
}

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

    // For now, we'll ignore the images - we can add OCR later
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
