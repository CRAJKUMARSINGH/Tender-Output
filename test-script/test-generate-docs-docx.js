
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  convertInchesToTwip,
  HeadingLevel,
  Packer,
  BorderStyle,
} from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputsDir = path.join(__dirname, '..', 'test-data', 'NIT-07', 'Outputs');

// Test data
const nitData = {
  nitNo: 'NIT No. 7/2026-27',
  nitDate: '03/07/2026',
  office: 'OFFICE OF THE EXECUTIVE ENGINEER, P.W.D. DISTRICT DIVISION-II, UDAIPUR',
  signingAuthority: 'Executive Engineer',
};

const works = [
  {
    sno: 1,
    ubn: 'PWD2627WSOB06093',
    nameOfWork: 'Construction of C.D. Work and Road from Main Road to Meghwal Basti upto Bharodi Road (Under Budget Announcement Point No. 253 NP/ML 2022-23)',
    gScheduleAmount: 3292584.70,
    bidAmount: 2632421.47,
    bidRatePercent: 20.05,
    bidRateType: 'below',
    period: '4 Months',
    status: 'accepted',
    bidderName: 'M/s. Maestro Constructions',
    bidderAddress: '',
    bidderContact: '',
    aenSubDivision: '',
    stampDuty: 26324.21, // 1% of bid amount
    aps: 131621.07, // 5% of bid amount
    bgFdrNo: '',
    bgFdrAmount: 131621.07,
    bgFdrDate: '',
    bankName: '',
    bankBranch: '',
  },
  {
    sno: 2,
    ubn: 'PWD2627WSOB06094',
    nameOfWork: 'Rehabilitation of Madrada to Mangpura KM. 0/0 to 1/0 (Non Patchable Road) under Road Repair Programme 2026-27',
    gScheduleAmount: 0,
    bidAmount: 0,
    bidRatePercent: 0,
    bidRateType: 'below',
    period: '4 Months',
    status: 'cancelled',
    bidderName: '',
    bidderAddress: '',
    bidderContact: '',
    aenSubDivision: '',
    stampDuty: 0,
    aps: 0,
    bgFdrNo: '',
    bgFdrAmount: 0,
    bgFdrDate: '',
    bankName: '',
    bankBranch: '',
  },
  {
    sno: 3,
    ubn: 'PWD2627WSOB06095',
    nameOfWork: 'Construction of RCC Bridge (1 Span 8 M) on Rawaliya Kalan to Barwada via Avni Bagda Hathniyawal CH. 4/700 under Road Repair Programme 2026-27',
    gScheduleAmount: 9745415.96,
    bidAmount: 7401643.42,
    bidRatePercent: 24.05,
    bidRateType: 'below',
    period: '8 Months',
    status: 'accepted',
    bidderName: 'M/s. Maestro Constructions',
    bidderAddress: '',
    bidderContact: '',
    aenSubDivision: '',
    stampDuty: 74016.43, // 1% of bid amount
    aps: 370082.17, // 5% of bid amount
    bgFdrNo: '',
    bgFdrAmount: 370082.17,
    bgFdrDate: '',
    bankName: '',
    bankBranch: '',
  },
  {
    sno: 4,
    ubn: 'PWD2627WSOB06096',
    nameOfWork: 'Reconstruction and Rehabilitation of Damaged C.D. Work on Gogunda Jhadol Road CH. 14/800 under Road Repair Programme 2026-27',
    gScheduleAmount: 5084574.20,
    bidAmount: 3940036.54,
    bidRatePercent: 22.51,
    bidRateType: 'below',
    period: '8 Months',
    status: 'accepted',
    bidderName: 'M/s. Paliwal Infra Projects',
    bidderAddress: '',
    bidderContact: '',
    aenSubDivision: '',
    stampDuty: 39400.37, // 1% of bid amount
    aps: 197001.83, // 5% of bid amount
    bgFdrNo: '',
    bgFdrAmount: 197001.83,
    bgFdrDate: '',
    bankName: '',
    bankBranch: '',
  },
  {
    sno: 5,
    ubn: 'PWD2627WSOB06097',
    nameOfWork: 'Computer Typing, Printing and Online Works in P.W.D. Distt. Dn. II, Udaipur (2026-2027)',
    gScheduleAmount: 991500.00,
    bidAmount: 991500.00,
    bidRatePercent: null,
    bidRateType: 'item_rate',
    period: '10 Months',
    status: 'accepted',
    bidderName: 'Shri Vikram Singh',
    bidderAddress: 'Udaipur',
    bidderContact: '9829081832',
    aenSubDivision: '',
    stampDuty: 9915.00, // 1% of bid amount
    aps: 49575.00, // 5% of bid amount
    bgFdrNo: '',
    bgFdrAmount: 49575.00,
    bgFdrDate: '',
    bankName: '',
    bankBranch: '',
    negotiatedItems: [
      '1   G-Schedule Item-4 Colour print /photocopy A4 Size Our negotiated rate shall be Rs 32 (In words Rupees Thirty-two only) per page.'
    ],
  },
  {
    sno: 6,
    ubn: 'PWD2627WSOB06098',
    nameOfWork: 'Restoration Work of Road Cutting on Various Roads under P.W.D. Distt. Dn. II, Udaipur',
    gScheduleAmount: 1289843.39,
    bidAmount: 1329183.61,
    bidRatePercent: 3.05,
    bidRateType: 'above',
    period: '3 Months',
    status: 'accepted',
    bidderName: 'M/s. Maestro Constructions',
    bidderAddress: '',
    bidderContact: '',
    aenSubDivision: '',
    stampDuty: 13291.84, // 1% of bid amount
    aps: 66459.18, // 5% of bid amount
    bgFdrNo: '',
    bgFdrAmount: 66459.18,
    bgFdrDate: '',
    bankName: '',
    bankBranch: '',
  },
];

