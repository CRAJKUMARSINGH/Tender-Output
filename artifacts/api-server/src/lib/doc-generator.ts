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

// â”€â”€ Typography â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FONT = "Times New Roman";   // elegant serif â€” standard for PWD official letters

// Applied to every Document() so all text inherits the typeface automatically
const DOC_STYLES = {
  styles: {
    default: {
      document: { run: { font: FONT } },
    },
  },
};

// â”€â”€ Spacing constants (twips; 1 pt = 20 twips) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SP = {
  afterHeader: 60,   // after office/section header
  afterTitle: 40,    // after document title line
  afterBody: 60,     // after a body paragraph
  afterSmall: 30,    // after label/salutation lines
  afterEmpty: 40,    // placeholder empty paragraph
};

// â”€â”€ Font sizes (half-pts; size: 26 = 13 pt) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FS = {
  header: 26,   // 13 pt â€” office header
  title:  24,   // 12 pt â€” document title / bold section labels
  body:   22,   // 11 pt â€” body paragraphs, salutation, address
  tblData: 20,  // 10 pt â€” table data cells
  tblHdr:  18,  //  9 pt â€” table column headers (white on blue)
};

// â”€â”€ A4 page layout (twips; 1 inch = 1440 twips) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const A4_SECTION_PROPS = {
  properties: {
    page: {
      size: { width: 11906, height: 16838 },
      margin: { top: 720, bottom: 720, left: 1080, right: 1080 },
    },
  },
};

function headerPara(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text,
        bold: true,
        underline: { type: UnderlineType.SINGLE },
        size: FS.header,
        font: FONT,
      }),
    ],
    spacing: { after: SP.afterHeader },
  });
}

function centeredPara(text: string, bold = false): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text, bold, size: FS.title, font: FONT })],
    spacing: { after: SP.afterTitle },
  });
}

function justifiedPara(text: string, indent = true): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.BOTH,
    indent: indent ? { firstLine: 720 } : undefined,
    children: [new TextRun({ text, size: FS.body, font: FONT })],
    spacing: { after: SP.afterBody },
  });
}

function rightAlignedPara(text: string, bold = false): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    children: [new TextRun({ text, bold, size: FS.body, font: FONT })],
    spacing: { after: SP.afterSmall },
  });
}

// Signing-block lines â€” flush, no inter-line gap
function signPara(text: string, bold = false): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    children: [new TextRun({ text, bold, size: FS.body, font: FONT })],
    spacing: { before: 0, after: 0 },
  });
}

function boldPara(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: FS.body, font: FONT })],
    spacing: { after: SP.afterSmall },
  });
}

function emptyPara(): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: "", font: FONT })], spacing: { after: SP.afterEmpty } });
}

function blankLine(): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: "" })] });
}

function sectionHeader(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, size: FS.title, color: "1F3A6E", font: FONT })],
    spacing: { before: 160, after: 80 },
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
              children: [new TextRun({ text: h, bold: true, size: FS.tblHdr, color: "FFFFFF", font: FONT })],
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
                  children: [new TextRun({ text: cell, size: FS.tblData, font: FONT })],
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
  if (amount == null) return "â€”";
  return "Rs. " + amount.toLocaleString("en-IN") + "/-";
}

