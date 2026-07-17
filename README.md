# PWD NIT Document Generator
### Office of the Executive Engineer, P.W.D. District Division-II, Udaipur

Automated generation of all tender documents for NIT exercise — Scrutiny Note Sheet, Acceptance Letters, Work Orders, Negotiation Letters, Bank BG/FDR Letters, Challan Verification, Publication Cost Statement, and Master Record.

---

## 1. Stamp Duty Computation

**Governing Rule:** Rajasthan PWD Rules (Stamp Act provisions for works contracts)

| Bid Amount | Stamp Duty |
|---|---|
| ≤ Rs. 50 Lakh | Rs. 1,000/- (flat) |
| > Rs. 50 Lakh | 0.15% of bid amount, capped at Rs. 25 Lakh |

**Formula:**
```
If  bidAmount ≤ 50,00,000  →  Stamp Duty = Rs. 1,000/-
If  bidAmount > 50,00,000  →  Stamp Duty = round(bidAmount × 0.0015)
                                           subject to maximum Rs. 25,00,000/-
```

**Reference:** `artifacts/api-server/src/lib/compute.ts` → `computeStampDuty()`

**Examples:**

| Bid Amount | Stamp Duty |
|---|---|
| Rs. 26,32,421 | Rs. 1,000/- (flat — below 50L) |
| Rs. 74,01,643 | Rs. 11,102/- (74,01,643 × 0.15%) |
| Rs. 5,00,00,000 | Rs. 75,000/- (5 Cr × 0.15%) |
| Rs. 20,00,00,000 | Rs. 25,00,000/- (capped at max) |

---

## 2. Additional Performance Security (APS) Computation

**Governing Rule:** Rajasthan PWD Rules — Protection against unbalanced/predatory bids

APS is levied only when a contractor bids **below** the G-Schedule amount by **15% or more**.

**Formula:**
```
If  bidRateType ≠ "below"         →  APS = NIL
If  percentBelow < 15%            →  APS = NIL
If  percentBelow ≥ 15%            →  APS = round(0.5 × excess% / 100 × G-Schedule)

where:
  percentBelow = (G-Schedule − Bid Amount) / G-Schedule × 100
  excess%      = percentBelow − 15
```

**Reference:** `artifacts/api-server/src/lib/compute.ts` → `computeAps()`

**Examples:**

| G-Schedule | Bid Amount | % Below | APS |
|---|---|---|---|
| Rs. 97,45,416 | Rs. 74,01,643 | 24.05% | 0.5 × (24.05−15)% × 97,45,416 = **Rs. 44,113/-** |
| Rs. 32,92,585 | Rs. 26,32,421 | 20.05% | 0.5 × (20.05−15)% × 32,92,585 = **Rs. 8,314/-** |
| Rs. 50,84,574 | Rs. 39,40,037 | 22.51% | 0.5 × (22.51−15)% × 50,84,574 = **Rs. 19,092/-** |
| Rs. 10,00,000 | Rs. 8,70,000  | 13.00% | Below 15% threshold → **NIL** |
| Rs. 10,00,000 | Rs. 10,50,000 | Above  | Not a below bid → **NIL** |
| Item Rate bid | —             | —      | Not applicable → **NIL** |

---

## 3. Sanctioning / Accepting Authority

**Governing Rule:** R.T.P.P. Act & Rules — Section II, Item 16
*"To accept Bids for all Original & Repair and Maintenance Works"*

Authority is **auto-derived** in the Scrutiny Note Sheet based on the **lowest bid amount** (tendered amount to be sanctioned):

| Bid Amount (Lowest) | Sanctioning Authority |
|---|---|
| Up to Rs. 75 Lacs | **Executive Engineer**, PWD District Division-II, Udaipur |
| Up to Rs. 300 Lacs | **Superintending Engineer**, PWD City Circle, Udaipur |
| Up to Rs. 750 Lacs | **Additional Chief Engineer**, PWD Zone Udaipur |
| Up to Rs. 1,500 Lacs | **Chief Engineer**, PWD Rajasthan |
| Above Rs. 1,500 Lacs | **EB/TAC** — Full Powers |

