import { describe, it, expect } from "vitest";
import { parseWorksFromText } from "./tender-parser.js";
import { safeSegment, contentDisposition } from "./http.js";

const NIT = "NIT No. 14/2026-27\nUBN No. UB123456\nPeriod of Completion: 6 months\n";

/** Builds one opening-PDF tender block. */
function block(opts: {
  sno: number;
  name: string;
  gSchedule?: string;      // labeled line, if present
  amountsRow?: string;     // raw table triple
  bidder?: string;
  bidAmount?: string;
}) {
  return [
    `Tender ID : 2026_CEPWD_603219_${opts.sno}`,
    `Contract No : NIT No. 14/2026-27 S.No. ${opts.sno}`,
    `Name of Work : ${opts.name}`,
    opts.gSchedule ? `Estimated Rate : ${opts.gSchedule}` : "",
    opts.amountsRow ?? "",
    opts.bidder ? `Lowest Amount Quoted BY: ${opts.bidder}(${opts.bidAmount})` : "",
  ].filter(Boolean).join("\n");
}

describe("parseWorksFromText — G-schedule extraction", () => {
  it("prefers an explicit 'Estimated Rate' label", () => {
    const works = parseWorksFromText(
      NIT,
      block({ sno: 1, name: "Road work", gSchedule: "97,45,416", bidder: "ACME", bidAmount: "74,01,643" }),
    );
    expect(works[0].gScheduleAmount).toBe(9_745_416);
    expect(works[0].bidAmount).toBe(7_401_643);
  });

  it("reads an unlabeled table triple", () => {
    const works = parseWorksFromText(
      NIT,
      block({
        sno: 1, name: "Drain work",
        amountsRow: "97,45,416\n-24.05\n74,01,643",
        bidder: "ACME", bidAmount: "74,01,643",
      }),
    );
    expect(works[0].gScheduleAmount).toBe(9_745_416);
  });

  it("does not pick up a number inside the bidder name", () => {
    const works = parseWorksFromText(
      NIT,
      block({
        sno: 1, name: "Wall work",
        amountsRow: "10,00,000\n-18.00\n8,20,000",
        bidder: "RAJ 2000 CONSTRUCTIONS", bidAmount: "8,20,000",
      }),
    );
    expect(works[0].gScheduleAmount).toBe(1_000_000);
  });

  it("ignores an implausible percentage triple", () => {
    const works = parseWorksFromText(
      NIT,
      block({
        sno: 1, name: "Tank work",
        amountsRow: "5,00,000\n450.0\n4,00,000",   // pct out of range -> skipped
        bidder: "ACME", bidAmount: "4,00,000",
      }),
    );
    expect(works[0].gScheduleAmount).toBe(0);
  });

  it("marks a work cancelled when no bidder is present", () => {
    const works = parseWorksFromText(NIT, block({ sno: 1, name: "No bids" }));
    expect(works[0].status).toBe("cancelled");
  });

  it("sorts by S.No regardless of block order", () => {
    const text = [
      block({ sno: 3, name: "C", bidder: "X", bidAmount: "1" }),
      block({ sno: 1, name: "A", bidder: "Y", bidAmount: "1" }),
      block({ sno: 2, name: "B", bidder: "Z", bidAmount: "1" }),
    ].join("\n");
    expect(parseWorksFromText(NIT, text).map((w) => w.sno)).toEqual([1, 2, 3]);
  });
});

describe("filename safety", () => {
  it("strips path separators and quotes", () => {
    expect(safeSegment("14/2026-27")).toBe("14-2026-27");
    expect(safeSegment('a"b\\c')).toBe("a-b-c");
    expect(safeSegment("///")).toBe("document");
  });

  it("emits an RFC 5987 compatible header", () => {
    const h = contentDisposition("NIT 14/2026-27.docx");
    expect(h).toContain('filename="NIT 14_2026-27.docx"');
    expect(h).toContain("filename*=UTF-8''");
  });
});