// Helper functions for formatting
const formatINR = (num) => {
  return num.toLocaleString('en-IN');
};

function numberToIndianWords(n) {
  if (n === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const scales = ['', 'Thousand', 'Lakh', 'Crore'];

  function toWords(num) {
    if (num === 0) return '';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + ' ' + toWords(num % 10);
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred ' + toWords(num % 100);
    let i = 0;
    let result = '';
    let remaining = num;
    while (remaining > 0) {
      if (i === 0) {
        result = toWords(remaining % 1000) + ' ' + result;
        remaining = Math.floor(remaining / 1000);
      } else {
        result = toWords(remaining % 100) + ' ' + scales[i] + ' ' + result;
        remaining = Math.floor(remaining / 100);
      }
      i++;
    }
    return result.trim();
  }
  return toWords(n) + ' Rupees Only';
}

const computeWork = (work) => {
  const stampDuty = work.bidAmount ? Math.round(work.bidAmount * 0.01) : 0;
  const aps = work.bidAmount ? Math.round(work.bidAmount * 0.05) : 0;
  return {
    ...work,
    stampDuty,
    aps,
    bidAmountWords: numberToIndianWords(work.bidAmount || 0),
  };
};

// Common document settings
const docSettings = {
  orientation: 'portrait',
  sections: [
    {
      properties: {},
      children: [],
    },
  ],
  styles: {
    default: {
      document: {
        run: {
          font: 'Times New Roman',
          size: 24, // 12pt
        },
        paragraph: {
          spacing: {
            before: 0,
            after: 0,
          },
          alignment: AlignmentType.JUSTIFIED,
        },
      },
    },
  },
};

// 1. Generate Scrutiny Sheet
async function generateScrutinySheet() {
  const docChildren = [];

  // Office Header
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: nitData.office, bold: true, size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // Document Title
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: 'TENDER SCRUTINY NOTE SHEET', bold: true, size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // NIT Info
  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'NIT No.: ', bold: true }),
        new TextRun({ text: nitData.nitNo }),
        new TextRun({ text: '   ', bold: true }),
        new TextRun({ text: 'Dated: ', bold: true }),
        new TextRun({ text: nitData.nitDate }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Work Register Heading
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: '--- WORK REGISTER ---', bold: true })],
      spacing: { after: 100 },
    })
  );

  // Work Register Table
  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'S.No', bold: true }),
        new TextRun({ text: '   ' }),
        new TextRun({ text: 'UBN No.', bold: true }),
        new TextRun({ text: '   ' }),
        new TextRun({ text: 'Name of Work', bold: true }),
        new TextRun({ text: '   ' }),
        new TextRun({ text: 'G-Schedule (Rs.)', bold: true }),
        new TextRun({ text: '   ' }),
        new TextRun({ text: 'Bid Amount (Rs.)', bold: true }),
        new TextRun({ text: '   ' }),
        new TextRun({ text: 'Rate', bold: true }),
        new TextRun({ text: '   ' }),
        new TextRun({ text: 'Period', bold: true }),
        new TextRun({ text: '   ' }),
        new TextRun({ text: 'Status', bold: true }),
      ],
    })
  );

  for (const work of works) {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: String(work.sno) }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: work.ubn }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: work.nameOfWork }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: formatINR(work.gScheduleAmount) }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: formatINR(work.bidAmount || 0) }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: `${work.bidRatePercent}% ${work.bidRateType}` }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: work.period }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: work.status.toUpperCase() }),
        ],
      })
    );
  }

  docChildren.push(new Paragraph({ spacing: { after: 400 } }));

  // Computation Register Heading
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: '--- COMPUTATION REGISTER: STAMP DUTY AND APS ---', bold: true })],
      spacing: { after: 100 },
    })
  );

  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'S.No', bold: true }),
        new TextRun({ text: '   ' }),
        new TextRun({ text: 'Bidder', bold: true }),
        new TextRun({ text: '   ' }),
        new TextRun({ text: 'Bid Amount', bold: true }),
        new TextRun({ text: '   ' }),
        new TextRun({ text: 'Amount in Words', bold: true }),
        new TextRun({ text: '   ' }),
        new TextRun({ text: 'Stamp Duty', bold: true }),
        new TextRun({ text: '   ' }),
        new TextRun({ text: 'APS', bold: true }),
      ],
    })
  );

  for (const work of works.filter((w) => w.status === 'accepted')) {
    const c = computeWork(work);
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: String(work.sno) }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: work.bidderName }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: formatINR(c.bidAmount || 0) }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: c.bidAmountWords }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: formatINR(c.stampDuty) }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: formatINR(c.aps) }),
        ],
      })
    );
  }

  docChildren.push(new Paragraph({ spacing: { after: 800 } }));

  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: 'Signing Authority:', bold: true })],
      spacing: { after: 200 },
    })
  );

  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: nitData.signingAuthority })],
      alignment: AlignmentType.RIGHT,
    })
  );

  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: nitData.office })],
      alignment: AlignmentType.RIGHT,
    })
  );

  const doc = new Document({
    ...docSettings,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.79), // ~20mm
              right: convertInchesToTwip(0.79),
              bottom: convertInchesToTwip(0.79),
              left: convertInchesToTwip(0.79),
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(outputsDir, '01-Scrutiny-Sheet.docx'), buffer);
  console.log('✅ 01-Scrutiny-Sheet.docx generated');
}