**Reference:** `artifacts/api-server/src/lib/doc-generator.ts` → `buildScrutinyPage()` → `defaultAuthority`

> **Note:** The authority shown is the *minimum competent level*. If the work has
> special sanction conditions (deposit work, externally aided, etc.) a higher
> authority may be required. The field `work.authorityToAccept` can be set
> explicitly to override the auto-derived value.

---

## 4. Scrutiny Note Sheet — Row Reference

The 33-row per-work scrutiny table includes (in order):

| Row | Description | Value Source |
|---|---|---|
| 1 | Administration & Financial Sanction | Manual entry |
| 2 | Technical Sanction | Manual entry |
| 3 | Deposit Work Ref. | `depositWorkRef` / Not Applicable |
| 4 | NIT Issued (No. & Date) | `nit.nitNo`, `nit.nitDate` |
| 5 | DIPR Ref. for Publication | `diprRef` |
| 6 | UBN No. | `ubn` |
| 7 | Short-Term NIT | Fixed: No |
| 8 | Short NIT Permission | Fixed: Not Applicable |
| 9 | NIT Amount | G-Schedule in Lacs |
| 10 | Last Date of Submission & Time | `lastSubmissionDate` / `lastSubmissionTime` |
| 11 | Date of Online Opening | `openingDate` |
| 12 | Corrigendum Ref. | Fixed: Not Applicable |
| 13 | Revised Submission Date | Fixed: Not Applicable |
| 14 | Revised Opening Date | Fixed: Not Applicable |
| 15 | No. of Tenders Sold | `tendersSold` |
| 16 | No. of Tenders Received | `tendersReceived` |
| 17 | Technical Bid Opening | Fixed: Not Applicable |
| 18 | No. of Responsive Bidders | `responsiveBidders` |
| 19 | Financial Bid Opening Date | `financialBidOpeningDate` |
| 20 | BSR | `bsr` |
| 21 | G Schedule Amount | `gScheduleAmount` |
| 22 | Name of Lowest Bidder | `bidderName` |
| 23 | Class of Contractor | `contractorClass` |
| 24 | Tender Premium (full) | e.g. `24.05% Below PWD Roads BSR 2022` |
| 25 | Bid Amount of Lowest Bidder | `bidAmount` (computed) |
| **26** | **Lowest Rate with Condition** | **`xx% Above/Below, No Condition`** (fixed) |
| **27** | **Financial Implication of Condition** | **Not Applicable** (fixed — no conditional tenders) |
| 28 | EMD & Other Deposit Details | Fixed: Enclosed |
| **29** | **Validity of Tender** | **`tenderValidity`** / default: 90 Days |
| **30** | **Authority Competent to Accept** | **Auto-derived from bid amount (SOP)** |
| 31 | Time of Completion | `period` |
| 32 | NIT Publication Details | Fixed: Enclosed |
| 33 | Recommendation | `recommendation` / Enclosed / CANCELLED |

---

## 5. Key Files

| File | Purpose |
|---|---|
| `artifacts/api-server/src/lib/doc-generator.ts` | All 9 document generators, scrutiny table, formatting constants |
| `artifacts/api-server/src/lib/compute.ts` | **Stamp Duty + APS formulas — do not modify** |
| `artifacts/api-server/src/lib/pdf-parser.ts` | eGross Challan + DIPR PDF text extractor |
| `artifacts/api-server/src/lib/doc-store.ts` | In-memory download token store (30 min TTL) |
| `lib/api-spec/openapi.yaml` | API contract — source of truth |
| `lib/db/src/schema/` | Drizzle ORM schema (contractors + nit_sessions) |
| `artifacts/pwd-nit/src/` | React frontend |

---

## 6. Formula Protection Notice

> The formulas in `compute.ts` implement Rajasthan PWD statutory rules.
> **Do not modify** `computeStampDuty()` or `computeAps()` without
> an explicit rule change reference. All formula changes must be documented
> in `CREAT.MD` with the rule citation.
