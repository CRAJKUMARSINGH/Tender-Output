/**
 * Image-based challan/DIPR parser.
 *
 * Uses Google Gemini 2.0 Flash (free tier) as primary vision model.
 * Falls back to OpenAI GPT-4o if GOOGLE_API_KEY is absent.
 *
 * Accepts any image containing challan or DIPR publication table data:
 *   - Screenshot of the eGras portal  (flat list, no work grouping)
 *   - Photo/scan of the user's Excel  (with WORK S.NO. headers)
 *   - Any printed or digital table with GRN/Challan/HeadCode/Amount columns
 *
 * When the image is a raw eGras screenshot the challans have no work number.
 * In that case workSno is returned as 0, and the caller assigns them later.
 *
 * API key requirements:
 *   GOOGLE_API_KEY — Google AI Studio key (aistudio.google.com) with billing enabled
 *   OPENAI_API_KEY — OpenAI key with active quota/billing (fallback only)
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import type { ChallanEntry, DiprPublication } from "./pdf-parser.js";

export interface ImageParseResult {
  challanEntries: ChallanEntry[];
  diprPublication: DiprPublication | null;
  /** true when image had no WORK S.NO. headers — all workSno values are 0 */
  flatList: boolean;
  /** which AI provider was used */
  provider: "gemini" | "openai";
}

// ── Shared prompt ─────────────────────────────────────────────────────────────
const PROMPT = `You are a data-extraction assistant for Indian PWD (Public Works Department)
government tender documents. Extract challan and DIPR publication table data from this image and
return ONLY valid JSON matching the schema below — no markdown, no explanation.

The image may contain ONE or BOTH of the following sections:

SECTION 1: CHALLAN TABLE
Columns: Sno | GRN No | Challan No | Challan Date | Vendor | HeadCode | Amount

Each participant has THREE rows sharing the same GRN/Challan/Date/Vendor:
  Row A (RISL):  HeadCode contains "RISL Comm"                 -> rislComm amount
  Row B (0075):  HeadCode = "0075-00-800-52-01"                -> head0075Amount (tender fee)
  Row C (8443):  HeadCode = "8443-00-108-00-00"                -> head8443Amount (EMD)

The image may show:
  ORGANISED format — "WORK S.NO. 1  TOTAL PARTICIPANTS - TWO" section headers group
                      challans by work number. Use those numbers as workSno.
  FLAT format      — No work headers; challans listed sequentially from the eGras portal.
                      Set workSno = 0 for all entries.

SECTION 2: DIPR WEB PUBLICATION TABLE
Header:  RO No. | Release Date | NIT No | Form Issuing Date | Form Submission Date | Tender Opening Date
Rows:    Sr.No | News Paper Name | Edition Name | Advt. Size | Sq.cm | Release Date | Rate | Amount
Footer:  Total Amount

Return ONLY this JSON (no markdown fences):

{
  "flatList": boolean,
  "challanEntries": [
    {
      "workSno": number,
      "grnNo": string,
      "challanNo": string,
      "challanDate": string,
      "vendorName": string,
      "rislComm": number,
      "head0075Amount": number,
      "head8443Amount": number
    }
  ],
  "diprPublication": {
    "roNo": string,
    "releaseDate": string,
    "nitNo": string,
    "formIssuingDate": string,
    "formSubmissionDate": string,
    "tenderOpeningDate": string,
    "entries": [
      {
        "srNo": number,
        "newspaperName": string,
        "editionName": string,
        "advtSize": string,
        "sqCm": number,
        "releaseDate": string,
        "rate": number,
        "amount": number
      }
    ],
    "totalAmount": number
  } | null
}

Rules:
- Remove commas from numbers before parsing (e.g. "19,425.00" -> 19425)
- If a head code row is missing, set that amount to 0
- Preserve vendor names and dates exactly as shown
- If you cannot read a value clearly, use "" for strings and 0 for numbers
- Do NOT invent data that is not visible in the image`;

