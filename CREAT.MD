# CREAT.MD — PWD NIT Document Generator
> Chat-log & Research Record | NIT No. 7/2026-27 | PWD District Division-II, Udaipur
> Maintained by: Executive Engineer [ANIL KHINCHI] | Started: 15 July 2026

---

## PURPOSE OF THIS FILE
This file is the permanent research log, chat-history digest, and decision record for the automated PWD NIT Document Generator app. It captures every key decision, data structure, formula, and instruction from the original conversation so future sessions never have to rediscover context.

---

## 1. ORIGINAL REQUIREMENT (verbatim from user)

> "I NEED TO FORMULAT AN APP >>> HOW TO DEAL WITH 3 INPUTS >>> nit, tender opening sheets >> nit publication details >>> egross challan details >>> THESE SHALL BE INPUTS >>>> WE HAVE TO PRODUCE DESIRED SHEETS FROM THESE INPUTS PLUS A DATA BANK OF >>>>> contractor address record."

**App type:** Web app in browser (works on any device)
**PDF parsing:** Auto-extract from uploaded PDF (OCR / text parse)
**File cleanup:** Keep only FINAL files — delete intermediate v2/v3 versions

---

## 2. THREE INPUTS THE APP ACCEPTS

| # | Input | Description | Entry Method |
|---|-------|-------------|--------------|
| 4A.1 | **NIT Details** | NIT No., Date, Office, 6 Works (name, G-schedule amount, bid period, UBN) | Manual form entry |
| 4A.2 | **Tender Opening Sheet** | Per work: bidder names, bid amounts, rates (% above/below G-schedule), winner | Manual form entry |
| 4A.3 | **eGross Challan + DIPR Publication PDF** | Per work: GRN No, Challan No, Date, Vendor, Head Codes, Amounts + DIPR RO No., newspaper-wise rates | PDF upload → auto-parse |

---

## 3. DATA BANK — CONTRACTOR ADDRESS REGISTER

**Source file:** `CTR_ADDRWSSS_1784092719299.xlsx`
**Rows:** 291 contractors
**Columns:** Sno | Name | Address | Contact No

**Usage in app:**
- Bidder name typed in Tender Opening Sheet → auto-complete from this DB
- Address + mobile auto-filled into Acceptance Letters
- Full CRUD interface (add / edit / delete) inside the app

---

## 4. FIVE OUTPUT DOCUMENTS

| # | Document | Inputs Used |
|---|----------|-------------|
| 4C.1 | **Tender Scrutiny Note Sheet** | NIT Details + Tender Opening Sheet |
| 4C.2 | **Acceptance Letters** (all accepted works) | NIT + Opening Sheet + Contractor DB |
| 4C.3 | **eGross Challan Verification Sheet** | Challan PDF data |
| 4C.4 | **NIT Publication Cost Statement** | DIPR publication data from PDF |
| 4C.5 | **Master Complete Record** | All of the above consolidated |

---

## 5. DOCUMENT FORMATS & RULES

### 5.1 Acceptance Letter Format
- **Header:** Bold, Underlined, Centred — "OFFICE OF THE EXECUTIVE ENGINEER, P.W.D. DISTRICT DIVISION-II, UDAIPUR"
- **No./Date:** Blank underlines (manual fill after print)
- **Title:** "(Letter of Acceptance of Tender)" — centred
- **Addressee:** Contractor name + full address from DB + mobile
- **Sub/Ref:** Work name + NIT No.
- **Body Para 1:** Acceptance text with % rate, bid amount in figures + words, approving authority, NIT date — JUSTIFIED
- **Body Para 2:** Security deposit, stamp duty, APS — JUSTIFIED
- **Body Para 3:** "The receipt of the may please be acknowledged." — JUSTIFIED
- **Stamp Duty / APS line:** Bold, left-aligned
- **Signature 1:** [ANIL KHINCHI] / Executive Engineer / PWD District Division-II, Udaipur — RIGHT-ALIGNED
- **Copy section:** No./Date blanks + 3 copy addresses
- **Signature 2:** Same as Signature 1

### 5.2 Copy Addresses (per work)
| Work | Copy 3 (AEN Sub-Division) |
|------|--------------------------|
| 1 | Badgaon |
| 3 | Gogunda |
| 4 | Gogunda |
| 5 | Sayra |
| 6 | Sayra |
- Copy 1: Additional Chief Engineer PWD Zone Udaipur (all works)
- Copy 2: Superintending Engineer PWD City Circle Udaipur (all works)

### 5.3 Scrutiny Note Sheet Rules
- UBN range: PWD2627WSOB06093 → PWD2627WSOB06098
- Row order: EMD→26, Completion→27, NIT Publication→28, Recommendation→29
- NAME OF WORK: merged single bordered paragraph
- Signature: [ANIL KHINCHI] right-aligned

---

## 6. COMPUTATION FORMULAS

### 6.1 Stamp Duty
```
If bid_amount <= 5,000,000 (50 Lakhs):
    stamp_duty = 1,000
Else:
    stamp_duty = round(bid_amount * 0.0015)   # 0.15%, cap Rs. 25L
```

