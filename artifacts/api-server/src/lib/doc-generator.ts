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

interface BgVerificationData {
  contractorName?: string | null;
  contractorAddress?: string | null;
  bgFdrNo?: string | null;
  amount?: number | null;
  amountDate?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  purpose?: string | null;
  letterNo?: string | null;
  letterDate?: string | null;
}

function blankField(value: string | null | undefined, width = 20): string {
  return value && value.trim().length > 0 ? value : "_".repeat(width);
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

// ─── WORK ORDER ───────────────────────────────────────────────────────────────

function buildWorkOrder(work: WorkData, nit: NitData): Paragraph[] {
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
  const bidAmount = work.bidAmount ?? 0;
  const bidWords = computed.bidAmountWords ?? numberToIndianWords(bidAmount);

  const rateStr =
    work.bidRateType === "item_rate"
      ? "Item Rate"
      : `${work.bidRatePercent?.toFixed(2) ?? "0.00"}% ${work.bidRateType === "above" ? "Above" : "Below"} B.S.R. 2022 (Roads)`;

  const aen = work.aenSubDivision
    ? `Assistant Engineer, P.W.D. Sub Dn. ${work.aenSubDivision}`
    : "Assistant Engineer, P.W.D. Sub Dn.";

  const agreementNo = (work as any).agreementNo ?? "___________";
  const commencementDate = (work as any).commencementDate ?? "___________";
  const completionDate = (work as any).completionDate ?? "___________";

  return [
    headerPara("OFFICE OF THE EXECUTIVE ENGINEER P.W.D. DISTT. DN. II UDAIPUR"),
    new Paragraph({
      children: [
        new TextRun({ text: "No :-                              ", size: 24 }),
        new TextRun({ text: "Date :-                    ", size: 24 }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `M/s ${work.bidderName ?? "_______________"},`, size: 24 })],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: work.bidderAddress ?? "___________________________________", size: 24 })],
      spacing: { after: 60 },
    }),
    work.bidderContact
      ? new Paragraph({
          children: [new TextRun({ text: `Mobile No. : ${work.bidderContact}`, size: 24 })],
          spacing: { after: 200 },
        })
      : emptyPara(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "WRITTEN ORDER TO COMMENCEMENT OF WORK",
          bold: true,
          underline: { type: UnderlineType.SINGLE },
          size: 26,
        }),
      ],
      spacing: { before: 100, after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Sub:- ", bold: true, size: 24 }),
        new TextRun({ text: work.nameOfWork, size: 24 }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Ref.:- ", bold: true, size: 24 }),
        new TextRun({ text: `Nit No. ${nit.nitNo} (${nit.office ?? "EE PWD Distt. Dn. II Udaipur"}) S.no. ${work.sno}`, size: 24 }),
      ],
      spacing: { after: 160 },
    }),
    new Paragraph({ children: [new TextRun({ text: "Sir,", size: 24 })], spacing: { after: 80 } }),
    justifiedPara(
      `Your tender for the above work amounting to Rs. ${bidAmount.toLocaleString("en-IN")} (${bidWords}) @ ${rateStr} without any conditions has been accepted by Undersigned on behalf of the Governor of the State of Rajasthan.`
    ),
    justifiedPara(
      `You are requested to attend this office to complete formal agreement and produce stamp worth Rs. ${stampDuty.toLocaleString("en-IN")}/- and option for security deposit within 7 days.`
    ),
    justifiedPara(
      "You are requested to contact the Assistant Engineer in- charge of work and start the work under intimation to this office."
    ),
    justifiedPara(
      `The appendix XI (RPWA 100) of PWF & AR (as amended from time to time), tender documents and this letter shall form part of Agreement executed between you and the Governor of the State of Rajasthan Agreement no.:- ${agreementNo}.`
    ),
    justifiedPara(
      `The time allowed for the said work is Upto ${work.period} and shall be reckoned from Fifteen days after issue of this work order with the date of start and stipulated date of completion as mentioned below:`
    ),
    emptyPara(),
    new Paragraph({
      children: [
        new TextRun({ text: "Please Submit STP Within 7 Days.", bold: true, size: 24 }),
      ],
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Date of Commencement of work :                         ", bold: true, size: 24 }),
        new TextRun({ text: commencementDate, size: 24 }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Stipulated date of Completion of work :          ", bold: true, size: 24 }),
        new TextRun({ text: completionDate, size: 24 }),
      ],
      spacing: { after: 300 },
    }),
    rightAlignedPara("(ANIL KHINCHI)", true),
    rightAlignedPara("Executive Engineer", true),
    rightAlignedPara("Signed on behalf of the"),
    rightAlignedPara("Governor"),
    rightAlignedPara("Of the State of Rajasthan"),
    emptyPara(),
    new Paragraph({
      children: [
        new TextRun({ text: "No :-                              ", size: 24 }),
        new TextRun({ text: "Date :-                    ", size: 24 }),
      ],
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Copy submitted/forwarded to the following for information & necessary action:-", size: 24 })],
      spacing: { after: 100 },
    }),
    new Paragraph({ children: [new TextRun({ text: "1  The Superintending Engineer, P.W.D. City Circle Udaipur.", size: 24 })], spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: `2  The ${aen}.`, size: 24 })], spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: "3  The Income Tax Office/Sales Tax Office (Works & Leasing Tax) Mining Eng./ labour Inspector.", size: 24 })], spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: `4  Auditor Sub Dn. ${work.aenSubDivision ?? "___________"}.`, size: 24 })], spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: "5  Agreement Clerk Dn.", size: 24 })], spacing: { after: 200 } }),
    rightAlignedPara("(ANIL KHINCHI)", true),
    rightAlignedPara("Executive Engineer"),
    rightAlignedPara("P.W.D. Distt. Dn. II, Udaipur"),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ─── NEGOTIATION LETTERS ──────────────────────────────────────────────────────