// ── Result parser (shared) ────────────────────────────────────────────────────
function parseModelResponse(raw: string): {
  challanEntries: ChallanEntry[];
  diprPublication: DiprPublication | null;
  flatList: boolean;
} {
  const jsonText = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed: {
    flatList: boolean;
    challanEntries: ChallanEntry[];
    diprPublication: DiprPublication | null;
  };

  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(
      `Vision model returned non-JSON. Raw (first 500 chars):\n${raw.slice(0, 500)}`
    );
  }

  const entries: ChallanEntry[] = (parsed.challanEntries ?? []).map((e) => ({
    workSno: Number(e.workSno ?? 0),
    grnNo: String(e.grnNo ?? ""),
    challanNo: String(e.challanNo ?? ""),
    challanDate: String(e.challanDate ?? ""),
    vendorName: String(e.vendorName ?? ""),
    rislComm: Number(e.rislComm ?? 0),
    head0075Amount: Number(e.head0075Amount ?? 0),
    head8443Amount: Number(e.head8443Amount ?? 0),
  }));

  let dipr: DiprPublication | null = null;
  if (parsed.diprPublication) {
    const d = parsed.diprPublication;
    dipr = {
      roNo: String(d.roNo ?? ""),
      releaseDate: String(d.releaseDate ?? ""),
      nitNo: String(d.nitNo ?? ""),
      formIssuingDate: String(d.formIssuingDate ?? ""),
      formSubmissionDate: String(d.formSubmissionDate ?? ""),
      tenderOpeningDate: String(d.tenderOpeningDate ?? ""),
      totalAmount: Number(d.totalAmount ?? 0),
      entries: (d.entries ?? []).map((e, i) => ({
        srNo: Number(e.srNo ?? i + 1),
        newspaperName: String(e.newspaperName ?? ""),
        editionName: String(e.editionName ?? ""),
        advtSize: String(e.advtSize ?? ""),
        sqCm: Number(e.sqCm ?? 0),
        releaseDate: String(e.releaseDate ?? ""),
        rate: Number(e.rate ?? 0),
        amount: Number(e.amount ?? 0),
      })),
    };
    if (dipr.totalAmount === 0 && dipr.entries.length > 0) {
      dipr.totalAmount = dipr.entries.reduce((s, e) => s + e.amount, 0);
    }
  }

  entries.sort((a, b) => a.workSno - b.workSno);

  return {
    challanEntries: entries,
    diprPublication: dipr,
    flatList: parsed.flatList ?? entries.every((e) => e.workSno === 0),
  };
}

// ── Gemini provider ───────────────────────────────────────────────────────────
async function runGemini(
  imageBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("GOOGLE_API_KEY not set");

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent([
    PROMPT,
    {
      inlineData: {
        mimeType,
        data: imageBuffer.toString("base64"),
      },
    },
  ]);

  return result.response.text();
}

// ── OpenAI provider (fallback) ────────────────────────────────────────────────
async function runOpenAI(
  imageBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");

  const client = new OpenAI({ apiKey: key });
  const b64 = imageBuffer.toString("base64");

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: PROMPT },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${b64}`,
              detail: "high",
            },
          },
        ],
      },
    ],
  });

  return response.choices[0]?.message?.content ?? "";
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function parseImageBuffer(
  imageBuffer: Buffer,
  mimeType: "image/png" | "image/jpeg" | "image/webp" | "image/gif" = "image/png"
): Promise<ImageParseResult> {
  const hasGemini = !!process.env.GOOGLE_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  if (!hasGemini && !hasOpenAI) {
    throw new Error(
      "No vision API key configured. Set GOOGLE_API_KEY (recommended, get from aistudio.google.com) " +
      "or OPENAI_API_KEY."
    );
  }

  let raw: string;
  let provider: "gemini" | "openai";

  if (hasGemini) {
    raw = await runGemini(imageBuffer, mimeType);
    provider = "gemini";
  } else {
    raw = await runOpenAI(imageBuffer, mimeType);
    provider = "openai";
  }

  const { challanEntries, diprPublication, flatList } = parseModelResponse(raw);

  return { challanEntries, diprPublication, flatList, provider };
}

// ── MIME type detection from buffer header bytes ──────────────────────────────
export function detectImageMimeType(
  buf: Buffer
): "image/png" | "image/jpeg" | "image/webp" | "image/gif" {
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[4] === 0x57) return "image/webp";
  if (buf[0] === 0x47 && buf[1] === 0x49) return "image/gif";
  return "image/png";
}