### 6.2 Additional Performance Security (APS)
```
percent_below = ((g_schedule - bid_amount) / g_schedule) * 100

If percent_below < 15:
    aps = 0   # NIL
Else:
    excess_percent = percent_below - 15
    aps = round(0.5 * (excess_percent / 100) * g_schedule)
```

### 6.3 Reference Values (NIT No. 7/2026-27)
| Work | G-Schedule (Rs.) | Bid (Rs.) | Rate | Stamp Duty | APS |
|------|-----------------|-----------|------|-----------|-----|
| 1 | 32,92,585 | 26,32,421 | 20.05% Below | 1,000 | 83,138 |
| 2 | — | — | CANCELLED | — | — |
| 3 | 97,45,416 | 74,01,643 | 24.05% Below | 11,102 | 4,40,980 |
| 4 | 50,84,574 | 39,40,037 | 22.51% Below | 1,000 | 1,90,926 |
| 5 | 9,91,500 | 9,91,500 | Item Rate | 1,000 | NIL |
| 6 | 12,89,843 | 13,29,184 | 3.05% Above | 1,000 | NIL |

---

## 7. EGROSS CHALLAN DATA STRUCTURE (from PDF)

**Document:** NIT NO-7/26-27 STATEMENT OF EARNEST MONEY AND OTHER FEES DEPOSIT

Per bidder per work:
- GRN No.
- Challan No.
- Challan Date
- Vendor Name
- RISL Commission (not to be included)
- Head Code 0075-00-800-52-01 → Amount
- Head Code 8443-00-108-00-00 → Amount (main EMD)

**Participants per work:**
| Work | Participants |
|------|-------------|
| 1 | 1 (MAESTRO CONSTRUCTIONS) |
| 2 | 1 (SKT INFRA PROJECTS) |
| 3 | 3 (RUDRAM, MAESTRO, MADHAV ENGINEERING) |
| 4 | 5 (RUDRAM, MATESHWARI, ROYAL INFRA, RL CHOUBISA, PALIWAL) |
| 5 | 2 (SOMESHWAR INFRA, VIKRAM RANAWAT) |
| 6 | 1 (MAESTRO CONSTRUCTIONS) |

---

## 8. DIPR PUBLICATION DATA STRUCTURE (from same PDF)

**RO No.:** 11632
**Release Date:** 4 July 2026
**NIT No.:** D-463
**Form Issuing Date:** 3 July 2026
**Tender Opening Date:** 3 July 2026

| Sr. | Newspaper | Edition | Size | Sq.cm | Rate | Amount (Rs.) |
|-----|-----------|---------|------|-------|------|-------------|
| 1 | KHABAR SAMRAT | UDAIPUR | 4×2 | 32 | 23.08 | 738.56 |
| 2 | RAJASTHAN PATRIKA | SIKAR | 4×2 | 32 | 32.46 | 1,038.72 |
| 3 | RAJASTHAN PATRIKA | BHILWARA | 4×2 | 32 | 44.49 | 1,423.68 |
| 4 | RAJASTHAN PATRIKA | BIKANER | 4×2 | 32 | 32.46 | 1,038.72 |
| 5 | RAJASTHAN PATRIKA | JODHPUR | 4×2 | 32 | 70.22 | 2,247.04 |
| 6 | RAJASTHAN PATRIKA | KOTA | 4×2 | 32 | 78.78 | 2,520.96 |
| 7 | RAJASTHAN PATRIKA | SRIGANGANAGAR | 4×2 | 32 | 44.49 | 1,423.68 |
| 8 | RAJASTHAN PATRIKA | UDAIPUR | 4×2 | 32 | 59.68 | 1,909.76 |
| 9 | RAJASTHAN PATRIKA | JAIPUR | 4×2 | 32 | 257.96 | 8,254.72 |
| 10 | RAJASTHAN PATRIKA | ALWAR | 4×2 | 32 | 32.46 | 1,038.72 |
| 11 | RAJASTHAN PATRIKA | AJMER | 4×2 | 32 | 44.49 | 1,423.68 |
| 12 | RAJASTHAN PATRIKA | BANSWARA | 4×2 | 32 | 32.46 | 1,038.72 |
| 13 | RAJASTHAN PATRIKA | PALI | 4×2 | 32 | 32.46 | 1,038.72 |
| 14 | RAJASTHAN PATRIKA | BARMER | 4×2 | 32 | 23.08 | 738.56 |
| **Total** | | | | | | **25,874.24** |

---

## 9. APP ARCHITECTURE DECISIONS

| Decision | Choice | Reason |
|----------|--------|--------|
| Frontend | React + Vite | Standard monorepo artifact |
| Backend | Express 5 (existing api-server) | Already configured |
| Database | PostgreSQL + Drizzle ORM | Contractor address bank (291 rows) |
| Document generation | docx (npm) library | Pure JS, no binary dependencies |
| PDF parsing | pdf-parse (npm) | Text extraction from eGross/DIPR PDF |
| Number-to-words | in-words / custom | Indian number system (Lakh, Crore) |
| Validation | Zod | Already in stack |
| API contract | OpenAPI → codegen | Standard monorepo pattern |

