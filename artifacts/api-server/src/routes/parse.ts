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

export default router;
