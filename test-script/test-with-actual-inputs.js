
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputsDir = path.join(__dirname, '..', 'test-data', 'NIT-07', 'Inputs');
const outputsDir = path.join(__dirname, '..', 'test-data', 'NIT-07', 'outputs');

// Helper to get file as base64
function fileToBase64(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return fileBuffer.toString('base64');
}

// Import parse functions
async function loadAndParse() {
  console.log('Loading and parsing input files...');
  const nitPdfPath = path.join(inputsDir, 'NIT-07-TENDER.pdf');
  const openingPdfPath = path.join(inputsDir, 'NIT6Opening.pdf');
  const feeXlsxPath = path.join(inputsDir, 'NIT-07- EMD-FEES- PUBLICATION DETAILS.xlsx');
  const emdXlsxPath = path.join(inputsDir, 'emd deposit.xlsx');

  // Get base64 data
  const nitPdfBase64 = fs.existsSync(nitPdfPath) ? fileToBase64(nitPdfPath) : null;
  const openingPdfBase64 = fs.existsSync(openingPdfPath) ? fileToBase64(openingPdfPath) : null;
  const feeFileBase64 = fs.existsSync(feeXlsxPath) ? fileToBase64(feeXlsxPath) : null;
  const publicationPdfBase64 = null;

  // Import parse functions dynamically (since they're TypeScript)
  // Wait let's copy parsePdfText and extractTextFromFile and parseWorksFromText from api-server!
  // Wait alternatively, let's read the Excel files directly with xlsx!
  // Import pdf-parse now (we installed 1.1.1)
  const pdfParse = (await import('pdf-parse')).default;
  
  // Read TENDER.pdf from outputs
  const tenderPdfPath = path.join(__dirname, '..', 'test-data', 'NIT-07', 'outputs', 'TENDER.pdf');
  const tenderBuffer = fs.readFileSync(tenderPdfPath);
  const tenderData = await pdfParse(tenderBuffer);
  console.log('Tender PDF text first 8000 chars:', tenderData.text.slice(0, 8000));
  
  // Import xlsx the right way!
  const xlsxModule = await import('xlsx');
  const XLSX = xlsxModule.default || xlsxModule;
  const utils = XLSX.utils || xlsxModule.utils;
  
  // Read fee xlsx
  const feeBuffer = fs.readFileSync(feeXlsxPath);
  const feeWb = XLSX.read(feeBuffer, { type: 'buffer' });
  console.log('feeWb sheets:', feeWb.SheetNames);
}

loadAndParse();