// â”€â”€â”€ ACCEPTANCE LETTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  // Scrutiny sheet — Authority & Validity fields
  tenderValidity?: string | null;          // Row: "Validity of tender"
  authorityToAccept?: string | null;       // Row: "Authority competent to sanction the tender"
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
  return value && value.trim().length > 0 ? value : "";
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
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "No.: ________________________", size: FS.body, font: FONT }),
        new TextRun({ text: "          Date: ________________________", size: FS.body, font: FONT }),
      ],
      spacing: { after: 120 },
    }),
    centeredPara("(Letter of Acceptance of Tender)"),
    emptyPara(),
    new Paragraph({
      children: [
        new TextRun({ text: (work.bidderName ?? "M/s. _______________") + ",", size: FS.body, font: FONT }),
      ],
      spacing: { before: 0, after: 0 },
    }),
    new Paragraph({
      children: [new TextRun({ text: (work.bidderAddress ?? "___________________________________") + ".", size: FS.body, font: FONT })],
      spacing: { before: 0, after: 0 },
    }),
    work.bidderContact
      ? new Paragraph({
          children: [new TextRun({ text: "Mobile: " + work.bidderContact, size: FS.body, font: FONT })],
          spacing: { before: 0, after: 60 },
        })
      : emptyPara(),
    new Paragraph({
      children: [
        new TextRun({ text: "  Sub :-", bold: true, size: FS.body, font: FONT }),
        new TextRun({ text: " " + work.nameOfWork, size: FS.body, font: FONT }),
      ],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "  Ref :-", bold: true, size: FS.body, font: FONT }),
        new TextRun({ text: " NIT No. " + nit.nitNo, size: FS.body, font: FONT }),
      ],
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Sir,", size: FS.body, font: FONT })],
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
    signPara(SIGNING_AUTHORITY_LINE1, true),
    signPara(SIGNING_AUTHORITY_LINE2, true),
    signPara(SIGNING_AUTHORITY_LINE3),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "No.: ________________________", size: FS.body, font: FONT }),
        new TextRun({ text: "          Date: ________________________", size: FS.body, font: FONT }),
      ],
      spacing: { before: 0, after: 20 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Copy submitted to the following :-", size: FS.body, font: FONT })],
      spacing: { before: 0, after: 20 },
    }),
    new Paragraph({ children: [new TextRun({ text: "1-  The Additional Chief Engineer PWD Zone Udaipur.", size: FS.body, font: FONT })], spacing: { before: 0, after: 0 } }),
    new Paragraph({ children: [new TextRun({ text: "2-  The Superintending Engineer PWD City Circle Udaipur.", size: FS.body, font: FONT })], spacing: { before: 0, after: 0 } }),
    new Paragraph({ children: [new TextRun({ text: `3-  ${aen}.`, size: FS.body, font: FONT })], spacing: { before: 0, after: 0 } }),
    signPara(SIGNING_AUTHORITY_LINE1, true),
    signPara(SIGNING_AUTHORITY_LINE2, true),
    signPara(SIGNING_AUTHORITY_LINE3),
    new Paragraph({
      children: [new PageBreak()],
    }),
  ];
}

// â”€â”€â”€ WORK ORDER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "No :-                              ", size: FS.body, font: FONT }),
        new TextRun({ text: "Date :-                    ", size: FS.body, font: FONT }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `M/s ${work.bidderName ?? "_______________"},`, size: FS.body, font: FONT })],
      spacing: { before: 0, after: 0 },
    }),
    new Paragraph({
      children: [new TextRun({ text: work.bidderAddress ?? "___________________________________", size: FS.body, font: FONT })],
      spacing: { before: 0, after: 0 },
    }),
    work.bidderContact
      ? new Paragraph({
          children: [new TextRun({ text: `Mobile No. : ${work.bidderContact}`, size: FS.body, font: FONT })],
          spacing: { before: 0, after: 60 },
        })
      : emptyPara(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "WRITTEN ORDER TO COMMENCEMENT OF WORK",
          bold: true,
          underline: { type: UnderlineType.SINGLE },
          size: FS.header,
        }),
      ],
      spacing: { before: 100, after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Sub:- ", bold: true, size: FS.body, font: FONT }),
        new TextRun({ text: work.nameOfWork, size: FS.body, font: FONT }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Ref.:- ", bold: true, size: FS.body, font: FONT }),
        new TextRun({ text: `Nit No. ${nit.nitNo} (${nit.office ?? "EE PWD Distt. Dn. II Udaipur"}) S.no. ${work.sno}`, size: FS.body, font: FONT }),
      ],
      spacing: { after: 160 },
    }),
    new Paragraph({ children: [new TextRun({ text: "Sir,", size: FS.body, font: FONT })], spacing: { after: 80 } }),
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
        new TextRun({ text: "Please Submit STP Within 7 Days.", bold: true, size: FS.body, font: FONT }),
      ],
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Date of Commencement of work :                         ", bold: true, size: FS.body, font: FONT }),
        new TextRun({ text: commencementDate, size: FS.body, font: FONT }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Stipulated date of Completion of work :          ", bold: true, size: FS.body, font: FONT }),
        new TextRun({ text: completionDate, size: FS.body, font: FONT }),
      ],
      spacing: { after: 60 },
    }),
    signPara("(ANIL KHINCHI)", true),
    signPara("Executive Engineer", true),
    signPara("Signed on behalf of the"),
    signPara("Governor"),
    signPara("Of the State of Rajasthan"),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "No :-                              ", size: FS.body, font: FONT }),
        new TextRun({ text: "Date :-                    ", size: FS.body, font: FONT }),
      ],
      spacing: { before: 0, after: 20 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Copy submitted/forwarded to the following for information & necessary action:-", size: FS.body, font: FONT })],
      spacing: { before: 0, after: 20 },
    }),
    new Paragraph({ children: [new TextRun({ text: "1  The Superintending Engineer, P.W.D. City Circle Udaipur.", size: FS.body, font: FONT })], spacing: { before: 0, after: 0 } }),
    new Paragraph({ children: [new TextRun({ text: `2  The ${aen}.`, size: FS.body, font: FONT })], spacing: { before: 0, after: 0 } }),
    new Paragraph({ children: [new TextRun({ text: "3  The Income Tax Office/Sales Tax Office (Works & Leasing Tax) Mining Eng./ labour Inspector.", size: FS.body, font: FONT })], spacing: { before: 0, after: 0 } }),
    new Paragraph({ children: [new TextRun({ text: `4  Auditor Sub Dn. ${work.aenSubDivision ?? "___________"}.`, size: FS.body, font: FONT })], spacing: { before: 0, after: 0 } }),
    new Paragraph({ children: [new TextRun({ text: "5  Agreement Clerk Dn.", size: FS.body, font: FONT })], spacing: { before: 0, after: 0 } }),
    signPara("(ANIL KHINCHI)", true),
    signPara("Executive Engineer"),
    signPara("P.W.D. Distt. Dn. II, Udaipur"),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// â”€â”€â”€ NEGOTIATION LETTERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Builds the official Negotiation Call Letter from the EE (PWD) to the contractor.
 * Format mirrors the handwritten sample:
 *   â€¢ Office header (right-aligned)
 *   â€¢ No.Ac/___  NEGOTIATIONS  Dated: ___
 *   â€¢ M/s / Shri: <contractor name + address>
 *   â€¢ Sub: Tenders for the work <name of work>
 *   â€¢ Body inviting sealed negotiated offer
 *   â€¢ Date/Time for opening the sealed offer
 *   â€¢ Signature block
 */