// 2. Generate Acceptance Letters
async function generateAcceptanceLetters() {
  const docChildren = [];

  for (const work of works.filter((w) => w.status === 'accepted')) {
    const c = computeWork(work);

    if (docChildren.length > 0) {
      docChildren.push(new Paragraph({ pageBreak: true }));
    }

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: nitData.office, bold: true, size: 24 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'No.: ', bold: true }),
          new TextRun({ text: '________________________' }),
        ],
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Date: ', bold: true }),
          new TextRun({ text: '________________________' }),
        ],
        spacing: { after: 400 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'LETTER OF ACCEPTANCE OF TENDER', bold: true, size: 28 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'To,' })],
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: work.bidderName })],
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: work.bidderAddress })],
      })
    );

    if (work.bidderContact) {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: `Mobile: ${work.bidderContact}` })],
          spacing: { after: 400 },
        })
      );
    } else {
      docChildren.push(new Paragraph({ spacing: { after: 400 } }));
    }

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Sub: ', bold: true }),
          new TextRun({ text: work.nameOfWork }),
        ],
        spacing: { after: 200 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Ref: ', bold: true }),
          new TextRun({ text: `NIT No. ${nitData.nitNo}` }),
        ],
        spacing: { after: 200 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'Sir,' })],
        spacing: { after: 200 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Your tender for the above work has been accepted on behalf of the Governor of Rajasthan as per rule @ ${work.bidRatePercent}% ${work.bidRateType} to Rs. ${formatINR(c.bidAmount || 0)} (${c.bidAmountWords}) by the Superintending Engineer PWD City Circle Udaipur.`,
          }),
        ],
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 200 } }));

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Security Deposit as per rule of the gross amount of the running bill shall be deducted from each running bill or you may opt to deposit full amount of security deposit in the share of bank guarantee or any acceptable form of security before or at the time of executing agreement. Kindly submit the required stamp duty of Rs. ${formatINR(c.stampDuty)}/- as per rule and Deposit Additional Performance Security Amounting to Rs. ${formatINR(c.aps)}.00 in this office and do Sign the agreement within 10 days failing which action as per rule may be initiated.`,
          }),
        ],
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 200 } }));

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'The receipt of this may please be acknowledged.' })],
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 400 } }));

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: `Stamp Duty = Rs. ${formatINR(c.stampDuty)}/-` })],
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: `APS Amount = Rs. ${formatINR(c.aps)}/-` })],
        spacing: { after: 400 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'Yours faithfully,' })],
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 400 } }));

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: '[ANIL KHINCHI]', bold: true })],
        alignment: AlignmentType.RIGHT,
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'Executive Engineer' })],
        alignment: AlignmentType.RIGHT,
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'P.W.D. District Division-II, Udaipur' })],
        alignment: AlignmentType.RIGHT,
      })
    );
  }

  const doc = new Document({
    ...docSettings,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.79),
              right: convertInchesToTwip(0.79),
              bottom: convertInchesToTwip(0.79),
              left: convertInchesToTwip(0.79),
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(outputsDir, '02-Acceptance-Letters.docx'), buffer);
  console.log('✅ 02-Acceptance-Letters.docx generated');
}