/**
 * Builds the official Negotiation Call Letter from the EE (PWD) to the contractor.
 * Format mirrors the handwritten sample:
 *   • Office header (right-aligned)
 *   • No.Ac/___  NEGOTIATIONS  Dated: ___
 *   • M/s / Shri: <contractor name + address>
 *   • Sub: Tenders for the work <name of work>
 *   • Body inviting sealed negotiated offer
 *   • Date/Time for opening the sealed offer
 *   • Signature block
 */
function buildNegotiationCallLetter(work: WorkData, nit: NitData): Paragraph[] {
  const negotiationDate = (work as any).negotiationDate ?? "18/07/2026";
  const negotiationTime = (work as any).negotiationTime ?? "4 P.M.";

  return [
    // Office header (centered)
    headerPara(OFFICE_HEADER),
    emptyPara(),
    // No. and Date line
    new Paragraph({
      children: [
        new TextRun({ text: "No.: _______________________", size: 24 }),
        new TextRun({ text: "                    Date: _______________________", size: 24 }),
      ],
      spacing: { after: 40 },
    }),
    // NEGOTIATIONS heading
    centeredPara("(NEGOTIATIONS)", false),
    emptyPara(),
    // Addressee
    new Paragraph({
      children: [
        new TextRun({ text: work.bidderName ?? "_______________________________________________", size: 24 }),
      ],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: work.bidderAddress ?? "_______________________________________________",
          size: 24,
        }),
      ],
      spacing: { after: 40 },
    }),
    // Mobile number (if present)
    work.bidderContact
      ? new Paragraph({
          children: [new TextRun({ text: `Mobile: ${work.bidderContact}`, size: 24 })],
          spacing: { after: 120 },
        })
      : emptyPara(),
    // Subject
    new Paragraph({
      children: [
        new TextRun({ text: "  Sub :- ", bold: true, size: 24 }),
        new TextRun({ text: work.nameOfWork, size: 24 }),
      ],
      spacing: { after: 40 },
    }),
    // Reference
    new Paragraph({
      children: [
        new TextRun({ text: "  Ref :- ", bold: true, size: 24 }),
        new TextRun({ text: `NIT No. ${nit.nitNo}`, size: 24 }),
      ],
      spacing: { after: 120 },
    }),
    // Salutation
    new Paragraph({ children: [new TextRun({ text: "Sir,", size: 24 })], spacing: { after: 40 } }),
    // Body Para 1
    justifiedPara(
      `Please refer to your tender submitted for the above work, since the rates offered by you have been considered on higher side. It has been decided to hold the negotiation on ${negotiationDate}.`
    ),
    // Body Para 2
    justifiedPara(
      `You are therefore requested to please quote your negotiated offer in a sealed cover which shall be opened on ${negotiationDate} at ${negotiationTime} in this office in presence of the contractors who choose to be present on date.`
    ),
    // Body Para 3
    justifiedPara(
      `It may please be carefully noted that the condition what so ever if laid may invalid at your offer.`
    ),
    emptyPara(),
    new Paragraph({
      children: [
        new TextRun({ text: "The receipt of the may please be acknowledged.", size: 24 }),
      ],
      indent: { firstLine: 720 },
      spacing: { after: 120 },
    }),
    emptyPara(),
    rightAlignedPara(SIGNING_AUTHORITY_LINE1, true),
    rightAlignedPara(SIGNING_AUTHORITY_LINE2, true),
    rightAlignedPara(SIGNING_AUTHORITY_LINE3),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