function buildNegotiationCallLetter(work: WorkData, nit: NitData): Paragraph[] {
  const negotiationDate = (work as any).negotiationDate ?? "18/07/2026";
  const negotiationTime = (work as any).negotiationTime ?? "4 P.M.";

  return [
    // Office header (centered)
    headerPara(OFFICE_HEADER),
    emptyPara(),
    // No. and Date line â€” centered
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "No.: _______________________", size: FS.body, font: FONT }),
        new TextRun({ text: "          Date: _______________________", size: FS.body, font: FONT }),
      ],
      spacing: { after: 40 },
    }),
    // NEGOTIATIONS heading
    centeredPara("(NEGOTIATIONS)", false),
    emptyPara(),
    // Addressee
    new Paragraph({
      children: [
        new TextRun({ text: work.bidderName ?? "_______________________________________________", size: FS.body, font: FONT }),
      ],
      spacing: { before: 0, after: 0 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: work.bidderAddress ?? "_______________________________________________",
          size: FS.body,
          font: FONT,
        }),
      ],
      spacing: { before: 0, after: 0 },
    }),
    // Mobile number (if present)
    work.bidderContact
      ? new Paragraph({
          children: [new TextRun({ text: `Mobile: ${work.bidderContact}`, size: FS.body, font: FONT })],
          spacing: { before: 0, after: 60 },
        })
      : emptyPara(),
    // Subject
    new Paragraph({
      children: [
        new TextRun({ text: "  Sub :- ", bold: true, size: FS.body, font: FONT }),
        new TextRun({ text: work.nameOfWork, size: FS.body, font: FONT }),
      ],
      spacing: { after: 40 },
    }),
    // Reference
    new Paragraph({
      children: [
        new TextRun({ text: "  Ref :- ", bold: true, size: FS.body, font: FONT }),
        new TextRun({ text: `NIT No. ${nit.nitNo}`, size: FS.body, font: FONT }),
      ],
      spacing: { after: 120 },
    }),
    // Salutation
    new Paragraph({ children: [new TextRun({ text: "Sir,", size: FS.body, font: FONT })], spacing: { after: 40 } }),
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
        new TextRun({ text: "The receipt of the may please be acknowledged.", size: FS.body, font: FONT }),
      ],
      indent: { firstLine: 720 },
      spacing: { after: 120 },
    }),
    emptyPara(),
    signPara(SIGNING_AUTHORITY_LINE1, true),
    signPara(SIGNING_AUTHORITY_LINE2, true),
    signPara(SIGNING_AUTHORITY_LINE3),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

