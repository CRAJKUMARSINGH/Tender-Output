
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../');
const testDataInputs = path.join(projectRoot, 'test-data', 'NIT-07', 'Inputs');
const testDataOutputs = path.join(projectRoot, 'test-data', 'NIT-07', 'outputs');
console.log('testDataInputs:', testDataInputs);
console.log('testDataOutputs:', testDataOutputs);

// Let's just look at what the current generateNegotiationLetters does!
// First let's create sample works based on the Excel data
// From the Excel, we have 6 works!
const nitData = {
  nitNo: "NIT NO-7 / 26-27",
  nitDate: "4 July, 2026",
  office: "Executive Engineer, P.W.D. District Division-II, Udaipur",
  signingAuthority: "Executive Engineer"
};

// Let's create a test script that uses our doc-generator.ts functions
import * as docGen from './lib/doc-generator.js';

// Let's create sample works for NIT-07
const works = [
  {
    sno: 1,
    ubn: "",
    nameOfWork: "Work 1 (from Excel S.NO.1)",
    gScheduleAmount: 100000,
    bidAmount: 95000,
    bidRatePercent: 5,
    bidRateType: "below",
    period: "6 months",
    status: "accepted",
    bidderName: "MAESTRO CONSTRUCTIONS",
    bidderAddress: "",
    bidderContact: "",
    aenSubDivision: "",
    stampDuty: 950,
    aps: 4750
  },
  {
    sno: 2,
    ubn: "",
    nameOfWork: "Work 2 (from Excel S.NO.2)",
    gScheduleAmount: 200000,
    bidAmount: 190000,
    bidRatePercent: 5,
    bidRateType: "below",
    period: "6 months",
    status: "accepted",
    bidderName: "SKT INFRA PROJECTS",
    bidderAddress: "",
    bidderContact: "",
    aenSubDivision: "",
    stampDuty: 1900,
    aps: 9500
  },
  {
    sno: 3,
    ubn: "",
    nameOfWork: "Work 3 (from Excel S.NO.3)",
    gScheduleAmount: 300000,
    bidAmount: 285000,
    bidRatePercent: 5,
    bidRateType: "below",
    period: "6 months",
    status: "accepted",
    bidderName: "RUDRAM ENTERPRISES",
    bidderAddress: "",
    bidderContact: "",
    aenSubDivision: "",
    stampDuty: 2850,
    aps: 14250
  },
  {
    sno: 4,
    ubn: "",
    nameOfWork: "Work 4 (from Excel S.NO.4)",
    gScheduleAmount: 400000,
    bidAmount: 380000,
    bidRatePercent: 5,
    bidRateType: "below",
    period: "6 months",
    status: "accepted",
    bidderName: "RUDRAM ENTERPRISES",
    bidderAddress: "",
    bidderContact: "",
    aenSubDivision: "",
    stampDuty: 3800,
    aps: 19000
  },
  {
    sno: 5,
    ubn: "",
    nameOfWork: "Work 5 (from Excel S.NO.5)",
    gScheduleAmount: 500000,
    bidAmount: 475000,
    bidRatePercent: 5,
    bidRateType: "below",
    period: "6 months",
    status: "accepted",
    bidderName: "Someshwar InfraProjects",
    bidderAddress: "",
    bidderContact: "",
    aenSubDivision: "",
    stampDuty: 4750,
    aps: 23750
  },
  {
    sno: 6,
    ubn: "",
    nameOfWork: "Work 6 (from Excel S.NO.6)",
    gScheduleAmount: 600000,
    bidAmount: 570000,
    bidRatePercent: 5,
    bidRateType: "below",
    period: "6 months",
    status: "accepted",
    bidderName: "MAESTRO CONSTRUCTIONS",
    bidderAddress: "",
    bidderContact: "",
    aenSubDivision: "",
    stampDuty: 5700,
    aps: 28500
  }
];

async function generateTestDocs() {
  console.log('Generating negotiation letters...');
  const negotiationBuffer = await docGen.generateNegotiationLetters(nitData, works);
  fs.writeFileSync(path.join(testDataOutputs, '04-Negotiation-Letters-NEW.docx'), negotiationBuffer);

  console.log('Generating negotiation reply formats...');
  const replyBuffer = await docGen.generateNegotiationReplyFormats(nitData, works);
  fs.writeFileSync(path.join(testDataOutputs, '06-Negotiation-Reply-Format-NEW.docx'), replyBuffer);

  console.log('Done! Check outputs folder!');
}

generateTestDocs().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