/**
 * Builds the Contractor's Reply / Negotiation Offer letter.
 * Format mirrors the typed sample reply:
 *   • "To" address block (EE)
 *   • Subject + Reference
 *   • Body offering revised (negotiated) rate
 *   • Table: Work Description | Qty | Quoted Rate | Negotiated Rate
 *   • Closing para + Yours Faithfully block
 */
function buildContractorNegotiationReply(work: WorkData, nit: NitData): Paragraph[] {
  const quotedRate =
    work.bidRateType === "item_rate"
      ? "Item Rate"
      : `${work.bidRatePercent?.toFixed(2) ?? "—"}% ${work.bidRateType === "above" ? "Above" : "Below"}`;

  // The negotiated rate field — stored in work as negotiatedRatePercent / negotiatedRateType if present
  const negPercent = (work as any).negotiatedRatePercent;
  const negType = (work as any).negotiatedRateType ?? work.bidRateType;
  const negotiatedRate =
    negPercent != null
      ? `${Number(negPercent).toFixed(2)}% ${negType === "above" ? "Above" : negType === "below" ? "Below" : ""}`
      : "________________________";

  // Table for the negotiated offer
  const offerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
      insideH: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideV: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    },
    rows: [
      // Header row spanning col 3-4 with merged sub-heading
      new TableRow({
        children: [
          new TableCell({
            rowSpan: 2,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "S.\nNo.", bold: true, size: 20 })] })],
            verticalAlign: VerticalAlign.CENTER,
            shading: { type: ShadingType.CLEAR, color: "auto", fill: "D9E1F2" },
          }),
          new TableCell({
            rowSpan: 2,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Work Description", bold: true, size: 20 })] })],
            verticalAlign: VerticalAlign.CENTER,
            shading: { type: ShadingType.CLEAR, color: "auto", fill: "D9E1F2" },
          }),
          new TableCell({
            rowSpan: 2,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Qty", bold: true, size: 20 })] })],
            verticalAlign: VerticalAlign.CENTER,
            shading: { type: ShadingType.CLEAR, color: "auto", fill: "D9E1F2" },
          }),
          new TableCell({
            columnSpan: 2,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: work.nameOfWork, bold: true, size: 18 })],
              }),
            ],
            shading: { type: ShadingType.CLEAR, color: "auto", fill: "D9E1F2" },
          }),
        ],
      }),
      // Sub-header row: Quoted Price | Negotiated Price
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Quoted Price", bold: true, size: 20 })] })],
            shading: { type: ShadingType.CLEAR, color: "auto", fill: "D9E1F2" },
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Negotiated Price", bold: true, size: 20 })] })],
            shading: { type: ShadingType.CLEAR, color: "auto", fill: "D9E1F2" },
          }),
        ],
      }),
      // Data row
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "1.", size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: work.nameOfWork, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "1 Job", size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: quotedRate, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: negotiatedRate, bold: true, size: 20 })] })],
          }),
        ],
      }),
    ],
  });

  return [
    // "To" address block
    new Paragraph({
      children: [new TextRun({ text: "To,", size: 24 })],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `The ${SIGNING_AUTHORITY_LINE2},`, size: 24 })],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ text: OFFICE_HEADER, size: 24 })],
      spacing: { after: 200 },
    }),

    // Subject + Reference
    new Paragraph({
      children: [
        new TextRun({ text: "Subject: ", bold: true, size: 24 }),
        new TextRun({ text: work.nameOfWork, size: 24 }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Reference: ", bold: true, size: 24 }),
        new TextRun({ text: `NIT No. ${nit.nitNo}`, size: 24 }),
      ],
      spacing: { after: 120 },
    }),

    // Salutation
    new Paragraph({
      children: [new TextRun({ text: "Dear Sir,", size: 24 })],
      spacing: { after: 120 },
    }),

    // Body
    justifiedPara(
      `With reference to above subject, we would like to inform you that we have submitted our price on very competitive rates. Even then we would like to offer some extra discount as under: -`
    ),
    emptyPara(),

    // If we have specific negotiated items, add them (like user's sample)
    ...((work as any).negotiatedItems && Array.isArray((work as any).negotiatedItems)
      ? (work as any).negotiatedItems.map((item: string) => new Paragraph({
          children: [new TextRun({ text: item, size: 24 })],
          spacing: { after: 40 },
        }))
      : [offerTable as unknown as Paragraph]),

    emptyPara(),
    justifiedPara(
      "Hope you will find the above in order & arrange to release the work order at your earliest possible & oblige."
    ),
    justifiedPara("Thanking you and assuring you of our best services always."),
    emptyPara(),
    new Paragraph({
      children: [new TextRun({ text: "Yours faithfully,", size: 24 })],
      spacing: { after: 120 },
    }),
    emptyPara(),
    emptyPara(),
    new Paragraph({
      children: [new TextRun({ text: work.bidderName ?? "_______________________________________________", bold: true, size: 24 })],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ text: work.bidderAddress ?? "_______________________________________________", size: 22 })],
      spacing: { after: 40 },
    }),
    work.bidderContact
      ? new Paragraph({ children: [new TextRun({ text: `Mobile: ${work.bidderContact}`, size: 22 })], spacing: { after: 60 } })
      : emptyPara(),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function buildBankBgLetter(bg: BgVerificationData): Paragraph[] {
  const amountStr = bg.amount != null ? `Rs. ${bg.amount.toLocaleString("en-IN")}/-` : "Rs. __________/-";
  const purpose = bg.purpose ?? "performance guarantee / security deposit / deposit in lieu of unbalanced bid";

  return [
    headerPara(OFFICE_HEADER),
    new Paragraph({
      children: [
        new TextRun({ text: `No.: ${blankField(bg.letterNo, 12)}`, size: 24 }),
        new TextRun({ text: `          Date: ${blankField(bg.letterDate, 12)}`, size: 24 }),
      ],
      spacing: { after: 180 },
    }),
    new Paragraph({ children: [new TextRun({ text: "To,", size: 24 })], spacing: { after: 40 } }),
    new Paragraph({ children: [new TextRun({ text: "The Branch Manager,", size: 24 })], spacing: { after: 40 } }),
    new Paragraph({ children: [new TextRun({ text: `${blankField(bg.bankName, 24)},`, size: 24 })], spacing: { after: 40 } }),
    new Paragraph({ children: [new TextRun({ text: `${blankField(bg.bankBranch, 24)}.`, size: 24 })], spacing: { after: 160 } }),
    new Paragraph({
      children: [
        new TextRun({ text: "Sub :- ", bold: true, size: 24 }),
        new TextRun({
          text: `Verification of BG/FDR No. ${blankField(bg.bgFdrNo, 12)} for ${amountStr} dated ${blankField(bg.amountDate, 12)}`,
          bold: true,
          size: 24,
        }),
      ],
      spacing: { after: 160 },
    }),
    new Paragraph({ children: [new TextRun({ text: "Sir,", size: 24 })], spacing: { after: 100 } }),
    justifiedPara(`The following security document has been deposited in this office for ${purpose} by the contractor:`),
    emptyPara(),
    new Paragraph({
      children: [new TextRun({ text: `M/s ${blankField(bg.contractorName, 30)}`, bold: true, size: 24 })],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ text: blankField(bg.contractorAddress, 40), size: 24 })],
      spacing: { after: 160 },
    }),
    boldPara("BG/FDR Details:"),
    new Paragraph({ children: [new TextRun({ text: `BG/FDR No. : ${blankField(bg.bgFdrNo, 12)}`, size: 24 })], spacing: { after: 40 } }),
    new Paragraph({ children: [new TextRun({ text: `Amount      : ${amountStr}`, size: 24 })], spacing: { after: 40 } }),
    new Paragraph({ children: [new TextRun({ text: `Dated       : ${blankField(bg.amountDate, 12)}`, size: 24 })], spacing: { after: 160 } }),
    justifiedPara("1. Kindly confirm whether the above Bank Guarantee / FDR has been issued by your bank."),
    justifiedPara(
      "2. Please also confirm whether the lien / pledge / hypothecation in favour of The Executive Engineer, PWD District Division-II, Udaipur has been duly authenticated / marked by your bank or not."
    ),
    justifiedPara("An immediate reply to this letter is requested."),
    justifiedPara("The receipt of this letter may please be acknowledged."),
    emptyPara(),
    rightAlignedPara(SIGNING_AUTHORITY_LINE1, true),
    rightAlignedPara(SIGNING_AUTHORITY_LINE2, true),
    rightAlignedPara(SIGNING_AUTHORITY_LINE3),
    new Paragraph({ children: [new PageBreak()] }),
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