/**
 * Builds the Contractor's Reply / Negotiation Offer letter.
 * Format mirrors the typed sample reply:
 *   â€¢ "To" address block (EE)
 *   â€¢ Subject + Reference
 *   â€¢ Body offering revised (negotiated) rate
 *   â€¢ Table: Work Description | Qty | Quoted Rate | Negotiated Rate
 *   â€¢ Closing para + Yours Faithfully block
 */
function buildContractorNegotiationReply(work: WorkData, nit: NitData): Paragraph[] {
  const quotedRate =
    work.bidRateType === "item_rate"
      ? "Item Rate"
      : `${work.bidRatePercent?.toFixed(2) ?? "â€”"}% ${work.bidRateType === "above" ? "Above" : "Below"}`;

  // The negotiated rate field â€” stored in work as negotiatedRatePercent / negotiatedRateType if present
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
      children: [new TextRun({ text: "To,", size: FS.body, font: FONT })],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `The ${SIGNING_AUTHORITY_LINE2},`, size: FS.body, font: FONT })],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ text: OFFICE_HEADER, size: FS.body, font: FONT })],
      spacing: { after: 200 },
    }),

    // Subject + Reference
    new Paragraph({
      children: [
        new TextRun({ text: "Subject: ", bold: true, size: FS.body, font: FONT }),
        new TextRun({ text: work.nameOfWork, size: FS.body, font: FONT }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Reference: ", bold: true, size: FS.body, font: FONT }),
        new TextRun({ text: `NIT No. ${nit.nitNo}`, size: FS.body, font: FONT }),
      ],
      spacing: { after: 120 },
    }),

    // Salutation
    new Paragraph({
      children: [new TextRun({ text: "Dear Sir,", size: FS.body, font: FONT })],
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
          children: [new TextRun({ text: item, size: FS.body, font: FONT })],
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
      children: [new TextRun({ text: "Yours faithfully,", size: FS.body, font: FONT })],
      spacing: { after: 120 },
    }),
    emptyPara(),
    emptyPara(),
    new Paragraph({
      children: [new TextRun({ text: work.bidderName ?? "_______________________________________________", bold: true, size: FS.body, font: FONT })],
      spacing: { before: 0, after: 0 },
    }),
    new Paragraph({
      children: [new TextRun({ text: work.bidderAddress ?? "_______________________________________________", size: 22 })],
      spacing: { before: 0, after: 0 },
    }),
    work.bidderContact
      ? new Paragraph({ children: [new TextRun({ text: `Mobile: ${work.bidderContact}`, size: 22 })], spacing: { before: 0, after: 0 } })
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
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `No.: ${blankField(bg.letterNo, 12)}`, size: FS.body, font: FONT }),
        new TextRun({ text: `          Date: ${blankField(bg.letterDate, 12)}`, size: FS.body, font: FONT }),
      ],
      spacing: { after: 180 },
    }),
    new Paragraph({ children: [new TextRun({ text: "To,", size: FS.body, font: FONT })], spacing: { after: 40 } }),
    new Paragraph({ children: [new TextRun({ text: "The Branch Manager,", size: FS.body, font: FONT })], spacing: { after: 40 } }),
    new Paragraph({ children: [new TextRun({ text: `${blankField(bg.bankName, 24)},`, size: FS.body, font: FONT })], spacing: { after: 40 } }),
    new Paragraph({ children: [new TextRun({ text: `${blankField(bg.bankBranch, 24)}.`, size: FS.body, font: FONT })], spacing: { after: 160 } }),
    new Paragraph({
      children: [
        new TextRun({ text: "Sub :- ", bold: true, size: FS.body, font: FONT }),
        new TextRun({
          text: `Verification of BG/FDR No. ${blankField(bg.bgFdrNo, 12)} for ${amountStr} dated ${blankField(bg.amountDate, 12)}`,
          bold: true,
          size: FS.body,
          font: FONT,
        }),
      ],
      spacing: { after: 160 },
    }),
    new Paragraph({ children: [new TextRun({ text: "Sir,", size: FS.body, font: FONT })], spacing: { after: 100 } }),
    justifiedPara(`The following security document has been deposited in this office for ${purpose} by the contractor:`),
    emptyPara(),
    new Paragraph({
      children: [new TextRun({ text: `M/s ${blankField(bg.contractorName, 30)}`, bold: true, size: FS.body, font: FONT })],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ text: blankField(bg.contractorAddress, 40), size: FS.body, font: FONT })],
      spacing: { after: 160 },
    }),
    boldPara("BG/FDR Details:"),
    new Paragraph({ children: [new TextRun({ text: `BG/FDR No. : ${blankField(bg.bgFdrNo, 12)}`, size: FS.body, font: FONT })], spacing: { after: 40 } }),
    new Paragraph({ children: [new TextRun({ text: `Amount      : ${amountStr}`, size: FS.body, font: FONT })], spacing: { after: 40 } }),
    new Paragraph({ children: [new TextRun({ text: `Dated       : ${blankField(bg.amountDate, 12)}`, size: FS.body, font: FONT })], spacing: { after: 160 } }),
    justifiedPara("1. Kindly confirm whether the above Bank Guarantee / FDR has been issued by your bank."),
    justifiedPara(
      "2. Please also confirm whether the lien / pledge / hypothecation in favour of The Executive Engineer, PWD District Division-II, Udaipur has been duly authenticated / marked by your bank or not."
    ),
    justifiedPara("An immediate reply to this letter is requested."),
    justifiedPara("The receipt of this letter may please be acknowledged."),
    emptyPara(),
    signPara(SIGNING_AUTHORITY_LINE1, true),
    signPara(SIGNING_AUTHORITY_LINE2, true),
    signPara(SIGNING_AUTHORITY_LINE3),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// â”€â”€â”€ SCRUTINY TABLE â€” two-column label/value per PWD standard format â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SCRUT_BORDER = { style: BorderStyle.SINGLE, size: 1, color: "999999" } as const;