---

## 10. WORK REGISTER (NIT No. 7/2026-27)

| S.No | UBN | Name of Work | G-Sched (Rs.) | Period | Status |
|------|-----|-------------|--------------|--------|--------|
| 1 | PWD2627WSOB06093 | Construction of C.D. Work and Road from Main Road to Meghwal Basti upto Bharodi Road (Under Budget Announcement Point No. 253 NP/ML 2022-23) | 32,92,585 | 4 Mo. | ACCEPTED |
| 2 | PWD2627WSOB06094 | Rehabilitation of Madrada–Mangpura Road | — | — | CANCELLED (NIL bids) |
| 3 | PWD2627WSOB06095 | RCC Bridge, Rawaliya Kalan–Barwada | 97,45,416 | 8 Mo. | ACCEPTED |
| 4 | PWD2627WSOB06096 | C.D. Work, Gogunda Jhadol Road | 50,84,574 | 8 Mo. | ACCEPTED |
| 5 | PWD2627WSOB06097 | Computer Typing & Printing Works | 9,91,500 | 10 Mo. | ACCEPTED |
| 6 | PWD2627WSOB06098 | Restoration of Road Cutting Works | 12,89,843 | 3 Mo. | ACCEPTED |

---

## 11. OFFICE DETAILS

- **Office:** Office of the Executive Engineer, P.W.D. District Division-II, Udaipur
- **Signing Authority:** [ANIL KHINCHI] — Executive Engineer, PWD District Division-II, Udaipur
- **Approving Authority for Letters:** Superintending Engineer PWD City Circle Udaipur
- **NIT No.:** 7/2026-27
- **NIT Date:** 03/07/2026

---

## 12. BUILD LOG

| Date | Action | Status |
|------|--------|--------|
| 15 Jul 2026 | All 3 zips studied, CREAT.MD written | ✅ Done |
| 15 Jul 2026 | App artifact created (react-vite, slug: pwd-nit, previewPath: /) | ✅ Done |
| 15 Jul 2026 | OpenAPI spec written (lib/api-spec/openapi.yaml) — 17 endpoints | ✅ Done |
| 15 Jul 2026 | Codegen run — React Query hooks + Zod schemas generated | ✅ Done |
| 15 Jul 2026 | Frontend design subagent launched (Rajasthan saffron/navy theme) | ✅ Done |
| 15 Jul 2026 | DB schema pushed — contractors + nit_sessions tables | ✅ Done |
| 15 Jul 2026 | Backend routes built — contractors, nit-sessions, parse, documents | ✅ Done |
| 15 Jul 2026 | Contractor DB seeded — 290 rows from CTR_ADDRWSSS Excel | ✅ Done |
| 15 Jul 2026 | Document generation (DOCX) implemented via docx npm package | ✅ Done |
| 15 Jul 2026 | PDF parser implemented — text extraction via pdf-parse | ✅ Done |
| 15 Jul 2026 | App live and verified — dashboard, contractor register, session wizard | ✅ Done |

---

## 13. APP FILE MAP

| File/Directory | Purpose |
|----------------|---------|
| `artifacts/pwd-nit/` | React + Vite frontend |
| `artifacts/pwd-nit/src/` | All pages, components, hooks |
| `artifacts/api-server/src/routes/contractors.ts` | Contractor CRUD API |
| `artifacts/api-server/src/routes/nit-sessions.ts` | NIT session CRUD + summary |
| `artifacts/api-server/src/routes/parse.ts` | PDF upload + text parse |
| `artifacts/api-server/src/routes/documents.ts` | DOCX generation + download |
| `artifacts/api-server/src/lib/compute.ts` | Stamp Duty & APS formulas |
| `artifacts/api-server/src/lib/doc-generator.ts` | 5 DOCX document builders |
| `artifacts/api-server/src/lib/pdf-parser.ts` | eGross Challan + DIPR text extractor |
| `artifacts/api-server/src/lib/doc-store.ts` | In-memory token store (30 min TTL) |
| `lib/db/src/schema/contractors.ts` | Drizzle contractors table |
| `lib/db/src/schema/nit-sessions.ts` | Drizzle nit_sessions table (jsonb) |
| `lib/api-spec/openapi.yaml` | Single source of truth for all API contracts |

---

## 14. HOW TO USE THE APP

1. **Dashboard** → click "New NIT Session"
2. **Step 1** — Enter NIT No., Date, Office, Signing Authority
3. **Step 2** — Add works: UBN, Name of Work, G-Schedule amount, bid amount, rate %, period, bidder name (auto-completes from contractor DB), status
4. **Step 3** — Upload the eGross Challan + DIPR Publication PDF → auto-parsed; review and edit challan entries and DIPR newspaper table
5. **Step 4** — Review computed Stamp Duty & APS; select documents to generate; click "Generate"
6. **Download** each of the 5 generated Word documents

---

*This file is the single source of truth for the PWD NIT Document Generator app build and research record.*
