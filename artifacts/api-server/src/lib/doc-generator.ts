/**
 * Document generation using the docx npm package.
 * Produces formatted Word documents matching PWD District Division-II, Udaipur standards.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  PageBreak,
  WidthType,
  VerticalAlign,
  ShadingType,
  UnderlineType,
} from "docx";
import { computeWork, numberToIndianWords } from "./compute.js";

const OFFICE_HEADER = "OFFICE OF THE EXECUTIVE ENGINEER, P.W.D. DISTRICT DIVISION-II, UDAIPUR";
const SIGNING_AUTHORITY_LINE1 = "[ANIL KHINCHI]";
const SIGNING_AUTHORITY_LINE2 = "Executive Engineer";
const SIGNING_AUTHORITY_LINE3 = "PWD District Division-II, Udaipur";

function headerPara(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text,
        bold: true,
        underline: { type: UnderlineType.SINGLE },
        size: 26,
      }),
    ],
    spacing: { after: 200 },
  });
}

function centeredPara(text: string, bold = false): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text, bold, size: 24 })],
    spacing: { after: 100 },
  });
}

function justifiedPara(text: string, indent = true): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.BOTH,
    indent: indent ? { firstLine: 720 } : undefined,
    children: [new TextRun({ text, size: 24 })],
    spacing: { after: 120 },
  });
}

function rightAlignedPara(text: string, bold = false): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    children: [new TextRun({ text, bold, size: 24 })],
    spacing: { after: 60 },
  });
}

function boldPara(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 24 })],
    spacing: { after: 60 },
  });
}

function emptyPara(): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: "" })], spacing: { after: 100 } });
}

function blankLine(): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: "" })] });
}

function sectionHeader(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, size: 28, color: "1F3A6E" })],
    spacing: { before: 300, after: 200 },
    shading: { type: ShadingType.CLEAR, color: "auto", fill: "E8EDF7" },
  });
}

function simpleTable(headers: string[], rows: string[][]): Table {
  const headerRow = new TableRow({
    children: headers.map(
      (h) =>
        new TableCell({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: h, bold: true, size: 20, color: "FFFFFF" })],
            }),
          ],
          shading: { type: ShadingType.CLEAR, color: "auto", fill: "2E5FAD" },
          verticalAlign: VerticalAlign.CENTER,
        })
    ),
  });

  const dataRows = rows.map(
    (row, rowIdx) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: cell, size: 20 })],
                }),
              ],
              shading: {
                type: ShadingType.CLEAR,
                color: "auto",
                fill: rowIdx % 2 === 0 ? "F5F8FF" : "FFFFFF",
              },
            })
        ),
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideH: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideV: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    },
  });
}

function formatINR(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return "Rs. " + amount.toLocaleString("en-IN") + "/-";
}

// ─── ACCEPTANCE LETTER ────────────────────────────────────────────────────────
interface WorkData {
  sno: number;
  ubn: string;
  nameOfWork: string;
  gScheduleAmount: number;
  bidAmount?: number | null;
  bidRatePercent?: number | null;
  bidRateType: string;
  period: string;
  status: string;
  bidderName?: string | null;
  bidderAddress?: string | null;
  bidderContact?: string | null;
  aenSubDivision?: string | null;
  stampDuty?: number | null;
  aps?: number | null;
}

interface NitData {
  nitNo: string;
  nitDate: string;
  office: string;
  signingAuthority: string;
}

function buildAcceptanceLetter(work: WorkData, nit: NitData): Paragraph[] {
  const computed = computeWork({
    sno: work.sno,
    nameOfWork: work.nameOfWork,
    gScheduleAmount: work.gScheduleAmount,
    bidAmount: work.bidAmount,
    bidRatePercent: work.bidRatePercent,
    bidRateType: work.bidRateType,
    period: work.period,
    status: work.status,
  });

  const stampDuty = work.stampDuty ?? computed.stampDuty ?? 1000;
  const aps = work.aps ?? computed.aps ?? 0;
  const bidAmount = work.bidAmount ?? 0;
  const bidWords = computed.bidAmountWords ?? numberToIndianWords(bidAmount);

  const rateStr =
    work.bidRateType === "item_rate"
      ? "Item Rate"
      : `${work.bidRatePercent?.toFixed(2) ?? "0.00"}% ${work.bidRateType === "above" ? "Above" : "Below"} the schedule 'G' amount`;

  const aen = work.aenSubDivision ? `Assistant Engineer, PWD Sub-Division ${work.aenSubDivision}` : "Assistant Engineer, PWD Sub-Division";

  return [
    headerPara(OFFICE_HEADER),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({ text: "No.: ________________________", size: 24 }),
        new TextRun({ text: "          Date: ________________________", size: 24 }),
      ],
      spacing: { after: 120 },
    }),
    centeredPara("(Letter of Acceptance of Tender)"),
    emptyPara(),
    new Paragraph({
      children: [
        new TextRun({ text: (work.bidderName ?? "M/s. _______________") + ",", size: 24 }),
      ],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: (work.bidderAddress ?? "___________________________________") + ".", size: 24 })],
      spacing: { after: 60 },
    }),
    work.bidderContact
      ? new Paragraph({
          children: [new TextRun({ text: "Mobile: " + work.bidderContact, size: 24 })],
          spacing: { after: 120 },
        })
      : emptyPara(),
    new Paragraph({
      children: [
        new TextRun({ text: "  Sub :-", bold: true, size: 24 }),
        new TextRun({ text: " " + work.nameOfWork, size: 24 }),
      ],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "  Ref :-", bold: true, size: 24 }),
        new TextRun({ text: " NIT No. " + nit.nitNo, size: 24 }),
      ],
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Sir,", size: 24 })],
      spacing: { after: 60 },
    }),
    justifiedPara(
      `Your Tender for the above work has been accepted on behalf of the Governor of Rajasthan as per rule @${rateStr} to Rs. ${bidAmount.toLocaleString("en-IN")}/- (${bidWords}) by the Superintending Engineer PWD City Circle Udaipur Vide NIT No. ${nit.nitNo} Dated ${nit.nitDate}.`
    ),
    justifiedPara(
      `Security Deposit as per rule of the gross amount of the running bill shall be deducted from each running bill or you may opt to deposit full amount of security deposit in the share of bank guarantee or any acceptable form of security before or at the time of executing agreement. Kindly submit the required stamp duty of Rs. ${stampDuty.toLocaleString("en-IN")}/- as per rule and Deposit Additional Performance Security Amounting to Rs. ${aps.toLocaleString("en-IN")}.00 in this Office and do Sign the agreement within 10 days failing which action as per rule may be initiated.`
    ),
    justifiedPara("The receipt of the may please be acknowledged."),
    emptyPara(),
    boldPara(`Stamp Duty = Rs. ${stampDuty.toLocaleString("en-IN")}/-`),
    boldPara(`APS Amount  = Rs. ${aps.toLocaleString("en-IN")}/-`),
    emptyPara(),
    rightAlignedPara(SIGNING_AUTHORITY_LINE1, true),
    rightAlignedPara(SIGNING_AUTHORITY_LINE2, true),
    rightAlignedPara(SIGNING_AUTHORITY_LINE3),
    emptyPara(),
    new Paragraph({
      children: [
        new TextRun({ text: "No.: ________________________", size: 24 }),
        new TextRun({ text: "          Date: ________________________", size: 24 }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Copy submitted to the following :-", size: 24 })],
      spacing: { after: 100 },
    }),
    new Paragraph({ children: [new TextRun({ text: "1-  The Additional Chief Engineer PWD Zone Udaipur.", size: 24 })], spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: "2-  The Superintending Engineer PWD City Circle Udaipur.", size: 24 })], spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: `3-  ${aen}.`, size: 24 })], spacing: { after: 120 } }),
    rightAlignedPara(SIGNING_AUTHORITY_LINE1, true),
    rightAlignedPara(SIGNING_AUTHORITY_LINE2, true),
    rightAlignedPara(SIGNING_AUTHORITY_LINE3),
    new Paragraph({
      children: [new PageBreak()],
    }),
  ];
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

export async function generateScrutinyNoteSheet(nit: NitData, works: WorkData[]): Promise<Buffer> {
  const rows = works.map((w) => {
    const computed = computeWork(w);
    return [
      String(w.sno),
      w.ubn,
      w.nameOfWork,
      w.gScheduleAmount.toLocaleString("en-IN"),
      computed.bidAmount != null ? computed.bidAmount.toLocaleString("en-IN") : "—",
      w.bidRateType === "item_rate" ? "Item Rate" : `${w.bidRatePercent?.toFixed(2) ?? "—"}% ${w.bidRateType === "above" ? "Above" : "Below"}`,
      w.period,
      w.status === "accepted" ? "ACCEPTED" : "CANCELLED",
    ];
  });

  const children: Paragraph[] = [
    headerPara(OFFICE_HEADER),
    centeredPara("TENDER SCRUTINY NOTE SHEET", true),
    centeredPara(`NIT No. ${nit.nitNo}   Dated: ${nit.nitDate}`),
    emptyPara(),
    sectionHeader("Work Register"),
  ];

  children.push(simpleTable(
    ["S.No.", "UBN No.", "Name of Work", "G-Schedule (Rs.)", "Bid Amount (Rs.)", "Rate", "Period", "Status"],
    rows
  ) as unknown as Paragraph);

  children.push(emptyPara());
  children.push(sectionHeader("Computation Register — Stamp Duty & APS"));

  const compRows = works
    .filter((w) => w.status === "accepted")
    .map((w) => {
      const c = computeWork(w);
      return [
        String(w.sno),
        w.bidderName ?? "—",
        formatINR(c.bidAmount),
        c.bidAmountWords ?? "—",
        formatINR(c.stampDuty),
        c.aps != null && c.aps > 0 ? formatINR(c.aps) : "NIL",
      ];
    });

  children.push(simpleTable(
    ["S.No.", "Bidder", "Bid Amount", "Amount in Words", "Stamp Duty", "APS"],
    compRows
  ) as unknown as Paragraph);

  children.push(emptyPara());
  children.push(emptyPara());
  children.push(rightAlignedPara(SIGNING_AUTHORITY_LINE1, true));
  children.push(rightAlignedPara(SIGNING_AUTHORITY_LINE2, true));
  children.push(rightAlignedPara(SIGNING_AUTHORITY_LINE3));

  const doc = new Document({ sections: [{ children }] });
  return Buffer.from(await Packer.toBuffer(doc));
}

export async function generateAcceptanceLetters(nit: NitData, works: WorkData[]): Promise<Buffer> {
  const acceptedWorks = works.filter((w) => w.status === "accepted");
  const allParas: Paragraph[] = [];

  for (const work of acceptedWorks) {
    allParas.push(...buildAcceptanceLetter(work, nit));
  }

  const doc = new Document({ sections: [{ children: allParas }] });
  return Buffer.from(await Packer.toBuffer(doc));
}

interface ChallanEntryDoc {
  workSno: number;
  grnNo: string;
  challanNo: string;
  challanDate: string;
  vendorName: string;
  rislComm: number;
  head0075Amount: number;
  head8443Amount: number;
}

export async function generateChallanVerificationSheet(nit: NitData, challanEntries: ChallanEntryDoc[]): Promise<Buffer> {
  const workGroups = new Map<number, ChallanEntryDoc[]>();
  for (const entry of challanEntries) {
    const arr = workGroups.get(entry.workSno) ?? [];
    arr.push(entry);
    workGroups.set(entry.workSno, arr);
  }

  const children: Paragraph[] = [
    headerPara(OFFICE_HEADER),
    centeredPara("STATEMENT OF EARNEST MONEY AND OTHER FEES DEPOSIT", true),
    centeredPara(`NIT No. ${nit.nitNo}   Dated: ${nit.nitDate}`),
    emptyPara(),
  ];

  for (const [workSno, entries] of Array.from(workGroups.entries()).sort(([a], [b]) => a - b)) {
    children.push(new Paragraph({
      children: [new TextRun({ text: `WORK S.NO. ${workSno} — TOTAL PARTICIPANTS: ${entries.length}`, bold: true, size: 24 })],
      spacing: { before: 200, after: 100 },
    }));

    const rows = entries.map((e) => [
      e.grnNo,
      e.challanNo,
      e.challanDate,
      e.vendorName,
      e.rislComm.toLocaleString("en-IN"),
      e.head0075Amount.toLocaleString("en-IN"),
      e.head8443Amount.toLocaleString("en-IN"),
    ]);

    children.push(simpleTable(
      ["GRN No.", "Challan No.", "Date", "Vendor", "RISL Comm.", "Head 0075 (Rs.)", "Head 8443 (Rs.)"],
      rows
    ) as unknown as Paragraph);
    children.push(emptyPara());
  }

  children.push(emptyPara());
  children.push(rightAlignedPara(SIGNING_AUTHORITY_LINE1, true));
  children.push(rightAlignedPara(SIGNING_AUTHORITY_LINE2, true));
  children.push(rightAlignedPara(SIGNING_AUTHORITY_LINE3));

  const doc = new Document({ sections: [{ children }] });
  return Buffer.from(await Packer.toBuffer(doc));
}

interface DiprPub {
  roNo: string;
  releaseDate: string;
  entries: { srNo: number; newspaperName: string; editionName: string; advtSize: string; sqCm: number; releaseDate: string; rate: number; amount: number }[];
  totalAmount: number;
}

export async function generatePublicationCostStatement(nit: NitData, dipr: DiprPub): Promise<Buffer> {
  const rows = dipr.entries.map((e) => [
    String(e.srNo),
    e.newspaperName,
    e.editionName,
    e.advtSize,
    String(e.sqCm),
    e.releaseDate,
    e.rate.toFixed(2),
    e.amount.toFixed(2),
  ]);

  const children: Paragraph[] = [
    headerPara(OFFICE_HEADER),
    centeredPara("NIT PUBLICATION COST STATEMENT", true),
    centeredPara(`NIT No. ${nit.nitNo}   Dated: ${nit.nitDate}`),
    emptyPara(),
    new Paragraph({
      children: [
        new TextRun({ text: "DIPR RO No.: ", bold: true, size: 24 }),
        new TextRun({ text: dipr.roNo, size: 24 }),
        new TextRun({ text: "     Release Date: ", bold: true, size: 24 }),
        new TextRun({ text: dipr.releaseDate, size: 24 }),
      ],
      spacing: { after: 200 },
    }),
    simpleTable(
      ["Sr. No.", "Newspaper", "Edition", "Advt. Size", "Sq.cm", "Release Date", "Rate (Rs.)", "Amount (Rs.)"],
      rows
    ) as unknown as Paragraph,
    emptyPara(),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({ text: `Total Publication Cost: Rs. ${dipr.totalAmount.toLocaleString("en-IN")}/-`, bold: true, size: 24 }),
      ],
      spacing: { after: 200 },
    }),
    emptyPara(),
    rightAlignedPara(SIGNING_AUTHORITY_LINE1, true),
    rightAlignedPara(SIGNING_AUTHORITY_LINE2, true),
    rightAlignedPara(SIGNING_AUTHORITY_LINE3),
  ];

  const doc = new Document({ sections: [{ children }] });
  return Buffer.from(await Packer.toBuffer(doc));
}

export async function generateMasterRecord(
  nit: NitData,
  works: WorkData[],
  challanEntries: ChallanEntryDoc[],
  dipr: DiprPub | null
): Promise<Buffer> {
  const workRows = works.map((w) => {
    const c = computeWork(w);
    return [
      String(w.sno),
      w.ubn,
      w.nameOfWork,
      w.gScheduleAmount.toLocaleString("en-IN"),
      c.bidAmount != null ? c.bidAmount.toLocaleString("en-IN") : "—",
      w.bidRateType === "item_rate" ? "Item Rate" : `${w.bidRatePercent?.toFixed(2) ?? "—"}% ${w.bidRateType === "above" ? "Above" : "Below"}`,
      w.period,
      w.status.toUpperCase(),
    ];
  });

  const compRows = works
    .filter((w) => w.status === "accepted")
    .map((w) => {
      const c = computeWork(w);
      return [
        String(w.sno),
        w.bidderName ?? "—",
        formatINR(c.bidAmount),
        c.bidAmountWords ?? "—",
        formatINR(c.stampDuty),
        c.aps != null && c.aps > 0 ? formatINR(c.aps) : "NIL",
      ];
    });

  const challanRows = challanEntries.map((e) => [
    String(e.workSno),
    e.grnNo,
    e.challanNo,
    e.challanDate,
    e.vendorName,
    e.rislComm.toLocaleString("en-IN"),
    e.head0075Amount.toLocaleString("en-IN"),
    e.head8443Amount.toLocaleString("en-IN"),
  ]);

  const children: Paragraph[] = [
    headerPara(OFFICE_HEADER),
    centeredPara("TENDER EXERCISE — COMPLETE PROJECT RECORD", true),
    centeredPara(`NIT No. ${nit.nitNo}   Dated: ${nit.nitDate}`),
    emptyPara(),
    sectionHeader("1. COMPLETE WORK REGISTER"),
    simpleTable(
      ["S.No.", "UBN No.", "Name of Work", "G-Sched (Rs.)", "Bid (Rs.)", "Rate", "Period", "Status"],
      workRows
    ) as unknown as Paragraph,
    emptyPara(),
    sectionHeader("2. COMPUTATION REGISTER — STAMP DUTY & APS"),
    simpleTable(
      ["S.No.", "Bidder", "Bid Amount", "Amount in Words", "Stamp Duty", "APS"],
      compRows
    ) as unknown as Paragraph,
    emptyPara(),
  ];

  if (challanEntries.length > 0) {
    children.push(sectionHeader("3. EGROSS CHALLAN REGISTER"));
    children.push(simpleTable(
      ["Work", "GRN No.", "Challan No.", "Date", "Vendor", "RISL Comm.", "Head 0075", "Head 8443"],
      challanRows
    ) as unknown as Paragraph);
    children.push(emptyPara());
  }

  if (dipr) {
    children.push(sectionHeader("4. DIPR PUBLICATION DETAILS"));
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `RO No.: ${dipr.roNo}    Release Date: ${dipr.releaseDate}    Total: Rs. ${dipr.totalAmount.toLocaleString("en-IN")}/-`, size: 24 }),
      ],
      spacing: { after: 100 },
    }));
    const diprRows = dipr.entries.map((e) => [
      String(e.srNo),
      e.newspaperName,
      e.editionName,
      String(e.sqCm),
      e.rate.toFixed(2),
      e.amount.toFixed(2),
    ]);
    children.push(simpleTable(["Sr.", "Newspaper", "Edition", "Sq.cm", "Rate", "Amount (Rs.)"], diprRows) as unknown as Paragraph);
    children.push(emptyPara());
  }

  children.push(emptyPara());
  children.push(rightAlignedPara(SIGNING_AUTHORITY_LINE1, true));
  children.push(rightAlignedPara(SIGNING_AUTHORITY_LINE2, true));
  children.push(rightAlignedPara(SIGNING_AUTHORITY_LINE3));

  const doc = new Document({ sections: [{ children }] });
  return Buffer.from(await Packer.toBuffer(doc));
}