const SCRUT_BORDERS = {
  top: SCRUT_BORDER, bottom: SCRUT_BORDER,
  left: SCRUT_BORDER, right: SCRUT_BORDER,
  insideH: SCRUT_BORDER, insideV: SCRUT_BORDER,
};

function scrutinyTable(rows: Array<[string, string]>): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: SCRUT_BORDERS,
    rows: rows.map(([desc, detail], idx) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 5, type: WidthType.PERCENTAGE },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: String(idx + 1), size: FS.tblData, font: FONT })],
              spacing: { before: 30, after: 30 },
            })],
            shading: { type: ShadingType.CLEAR, color: "auto", fill: idx % 2 === 0 ? "F7F9FC" : "FFFFFF" },
            verticalAlign: VerticalAlign.CENTER,
          }),
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            children: [new Paragraph({
              children: [new TextRun({ text: desc, bold: true, size: FS.tblData, font: FONT })],
              spacing: { before: 30, after: 30 },
            })],
            shading: { type: ShadingType.CLEAR, color: "auto", fill: idx % 2 === 0 ? "F7F9FC" : "FFFFFF" },
            verticalAlign: VerticalAlign.CENTER,
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [new Paragraph({
              children: [new TextRun({ text: detail ?? "", size: FS.tblData, font: FONT })],
              spacing: { before: 30, after: 30 },
            })],
            shading: { type: ShadingType.CLEAR, color: "auto", fill: idx % 2 === 0 ? "F7F9FC" : "FFFFFF" },
            verticalAlign: VerticalAlign.CENTER,
          }),
        ],
      })
    ),
  });
}