// 3. Generate Work Orders
async function generateWorkOrders() {
  const docChildren = [];

  for (const work of works.filter((w) => w.status === 'accepted')) {
    const c = computeWork(work);

    if (docChildren.length > 0) {
      docChildren.push(new Paragraph({ pageBreak: true }));
    }

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: nitData.office, bold: true, size: 24 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'No.: ', bold: true }),
          new TextRun({ text: '________________________' }),
        ],
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Date: ', bold: true }),
          new TextRun({ text: '________________________' }),
        ],
        spacing: { after: 400 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: work.bidderName })],
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: work.bidderAddress })],
      })
    );

    if (work.bidderContact) {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: `Mobile No.: ${work.bidderContact}` })],
          spacing: { after: 400 },
        })
      );
    } else {
      docChildren.push(new Paragraph({ spacing: { after: 400 } }));
    }

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'WRITTEN ORDER TO COMMENCEMENT OF WORK', bold: true, size: 28 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Sub: ', bold: true }),
          new TextRun({ text: work.nameOfWork }),
        ],
        spacing: { after: 200 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Ref: ', bold: true }),
          new TextRun({ text: `NIT No. ${nitData.nitNo} S.No. ${work.sno}` }),
        ],
        spacing: { after: 200 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'Sir,' })],
        spacing: { after: 200 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Your tender for the above work amounting to Rs. ${formatINR(c.bidAmount || 0)} (${c.bidAmountWords}) @ ${work.bidRatePercent}% ${work.bidRateType} without any conditions has been accepted by Undersigned on behalf of the Governor of the State of Rajasthan.`,
          }),
        ],
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 200 } }));

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `You are requested to attend this office to complete formal agreement and produce stamp worth Rs. ${formatINR(c.stampDuty)}/- and option for security deposit within 7 days.`,
          }),
        ],
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 200 } }));

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `You are requested to contact the Assistant Engineer in-charge of work and start the work under intimation to this office.`,
          }),
        ],
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 200 } }));

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `The appendix XI (RPWA 100) of PWF & AR (as amended from time to time), tender documents and this letter shall form part of Agreement executed between you and the Governor of the State of Rajasthan Agreement No.: ________________________`,
          }),
        ],
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 200 } }));

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `The time allowed for the said work is upto ${work.period} and shall be reckoned from Fifteen days after issue of this work order with the date of start and stipulated date of completion as mentioned below:`,
          }),
        ],
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 200 } }));

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'Please Submit STP Within 7 Days.' })],
        spacing: { after: 400 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Date of Commencement of work: ', bold: true }),
          new TextRun({ text: '________________________' }),
        ],
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Stipulated date of Completion of work: ', bold: true }),
          new TextRun({ text: '________________________' }),
        ],
        spacing: { after: 400 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'Yours faithfully,' })],
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 400 } }));

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: '[ANIL KHINCHI]', bold: true })],
        alignment: AlignmentType.RIGHT,
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'Executive Engineer' })],
        alignment: AlignmentType.RIGHT,
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'Signed on behalf of the Governor' })],
        alignment: AlignmentType.RIGHT,
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'Of the State of Rajasthan' })],
        alignment: AlignmentType.RIGHT,
      })
    );
  }

  const doc = new Document({
    ...docSettings,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.79),
              right: convertInchesToTwip(0.79),
              bottom: convertInchesToTwip(0.79),
              left: convertInchesToTwip(0.79),
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(outputsDir, '03-Work-Orders.docx'), buffer);
  console.log('✅ 03-Work-Orders.docx generated');
}

// 4. Generate Negotiation Letters
async function generateNegotiationLetters() {
  const docChildren = [];

  for (const work of works.filter((w) => w.status === 'accepted')) {
    const c = computeWork(work);

    if (docChildren.length > 0) {
      docChildren.push(new Paragraph({ pageBreak: true }));
    }

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: `--- WORK ${work.sno}: NEGOTIATION SET ---`, bold: true, size: 28 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: '--- PART A: NEGOTIATION CALL LETTER (FROM EE TO CONTRACTOR) ---', bold: true }),
        ],
        spacing: { after: 400 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'Office of the Executive Engineer', bold: true, size: 24 })],
        alignment: AlignmentType.CENTER,
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'PUBLIC WORKS DEPARTMENT DIVISION', bold: true, size: 24 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Date: ', bold: true }),
          new TextRun({ text: '________________________' }),
        ],
        spacing: { after: 200 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'No.Ac/ ', bold: true }),
          new TextRun({ text: '________________________' }),
        ],
        spacing: { after: 400 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'NEGOTIATIONS', bold: true, size: 28 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'To,' })],
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: `M/s / Shri ${work.bidderName}` })],
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: work.bidderAddress })],
        spacing: { after: 400 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Sub: ', bold: true }),
          new TextRun({ text: `Tenders for the work ${work.nameOfWork}` }),
        ],
        spacing: { after: 200 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Job No / NIT No ', bold: true }),
          new TextRun({ text: '________________________' }),
        ],
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: `(NIT No. ${nitData.nitNo})` })],
        spacing: { after: 200 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'Sir,' })],
        spacing: { after: 200 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Please refer to your tender submitted for the above work, since the rates offered by you have been considered on higher side. It has been decided to hold the negotiation on ${new Date().toLocaleDateString('en-GB')}.`,
          }),
        ],
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 200 } }));

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `You are therefore requested to please quote your negotiated offer in a sealed cover which shall be opened on ${new Date().toLocaleDateString('en-GB')} at ________________________ in this office in presence of the contractors who choose to be present on date.`,
          }),
        ],
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 200 } }));

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `It may please be carefully noted that the condition what so ever if laid may invalid at your offer. Time period of validity may also be extended up to ________________________.`,
          }),
        ],
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 400 } }));

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Your present quoted rate: ', bold: true }),
          new TextRun({ text: `${work.bidRatePercent}% ${work.bidRateType}` }),
        ],
        spacing: { after: 400 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'Yours faithfully,' })],
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 400 } }));

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: '[ANIL KHINCHI]', bold: true })],
        alignment: AlignmentType.RIGHT,
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'Executive Engineer' })],
        alignment: AlignmentType.RIGHT,
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'P.W.D. District Division-II, Udaipur' })],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 800 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: '--- PART B: CONTRACTOR\'S NEGOTIATION REPLY (DRAFT) ---', bold: true }),
        ],
        spacing: { after: 400 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'To,' })],
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'The Executive Engineer,' })],
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: nitData.office })],
        spacing: { after: 400 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Subject: ', bold: true }),
          new TextRun({ text: `Negotiation for ${work.nameOfWork} – NIT No. ${nitData.nitNo}` }),
        ],
        spacing: { after: 200 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Reference: ', bold: true }),
          new TextRun({ text: `NIT No. ${nitData.nitNo} Dated ${nitData.nitDate}` }),
        ],
        spacing: { after: 200 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'Dear Sir,' })],
        spacing: { after: 200 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `With reference to above subject, we would like to inform you that we have submitted our price on very competitive rates. Even then we would like to offer some extra discount as under:`,
          }),
        ],
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 200 } }));

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'S.No', bold: true }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: 'Work Description', bold: true }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: 'Qty', bold: true }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: 'Quoted Price', bold: true }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: 'Negotiated Price', bold: true }),
        ],
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: '1' }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: work.nameOfWork }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: '1 Job' }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: `${work.bidRatePercent}% ${work.bidRateType}` }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: '________________________' }),
        ],
        spacing: { after: 400 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Hope you will find the above in order & arrange to release the work order at your earliest possible & oblige.`,
          }),
        ],
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 200 } }));

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Thanking you and assuring you of our best services always.`,
          }),
        ],
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 400 } }));

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'Yours faithfully,' })],
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 400 } }));

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: '(Signature of Contractor / Authorized Representative)' })],
        alignment: AlignmentType.RIGHT,
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: work.bidderName })],
        alignment: AlignmentType.RIGHT,
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: work.bidderAddress })],
        alignment: AlignmentType.RIGHT,
      })
    );

    if (work.bidderContact) {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: `Mobile: ${work.bidderContact}` })],
          alignment: AlignmentType.RIGHT,
        })
      );
    }
  }

  const doc = new Document({
    ...docSettings,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.79),
              right: convertInchesToTwip(0.79),
              bottom: convertInchesToTwip(0.79),
              left: convertInchesToTwip(0.79),
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(outputsDir, '04-Negotiation-Letters.docx'), buffer);
  console.log('✅ 04-Negotiation-Letters.docx generated');
}