export async function generateWorkOrders(nit: NitData, works: WorkData[]): Promise<Buffer> {
  const acceptedWorks = works.filter((w) => w.status === "accepted");
  const allParas: Paragraph[] = [];
  for (const work of acceptedWorks) {
    allParas.push(...buildWorkOrder(work, nit));
  }
  const doc = new Document({ sections: [{ children: allParas }] });
  return Buffer.from(await Packer.toBuffer(doc));
}

/**
 * Generates two paired letters per accepted work:
 *  1. Negotiation Call Letter  — from EE (PWD) to contractor
 *  2. Contractor's Negotiation Reply — draft reply from contractor offering revised rate
 *
 * Cancelled works (Work 2, NIL bids) are automatically skipped.
 * Each pair is separated by a page break.
 */
export async function generateNegotiationLetters(nit: NitData, works: WorkData[]): Promise<Buffer> {
  const acceptedWorks = works.filter((w) => w.status === "accepted");
  const allParas: Paragraph[] = [];

  for (const work of acceptedWorks) {
    // Page heading per work pair
    allParas.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `WORK ${work.sno} — NEGOTIATION SET`,
            bold: true,
            underline: { type: UnderlineType.SINGLE },
            size: 26,
            color: "1F3A6E",
          }),
        ],
        spacing: { after: 200 },
        shading: { type: ShadingType.CLEAR, color: "auto", fill: "E8EDF7" },
      })
    );

    // Letter A: EE → Contractor (Call Letter)
    allParas.push(
      new Paragraph({
        children: [
          new TextRun({ text: "PART A — NEGOTIATION CALL LETTER (From EE to Contractor)", bold: true, size: 22, color: "555555" }),
        ],
        spacing: { after: 120 },
      })
    );
    allParas.push(...buildNegotiationCallLetter(work, nit));

    // Letter B: Contractor → EE (Reply / Revised Offer)
    allParas.push(
      new Paragraph({
        children: [
          new TextRun({ text: "PART B — CONTRACTOR'S NEGOTIATION REPLY (Draft for Contractor)", bold: true, size: 22, color: "555555" }),
        ],
        spacing: { after: 120 },
      })
    );
    allParas.push(...buildContractorNegotiationReply(work, nit));
  }

  const doc = new Document({ sections: [{ children: allParas }] });
  return Buffer.from(await Packer.toBuffer(doc));
}