function buildScrutinyPage(work: WorkData, nit: NitData): Paragraph[] {
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

  const isCancelled = work.status !== "accepted";

  const v = (x: string | number | null | undefined, fallback = "") =>
    (x == null || x === "" || x === "â€”") ? fallback : String(x);

  const nitAmountDisplay = v(
    work.gScheduleAmount > 0 ? `Rs. ${(work.gScheduleAmount / 100000).toFixed(2)} Lacs` : ""
  );

  const gScheduleDisplay = (!isCancelled && work.gScheduleAmount > 0)
    ? `Rs. ${work.gScheduleAmount.toLocaleString("en-IN")}`
    : "";

  const bidAmountDisplay = isCancelled || !computed.bidAmount
    ? "Nil"
    : `Rs. ${computed.bidAmount.toLocaleString("en-IN")}`;

  const rateDisplay = isCancelled
    ? "Not Applicable"
    : work.bidRateType === "item_rate"
    ? "Item Rate"
    : v(work.bidRatePercent) !== ""
      ? `${Number(work.bidRatePercent).toFixed(2)}% ${work.bidRateType === "above" ? "Above" : "Below"} ${v((work as any).bsr, "PWD Roads BSR")}`
      : "";

  const responsiveBidders = isCancelled
    ? v((work as any).responsiveBidders, "0 (Nil) â€” Bidder Not Admitted")
    : v((work as any).responsiveBidders);

  const recommendation = isCancelled
    ? v((work as any).recommendation, "No responsive bidder participated. Tender is recommended to be CANCELLED. Retender to be invited.")
    : v((work as any).recommendation, "Enclosed");

  // â”€â”€ Authority to accept â€” derived from bid amount if not explicitly provided â”€â”€
  const bidAmt = computed.bidAmount ?? work.bidAmount ?? 0;
  const defaultAuthority = bidAmt <= 2500000
    ? "Executive Engineer, PWD District Division-II, Udaipur"
    : bidAmt <= 50000000
    ? "Superintending Engineer, PWD City Circle, Udaipur"
    : "Chief Engineer / Secretary, PWD Rajasthan";
  const authorityToAccept = v(work.authorityToAccept, defaultAuthority);

  // â”€â”€ Validity â€” default 90 days per PWD norms â”€â”€
  const tenderValidity = v(work.tenderValidity, "90 Days from the date of opening");

  const rows: Array<[string, string]> = [
    ["Administration and Financial Sanction (Ref. and Amt.)", ""],
    ["Technical Sanction (Ref. & Amt.)", ""],
    ["Ref. & Amount Deposited in Case of Deposit Work", v((work as any).depositWorkRef, "Not Applicable")],
    ["NIT Issued (No. & Date)", `NIT No. ${nit.nitNo} Dated ${nit.nitDate}`],
    ["DIPR Ref. for Publication", v((work as any).diprRef)],
    ["UBN No.", v(work.ubn)],
    ["Whether it is a Short-Term NIT (Y/N)", "No"],
    ["Whether Permission of Short NIT Obtained", "Not Applicable"],
    ["NIT Amount of Work", nitAmountDisplay],
    ["Last Date of Online Submission and Time",
      v((work as any).lastSubmissionDate)
        ? v((work as any).lastSubmissionDate) + ((work as any).lastSubmissionTime ? " / " + (work as any).lastSubmissionTime : "")
        : ""],
    ["Date of Online Opening of Tender", v((work as any).openingDate)],
    ["Ref. of Corrigendum (if any)", v((work as any).corrigendumRef, "Not Applicable")],
    ["Revised Date of Submission and Time (if any)", "Not Applicable"],
    ["Revised Date of Opening (if any)", "Not Applicable"],
    ["No. of Tenders Sold", (work as any).tendersSold != null ? String((work as any).tendersSold) : ""],
    ["No. of Tenders Received", (work as any).tendersReceived != null ? String((work as any).tendersReceived) : ""],
    ["Date of Technical Bid Opening", "Not Applicable"],
    ["No. of Responsive Bidders", responsiveBidders],
    ["Date of Financial Bid Opening", v((work as any).financialBidOpeningDate, v((work as any).openingDate))],
    ["BSR", v((work as any).bsr)],
    ["G Schedule Amount", gScheduleDisplay],
    ["Name of Lowest Bidder", isCancelled ? "Nil" : v(work.bidderName)],
    ["Class of Contractor", v((work as any).contractorClass)],
    ["Tender Premium Quoted by the Lowest Bidder", rateDisplay],
    ["Bid Amount of the Lowest Bidder", bidAmountDisplay],
    // Conditions: conditional tenders are not accepted per PWD rules — fixed responses
    ["Lowest Rate Quoted with Condition (if any)", "No Condition"],
    ["Financial Implication of Condition (if any) in Tender", "Not Applicable"],
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    ["EMD & Other Deposit Details", "Enclosed"],
    // â”€â”€ Point 2 from traditional format: Validity & Authority to accept â”€â”€â”€â”€â”€â”€
    ["Validity of Tender", tenderValidity],
    ["Authority Competent to Accept the Tender", authorityToAccept],
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    ["Time of Completion", v(work.period)],
    ["NIT Publication Details", "Enclosed"],
    ["Recommendation", recommendation],
  ];

  return [
    headerPara(OFFICE_HEADER),
    centeredPara("TENDER SCRUTINY / NOTE SHEET", true),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `NIT No. ${nit.nitNo}`, bold: true, size: FS.body, font: FONT }),
        new TextRun({ text: "   |   ", size: FS.body, font: FONT }),
        new TextRun({ text: `S.No. ${work.sno}`, bold: true, size: FS.body, font: FONT }),
      ],
      spacing: { before: 0, after: SP.afterTitle },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "NAME OF WORK: ", bold: true, size: FS.tblData, font: FONT }),
        new TextRun({ text: work.nameOfWork, size: FS.tblData, font: FONT }),
      ],
      spacing: { before: 0, after: 20 },
    }),
    scrutinyTable(rows) as unknown as Paragraph,
    emptyPara(),
    signPara(SIGNING_AUTHORITY_LINE1, true),
    signPara(SIGNING_AUTHORITY_LINE2, true),
    signPara(SIGNING_AUTHORITY_LINE3),
    new Paragraph({ children: [new PageBreak()], spacing: { before: 0, after: 0 } }),
  ];
}