// 5. Generate Bank BG/FDR Letters
async function generateBankBgLetters() {
  const docChildren = [];

  for (const work of works.filter((w) => w.status === 'accepted')) {
    const c = computeWork(work);

    if (docChildren.length > 0) {
      docChildren.push(new Paragraph({ pageBreak: true }));
    }

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: nitData.office, bold: true, size: 24 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: `No.: BG-LTR-${work.sno}` }),
        ],
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Date: ', bold: true }),
          new TextRun({ text: new Date().toLocaleDateString('en-GB') }),
        ],
        spacing: { after: 400 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'To,' })],
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'The Branch Manager,' })],
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: work.bankName })],
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: work.bankBranch })],
        spacing: { after: 400 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Sub: ', bold: true }),
          new TextRun({
            text: `Verification of BG/FDR No. ${work.bgFdrNo} for Rs. ${formatINR(work.bgFdrAmount)}/- dated ${work.bgFdrDate}`,
          }),
        ],
        spacing: { after: 200 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'Sir,' })],
        spacing: { after: 200 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `The following security document has been deposited in this office for performance guarantee / security deposit / deposit in lieu of unbalanced bid by the contractor:`,
          }),
        ],
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 200 } }));

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: work.bidderName })],
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: work.bidderAddress })],
        spacing: { after: 400 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'BG/FDR Details:' })],
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: '- BG/FDR No.: ' }),
          new TextRun({ text: work.bgFdrNo }),
        ],
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: '- Amount: ' }),
          new TextRun({ text: `Rs. ${formatINR(work.bgFdrAmount)}/-` }),
        ],
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: '- Dated: ' }),
          new TextRun({ text: work.bgFdrDate }),
        ],
        spacing: { after: 400 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `1. Kindly confirm whether the above Bank Guarantee / FDR has been issued by your bank.`,
          }),
        ],
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 200 } }));

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `2. Please also confirm whether the lien / pledge / hypothecation in favour of The Executive Engineer, PWD District Division-II, Udaipur has been duly authenticated / marked by your bank or not.`,
          }),
        ],
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 200 } }));

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'An immediate reply to this letter is requested.' })],
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 200 } }));

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'The receipt of this letter may please be acknowledged.' })],
        spacing: { after: 400 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'Yours faithfully,' })],
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 400 } }));

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: '[ANIL KHINCHI]', bold: true })],
        alignment: AlignmentType.RIGHT,
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'Executive Engineer' })],
        alignment: AlignmentType.RIGHT,
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'P.W.D. District Division-II, Udaipur' })],
        alignment: AlignmentType.RIGHT,
      })
    );
  }

  const doc = new Document({
    ...docSettings,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.79),
              right: convertInchesToTwip(0.79),
              bottom: convertInchesToTwip(0.79),
              left: convertInchesToTwip(0.79),
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(outputsDir, '05-Bank-BG-FDR-Letters.docx'), buffer);
  console.log('✅ 05-Bank-BG-FDR-Letters.docx generated');
}