export async function generateNegotiationReplyFormats(nit: NitData, works: WorkData[]): Promise<Buffer> {
  const acceptedWorks = works.filter((w) => w.status === "accepted");
  const allParas: Paragraph[] = [];

  for (const work of acceptedWorks) {
    allParas.push(...buildContractorNegotiationReply(work, nit));
  }

  const doc = new Document({ sections: [{ children: allParas }] });
  return Buffer.from(await Packer.toBuffer(doc));
}

export async function generateBankBgLetters(bgVerifications: BgVerificationData[], works: WorkData[] = []): Promise<Buffer> {
  const sourceRows =
    bgVerifications.length > 0
      ? bgVerifications
      : works
          .filter((w) => w.status === "accepted")
          .map((w) => ({
            contractorName: w.bidderName,
            contractorAddress: w.bidderAddress,
            amount: (w as any).bgFdrAmount ?? w.aps ?? null,
            amountDate: (w as any).bgFdrDate ?? null,
            bgFdrNo: (w as any).bgFdrNo ?? null,
            bankName: (w as any).bankName ?? null,
            bankBranch: (w as any).bankBranch ?? null,
          }));

  const allParas: Paragraph[] = [];
  for (const row of sourceRows) {
    allParas.push(...buildBankBgLetter(row));
  }

  const doc = new Document({ sections: [{ children: allParas }] });
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
