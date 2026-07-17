
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mammoth from 'mammoth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputsDir = path.join(__dirname, '..', 'test-data', 'NIT-07', 'outputs');

async function readDocx(filename) {
  const filePath = path.join(outputsDir, filename);
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });
  console.log(`\n=== ${filename} ===`);
  console.log(result.value);
  // Also save to a text file for easy reading
  fs.writeFileSync(path.join(outputsDir, `${filename}.txt`), result.value, 'utf8');
}

async function main() {
  await readDocx('Tender_Scrutiny_Note_Sheet_Formatted.docx');
  await readDocx('sn5 negotiation.docx');
  await readDocx('s5-Negotiation-Reply.docx');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