// â”€â”€â”€ PUBLIC API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function generateScrutinyNoteSheet(nit: NitData, works: WorkData[]): Promise<Buffer> {
  const allParas: Paragraph[] = [];
  for (let i = 0; i < works.length; i++) {
    const pageItems = buildScrutinyPage(works[i]!, nit);
    // Drop the trailing PageBreak from the last work
    const items = i < works.length - 1 ? pageItems : pageItems.slice(0, -1);
    allParas.push(...items);
  }
  const doc = new Document({ ...DOC_STYLES, sections: [{ ...A4_SECTION_PROPS, children: allParas }] });
  return Buffer.from(await Packer.toBuffer(doc));
}

export async function generateAcceptanceLetters(nit: NitData, works: WorkData[]): Promise<Buffer> {
  const acceptedWorks = works.filter((w) => w.status === "accepted");
  const allParas: Paragraph[] = [];

  for (const work of acceptedWorks) {
    allParas.push(...buildAcceptanceLetter(work, nit));
  }

  const doc = new Document({ ...DOC_STYLES, sections: [{ ...A4_SECTION_PROPS, children: allParas }] });
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
      children: [new TextRun({ text: `WORK S.NO. ${workSno} â€” TOTAL PARTICIPANTS: ${entries.length}`, bold: true, size: FS.body, font: FONT })],
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
  children.push(signPara(SIGNING_AUTHORITY_LINE1, true));
  children.push(signPara(SIGNING_AUTHORITY_LINE2, true));
  children.push(signPara(SIGNING_AUTHORITY_LINE3));

  const doc = new Document({ ...DOC_STYLES, sections: [{ ...A4_SECTION_PROPS, children }] });
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
        new TextRun({ text: "DIPR RO No.: ", bold: true, size: FS.body, font: FONT }),
        new TextRun({ text: dipr.roNo, size: FS.body, font: FONT }),
        new TextRun({ text: "     Release Date: ", bold: true, size: FS.body, font: FONT }),
        new TextRun({ text: dipr.releaseDate, size: FS.body, font: FONT }),
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
        new TextRun({ text: `Total Publication Cost: Rs. ${dipr.totalAmount.toLocaleString("en-IN")}/-`, bold: true, size: FS.body, font: FONT }),
      ],
      spacing: { after: 200 },
    }),
    emptyPara(),
    signPara(SIGNING_AUTHORITY_LINE1, true),
    signPara(SIGNING_AUTHORITY_LINE2, true),
    signPara(SIGNING_AUTHORITY_LINE3),
  ];

  const doc = new Document({ ...DOC_STYLES, sections: [{ ...A4_SECTION_PROPS, children }] });
  return Buffer.from(await Packer.toBuffer(doc));
}