// 6. Generate Negotiation Reply Format
async function generateNegotiationReplyFormat() {
  const docChildren = [];

  for (const work of works.filter((w) => w.status === 'accepted')) {
    const c = computeWork(work);

    if (docChildren.length > 0) {
      docChildren.push(new Paragraph({ pageBreak: true }));
    }

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'To,' })],
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'The Executive Engineer,' })],
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: nitData.office })],
        spacing: { after: 400 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Subject: ', bold: true }),
          new TextRun({ text: `Negotiation for ${work.nameOfWork} – NIT No. ${nitData.nitNo}` }),
        ],
        spacing: { after: 200 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Reference: ', bold: true }),
          new TextRun({ text: `NIT No. ${nitData.nitNo} Dated ${nitData.nitDate}` }),
        ],
        spacing: { after: 200 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'Dear Sir,' })],
        spacing: { after: 200 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `With reference to above subject, we would like to inform you that we have submitted our price on very competitive rates. Even then we would like to offer some extra discount as under:`,
          }),
        ],
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 200 } }));

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'S.No', bold: true }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: 'Work Description', bold: true }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: 'Qty', bold: true }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: 'Quoted Price', bold: true }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: 'Negotiated Price', bold: true }),
        ],
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: '1' }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: work.nameOfWork }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: '1 Job' }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: `${work.bidRatePercent}% ${work.bidRateType}` }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: '________________________' }),
        ],
        spacing: { after: 400 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Hope you will find the above in order & arrange to release the work order at your earliest possible & oblige.`,
          }),
        ],
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 200 } }));

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Thanking you and assuring you of our best services always.`,
          }),
        ],
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 400 } }));

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'Yours faithfully,' })],
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 400 } }));

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: '(Signature of Contractor / Authorized Representative)' })],
        alignment: AlignmentType.RIGHT,
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: work.bidderName })],
        alignment: AlignmentType.RIGHT,
      })
    );

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: work.bidderAddress })],
        alignment: AlignmentType.RIGHT,
      })
    );

    if (work.bidderContact) {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: `Mobile: ${work.bidderContact}` })],
          alignment: AlignmentType.RIGHT,
        })
      );
    }
  }

  const doc = new Document({
    ...docSettings,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.79),
              right: convertInchesToTwip(0.79),
              bottom: convertInchesToTwip(0.79),
              left: convertInchesToTwip(0.79),
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(outputsDir, '06-Negotiation-Reply-Format.docx'), buffer);
  console.log('✅ 06-Negotiation-Reply-Format.docx generated');
}

// Main function to generate all docs
async function main() {
  console.log('Generating Word documents...');
  await generateScrutinySheet();
  await generateAcceptanceLetters();
  await generateWorkOrders();
  await generateNegotiationLetters();
  await generateBankBgLetters();
  await generateNegotiationReplyFormat();
  console.log('\n🎉 All Word documents have been generated successfully!');
}

main().catch((error) => {
  console.error('Error generating documents:', error);
  process.exit(1);
});

