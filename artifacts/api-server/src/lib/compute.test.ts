import { describe, it, expect } from "vitest";
import {
  computeStampDuty,
  computeAps,
  computeWork,
  numberToIndianWords,
  type WorkInput,
} from "./compute.js";

const L = 100_000;
const CR = 10_000_000;

describe("computeStampDuty — Rajasthan PWD rules", () => {
  it("flat Rs.1000 at or below Rs.50 Lakh", () => {
    expect(computeStampDuty(26_32_421)).toBe(1000);
    expect(computeStampDuty(50 * L)).toBe(1000);   // boundary is inclusive
    expect(computeStampDuty(0)).toBe(1000);
  });

  it("0.15% above Rs.50 Lakh", () => {
    expect(computeStampDuty(74_01_643)).toBe(11_102);
    expect(computeStampDuty(50 * L + 1)).toBe(7_500);
    expect(computeStampDuty(5 * CR)).toBe(75_000);
  });

  it("caps at Rs.25 Lakh", () => {
    // 0.15% x Rs.200 Cr = Rs.3 Lakh, just past the Rs.25 Lakh cap.
    expect(computeStampDuty(200 * CR)).toBe(25 * L);
    expect(computeStampDuty(1000 * CR)).toBe(25 * L);
  });
});

describe("computeAps — Additional Performance Security", () => {
  it("NIL when not a 'below' bid", () => {
    expect(computeAps(10 * L, 10.5 * L, "above")).toBe(0);
    expect(computeAps(10 * L, 10 * L, "item_rate")).toBe(0);
  });

  it("NIL below the 15% threshold", () => {
    expect(computeAps(10 * L, 8.7 * L, "below")).toBe(0);   // 13.00%
    expect(computeAps(10 * L, 8.6 * L, "below")).toBe(0);   // 14.00%
    expect(computeAps(10 * L, 8.5 * L, "below")).toBe(0);   // 15.00% exact -> excess 0
  });

  it("guards a zero / missing G-schedule", () => {
    expect(computeAps(0, 5 * L, "below")).toBe(0);
    expect(computeAps(NaN, 5 * L, "below")).toBe(0);
  });

  // ── Behaviour as implemented today: APS = 0.5 x excess% x G / 100 ──
  it("halves the shortfall below the 15%-below line", () => {
    expect(computeAps(97_45_416, 74_01_643, "below")).toBe(440_980);
    expect(computeAps(32_92_585, 26_32_421, "below")).toBe(83_138);
    expect(computeAps(50_84_574, 39_40_037, "below")).toBe(190_925);
  });

  it("is monotonic in bid depth", () => {
    const g = 100 * L;
    const shallow = computeAps(g, 80 * L, "below");  // 20% below
    const deep = computeAps(g, 60 * L, "below");     // 40% below
    expect(deep).toBeGreaterThan(shallow);
  });

  // ── Regression: the README table was published 10x too small ───────────────
  it("matches the corrected README worked-examples", () => {
    expect(computeAps(97_45_416, 74_01_643, "below")).toBe(4_40_980);
    expect(computeAps(32_92_585, 26_32_421, "below")).toBe(83_138);
    expect(computeAps(50_84_574, 39_40_037, "below")).toBe(1_90_925);
  });

  it("is NOT the old 10x-smaller reading", () => {
    // If someone 'fixes' computeAps to match the old README numbers, these fail.
    expect(computeAps(97_45_416, 74_01_643, "below")).not.toBe(44_113);
    expect(computeAps(32_92_585, 26_32_421, "below")).not.toBe(8_314);
    expect(computeAps(50_84_574, 39_40_037, "below")).not.toBe(19_092);
  });

  it("satisfies the statutory identity APS = 0.5 x (0.85G - bid)", () => {
    for (let i = 0; i < 1000; i++) {
      const g = 100_000 + Math.floor(Math.random() * 200_000_000);
      const pctBelow = Math.random() * 60;
      const bid = Math.round(g * (1 - pctBelow / 100));
      if (bid <= 0) continue;

      const shortfall = 0.85 * g - bid;
      const expected = shortfall <= 0 ? 0 : Math.round(0.5 * shortfall);
      expect(Math.abs(computeAps(g, bid, "below") - expected)).toBeLessThanOrEqual(1);
    }
  });

  it("agrees with the documented percentage formula (reference oracle)", () => {
    const oracle = (g: number, bid: number) => {
      const percentBelow = ((g - bid) / g) * 100;
      if (percentBelow < 15) return 0;
      return Math.round(0.5 * ((percentBelow - 15) / 100) * g);
    };

    for (let i = 0; i < 1000; i++) {
      const g = 100_000 + Math.floor(Math.random() * 200_000_000);
      const bid = Math.round(g * (1 - (Math.random() * 60) / 100));
      if (bid <= 0) continue;
      // ±1 tolerates float rounding at a .5 boundary in the oracle only.
      expect(Math.abs(computeAps(g, bid, "below") - oracle(g, bid))).toBeLessThanOrEqual(1);
    }
  });
});

describe("numberToIndianWords", () => {
  it("renders zero, lakhs and crores", () => {
    expect(numberToIndianWords(0)).toBe("Zero Only");
    expect(numberToIndianWords(1000)).toBe("One Thousand Only");
    expect(numberToIndianWords(1 * L)).toBe("One Lakh Only");
    expect(numberToIndianWords(1 * CR)).toBe("One Crore Only");
  });

  it("handles negatives", () => {
    expect(numberToIndianWords(-500)).toBe("Minus Five Hundred Only");
  });

  // The 6-digit band is rendered in the conventional Indian reading
  // ("Thirty Two Thousand"), not hundreds-of-thousands.
  it("renders a mixed amount", () => {
    expect(numberToIndianWords(26_32_421)).toBe(
      "Twenty Six Lakh Thirty Two Thousand Four Hundred Twenty One Only",
    );
  });
});

describe("computeWork", () => {
  const base: WorkInput = {
    sno: 1, nameOfWork: "Test work", gScheduleAmount: 97_45_416,
    bidAmount: 74_01_643, bidRatePercent: 24.05, bidRateType: "below",
    period: "6 months", status: "accepted", bidderName: "ACME",
  };

  it("nulls everything for a cancelled work", () => {
    const r = computeWork({ ...base, status: "cancelled" });
    expect(r.stampDuty).toBeNull();
    expect(r.aps).toBeNull();
    expect(r.bidAmountWords).toBeNull();
  });

  it("nulls everything when there is no bid amount", () => {
    expect(computeWork({ ...base, bidAmount: null }).stampDuty).toBeNull();
  });

  it("computes both figures for a live work", () => {
    const r = computeWork(base);
    expect(r.stampDuty).toBe(11_102);
    expect(r.aps).toBe(440_980);
    expect(r.bidAmountWords).toContain("Only");
  });
});