export async function generateWorkOrders(nit: NitData, works: WorkData[]): Promise<Buffer> {
  const acceptedWorks = works.filter((w) => w.status === "accepted");
  const allParas: Paragraph[] = [];
  for (const work of acceptedWorks) {
    allParas.push(...buildWorkOrder(work, nit));
  }
  const doc = new Document({ ...DOC_STYLES, sections: [{ ...A4_SECTION_PROPS, children: allParas }] });
  return Buffer.from(await Packer.toBuffer(doc));
}

/**
 * Generates two paired letters per accepted work:
 *  1. Negotiation Call Letter  â€” from EE (PWD) to contractor
 *  2. Contractor's Negotiation Reply â€” draft reply from contractor offering revised rate
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
            text: `WORK ${work.sno} â€” NEGOTIATION SET`,
            bold: true,
            underline: { type: UnderlineType.SINGLE },
            size: FS.header,
            color: "1F3A6E",
          }),
        ],
        spacing: { after: 200 },
        shading: { type: ShadingType.CLEAR, color: "auto", fill: "E8EDF7" },
      })
    );

    // Letter A: EE â†’ Contractor (Call Letter)
    allParas.push(
      new Paragraph({
        children: [
          new TextRun({ text: "PART A â€” NEGOTIATION CALL LETTER (From EE to Contractor)", bold: true, size: 22, color: "555555" }),
        ],
        spacing: { after: 120 },
      })
    );
    allParas.push(...buildNegotiationCallLetter(work, nit));

    // Letter B: Contractor â†’ EE (Reply / Revised Offer)
    allParas.push(
      new Paragraph({
        children: [
          new TextRun({ text: "PART B â€” CONTRACTOR'S NEGOTIATION REPLY (Draft for Contractor)", bold: true, size: 22, color: "555555" }),
        ],
        spacing: { after: 120 },
      })
    );
    allParas.push(...buildContractorNegotiationReply(work, nit));
  }

  const doc = new Document({ ...DOC_STYLES, sections: [{ ...A4_SECTION_PROPS, children: allParas }] });
  return Buffer.from(await Packer.toBuffer(doc));
}

export async function generateNegotiationReplyFormats(nit: NitData, works: WorkData[]): Promise<Buffer> {
  const acceptedWorks = works.filter((w) => w.status === "accepted");
  const allParas: Paragraph[] = [];

  for (const work of acceptedWorks) {
    allParas.push(...buildContractorNegotiationReply(work, nit));
  }

  const doc = new Document({ ...DOC_STYLES, sections: [{ ...A4_SECTION_PROPS, children: allParas }] });
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

  const doc = new Document({ ...DOC_STYLES, sections: [{ ...A4_SECTION_PROPS, children: allParas }] });
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
      c.bidAmount != null ? c.bidAmount.toLocaleString("en-IN") : "â€”",
      w.bidRateType === "item_rate" ? "Item Rate" : `${w.bidRatePercent?.toFixed(2) ?? "â€”"}% ${w.bidRateType === "above" ? "Above" : "Below"}`,
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
        w.bidderName ?? "â€”",
        formatINR(c.bidAmount),
        c.bidAmountWords ?? "â€”",
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
    centeredPara("TENDER EXERCISE â€” COMPLETE PROJECT RECORD", true),
    centeredPara(`NIT No. ${nit.nitNo}   Dated: ${nit.nitDate}`),
    emptyPara(),
    sectionHeader("1. COMPLETE WORK REGISTER"),
    simpleTable(
      ["S.No.", "UBN No.", "Name of Work", "G-Sched (Rs.)", "Bid (Rs.)", "Rate", "Period", "Status"],
      workRows
    ) as unknown as Paragraph,
    emptyPara(),
    sectionHeader("2. COMPUTATION REGISTER â€” STAMP DUTY & APS"),
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
        new TextRun({ text: `RO No.: ${dipr.roNo}    Release Date: ${dipr.releaseDate}    Total: Rs. ${dipr.totalAmount.toLocaleString("en-IN")}/-`, size: FS.body, font: FONT }),
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
  children.push(signPara(SIGNING_AUTHORITY_LINE1, true));
  children.push(signPara(SIGNING_AUTHORITY_LINE2, true));
  children.push(signPara(SIGNING_AUTHORITY_LINE3));

  const doc = new Document({ ...DOC_STYLES, sections: [{ ...A4_SECTION_PROPS, children }] });
  return Buffer.from(await Packer.toBuffer(doc));
}


