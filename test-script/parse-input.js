
import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputsDir = path.join(__dirname, '..', 'test-data', 'NIT-07', 'Inputs');

console.log('Reading NIT-07 EMD FEES PUBLICATION DETAILS.xlsx...');
const nitXlsxPath = path.join(inputsDir, 'NIT-07- EMD-FEES- PUBLICATION DETAILS.xlsx');
const nitWb = xlsx.readFile(nitXlsxPath);
nitWb.SheetNames.forEach(name => {
  console.log(`=== Sheet: ${name} ===`);
  const ws = nitWb.Sheets[name];
  console.log(xlsx.utils.sheet_to_json(ws, { header: 1 }));
  console.log('---');
});

console.log('\nReading emd deposit.xlsx...');
const emdXlsxPath = path.join(inputsDir, 'emd deposit.xlsx');
const emdWb = xlsx.readFile(emdXlsxPath);
emdWb.SheetNames.forEach(name => {
  console.log(`=== Sheet: ${name} ===`);
  const ws = emdWb.Sheets[name];
  console.log(xlsx.utils.sheet_to_json(ws, { header: 1 }));
  console.log('---');
});
