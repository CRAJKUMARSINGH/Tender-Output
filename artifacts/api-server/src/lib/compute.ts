/**
 * PWD Tender computation helpers
 * Stamp Duty and APS formulas as per Rajasthan PWD rules
 */

/**
 * Convert number to Indian number words (Lakh/Crore system)
 */
export function numberToIndianWords(amount: number): string {
  if (amount === 0) return "Zero Only";

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  function convertHundreds(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n]!;
    if (n < 100) {
      return tens[Math.floor(n / 10)]! + (n % 10 !== 0 ? " " + ones[n % 10]! : "");
    }
    return (
      ones[Math.floor(n / 100)]! +
      " Hundred" +
      (n % 100 !== 0 ? " " + convertHundreds(n % 100) : "")
    );
  }

  const intAmount = Math.round(amount);
  if (intAmount < 0) return "Minus " + numberToIndianWords(-intAmount);

  const crore = Math.floor(intAmount / 10000000);
  const lakh = Math.floor((intAmount % 10000000) / 100000);
  const thousand = Math.floor((intAmount % 100000) / 1000);
  const rest = intAmount % 1000;

  let words = "";
  if (crore > 0) words += convertHundreds(crore) + " Crore ";
  if (lakh > 0) words += convertHundreds(lakh) + " Lakh ";
  if (thousand > 0) words += convertHundreds(thousand) + " Thousand ";
  if (rest > 0) words += convertHundreds(rest);

  return words.trim() + " Only";
}

/**
 * Compute Stamp Duty per Rajasthan rules:
 * - bid ≤ Rs.50 Lakh → Rs.1,000 flat
 * - bid > Rs.50 Lakh → round(bid × 0.15%), capped at Rs.25 Lakh
 */
export function computeStampDuty(bidAmount: number): number {
  if (bidAmount <= 5000000) return 1000;
  const duty = Math.round(bidAmount * 0.0015);
  return Math.min(duty, 2500000);
}

/**
 * Compute Additional Performance Security (APS):
 * - If percent below G-schedule < 15% → 0 (NIL)
 * - Else: APS = round(0.5 × (excess% / 100) × G-schedule)
 *
 * For bids ABOVE G-schedule → APS is 0
 */
export function computeAps(gScheduleAmount: number, bidAmount: number, bidRateType: string): number {
  if (bidRateType !== "below") return 0;

  const percentBelow = ((gScheduleAmount - bidAmount) / gScheduleAmount) * 100;
  if (percentBelow < 15) return 0;

  const excessPercent = percentBelow - 15;
  return Math.round(0.5 * (excessPercent / 100) * gScheduleAmount);
}

export interface WorkInput {
  sno: number;
  nameOfWork: string;
  gScheduleAmount: number;
  bidAmount?: number | null;
  bidRatePercent?: number | null;
  bidRateType: string;
  period: string;
  status: string;
  bidderName?: string | null;
  ubn?: string;
}

export interface WorkComputed {
  sno: number;
  nameOfWork: string;
  bidAmount: number | null;
  bidAmountWords: string | null;
  stampDuty: number | null;
  aps: number | null;
  status: string;
}

export function computeWork(work: WorkInput): WorkComputed {
  if (work.status === "cancelled" || !work.bidAmount) {
    return {
      sno: work.sno,
      nameOfWork: work.nameOfWork,
      bidAmount: null,
      bidAmountWords: null,
      stampDuty: null,
      aps: null,
      status: work.status,
    };
  }

  const stampDuty = computeStampDuty(work.bidAmount);
  const aps = computeAps(work.gScheduleAmount, work.bidAmount, work.bidRateType);

  return {
    sno: work.sno,
    nameOfWork: work.nameOfWork,
    bidAmount: work.bidAmount,
    bidAmountWords: numberToIndianWords(work.bidAmount),
    stampDuty,
    aps,
    status: work.status,
  };
}
