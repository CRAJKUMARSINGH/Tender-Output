# TASKS — NIT No. 7 / 2026-27 | PWD District Division-II, Udaipur
> Maintained by: Executive Engineer [ANIL KHINCHI] | Updated: 15 July 2026

---

## ✅ DONE — Completed Tasks

### Phase 1 — Tender Scrutiny Note Sheet
| # | Task | Output File | Status |
|---|------|-------------|--------|
| 1.1 | Fill UBN numbers (06093–06098) in all 6 Note Sheets | `Tender_Scrutiny_Note_Sheet_UBN_Filled.docx` | ✅ Done |
| 1.2 | Merge NAME OF WORK two-paragraph split → single bordered paragraph | `Tender_Scrutiny_Note_Sheet_Formatted.docx` | ✅ Done |
| 1.3 | Reorder rows: EMD→26, Completion→27, NIT Publication→28, Recommendation→29 | `Tender_Scrutiny_Note_Sheet_Formatted.docx` | ✅ Done |
| 1.4 | Right-align signature: [ANIL KHINCHI] / Executive Engineer / PWD DD-II, Udaipur | `Tender_Scrutiny_Note_Sheet_Formatted.docx` | ✅ Done |

### Phase 2 — Acceptance Letters
| # | Task | Output File | Status |
|---|------|-------------|--------|
| 2.1 | Generate acceptance letters for Works 1, 3, 4, 5, 6 (Work 2 = NIL bids, excluded) | `Acceptance_Letters_Final.docx` | ✅ Done |
| 2.2 | Header: bold, underlined, centred | `Acceptance_Letters_Final.docx` | ✅ Done |
| 2.3 | Body paragraphs: fully justified | `Acceptance_Letters_Final.docx` | ✅ Done |
| 2.4 | Signature [ANIL KHINCHI] right-aligned — appears twice per letter | `Acceptance_Letters_Final.docx` | ✅ Done |
| 2.5 | Compute Stamp Duty & APS/APG for each accepted work | Embedded in letters | ✅ Done |
| 2.6 | Copy addresses: ACE Zone / SE City Circle / AEN Sub-Div correct per work | `Acceptance_Letters_Final.docx` | ✅ Done |

### Phase 3 — Master Reference Document
| # | Task | Output File | Status |
|---|------|-------------|--------|
| 3.1 | Compile all data into 8-section master record DOCX | `NIT7_2026-27_Complete_Record.docx` | ✅ Done |
| 3.2 | HTML preview of master record | `artifacts/mockup-sandbox/master_preview.html` | ✅ Done |
| 3.3 | Sample acceptance letter HTML preview | `artifacts/mockup-sandbox/sample_letter.html` | ✅ Done |

---

## 🔲 DUE — Pending Tasks

### Phase 4 — App: Automated Document Generator

**Concept:** A web app that accepts structured inputs and auto-generates all PWD tender documents.

---

#### 4A — Input Module: Data Inputs (3 Sources)

| # | Input | Description | Source |
|---|-------|-------------|--------|
| 4A.1 | **NIT Details** | NIT No., Date, Office, Works list (name, G-schedule, period, UBN) | Manual entry / upload |
| 4A.2 | **Tender Opening Sheet** | Bidder names, bid amounts, bid rates (% above/below BSR), winner selection | Upload / manual entry |
| 4A.3 | **NIT Publication Details + eGross Challan** | DIPR RO No., release date, newspaper-wise amounts; per-work: GRN No., Challan No., Challan Date, Head Codes, amounts paid by each bidder | PDF upload — *sample: `NIT-07-_EMD-FEES-_PUBLICATION_DETAILS_1784092799315.pdf`* |

---

#### 4B — Data Bank: Contractor Address Register

| # | Task | Detail | Status |
|---|------|--------|--------|
| 4B.1 | Import contractor address Excel into app database | File: `CTR_ADDRWSSS_1784092719299.xlsx` — columns to confirm | 🔲 Pending |
| 4B.2 | Build search / auto-complete: bidder name → address + mobile | Used to auto-fill letters & sheets | 🔲 Pending |
| 4B.3 | Allow add / edit / delete contractor records within app | CRUD interface | 🔲 Pending |

---

#### 4C — Output Documents to Generate

| # | Output Document | Inputs Used | Status |
|---|-----------------|-------------|--------|
| 4C.1 | **Tender Scrutiny Note Sheet** (formatted, UBNs filled) | NIT Details + Tender Opening Sheet | 🔲 Pending |
| 4C.2 | **Acceptance Letters** (all accepted works, per format rules) | NIT + Opening Sheet + Contractor Address Bank | 🔲 Pending |
| 4C.3 | **eGross Challan Verification Sheet** | Challan PDF data: per work — GRN, Challan No., Date, Bidder, Head Codes, Amounts | 🔲 Pending |
| 4C.4 | **NIT Publication Cost Statement** | DIPR data: RO No., newspapers, editions, sq.cm., rates, amounts, total | 🔲 Pending |
| 4C.5 | **Master Record / Complete Exercise File** | All of the above consolidated | 🔲 Pending |

---

#### 4D — App Architecture (Proposed)

| # | Component | Detail | Status |
|---|-----------|--------|--------|
| 4D.1 | Frontend — React web app | Step-by-step form wizard: NIT → Opening Sheet → Challan/Publication → Review → Generate | 🔲 Pending |
| 4D.2 | Backend — Express API | Parse inputs, run computations (Stamp Duty, APS), generate DOCX outputs | 🔲 Pending |
| 4D.3 | Contractor DB | PostgreSQL table seeded from Excel; searchable by name | 🔲 Pending |
| 4D.4 | Document Engine | `docx` / `python-docx` template renderer producing formatted DOCX per document type | 🔲 Pending |
| 4D.5 | PDF Parser | Extract challan + publication data from uploaded PDF automatically | 🔲 Pending |

---

## 📂 File Inventory

| File | Description | Phase |
|------|-------------|-------|
| `Tender_Scrutiny_Note_Sheet_UBN_Filled.docx` | UBNs filled only | Phase 1 intermediate |
| `Tender_Scrutiny_Note_Sheet_Formatted.docx` | Full formatting applied | ✅ Phase 1 FINAL |
| `Acceptance_Letters_v2.docx` | Intermediate version | Superseded |
| `Acceptance_Letters_v3.docx` | Intermediate version | Superseded |
| `Acceptance_Letters_NIT7_2026-27.docx` | Intermediate version | Superseded |
| `Acceptance_Letters_Final.docx` | All 5 letters, all formatting | ✅ Phase 2 FINAL |
| `NIT7_2026-27_Complete_Record.docx` | 8-section master reference | ✅ Phase 3 FINAL |
| `artifacts/mockup-sandbox/master_preview.html` | Browser preview of master record | ✅ Done |
| `artifacts/mockup-sandbox/sample_letter.html` | Browser preview of sample letter | ✅ Done |
| `attached_assets/CTR_ADDRWSSS_1784092719299.xlsx` | Contractor address data bank | 🔲 To be imported in Phase 4 |
| `attached_assets/NIT-07-_EMD-FEES-_PUBLICATION_DETAILS_1784092799315.pdf` | eGross Challan + DIPR publication data | 🔲 To be parsed in Phase 4 |

---

## 📋 Open Questions — Awaiting User Input

| # | Question | Required For |
|---|----------|-------------|
| Q1 | What columns does the contractor address Excel contain? (Share column headers) | 4B.1 |
| Q2 | Should the app run offline (desktop) or as a web app accessible from browser? | 4D.1 |
| Q3 | Should the Challan PDF be parsed automatically (OCR/text extract) or entered manually? | 4D.5 |
| Q4 | What is the new document to be generated from the Publication Details PDF? (mentioned in latest message) | 4C.3 / 4C.4 |
| Q5 | Are the intermediate DOCX files (v2, v3, NIT7 early) to be deleted to clean up workspace? | Housekeeping |

---

*This file is the single source of truth for task tracking on NIT No. 7/2026-27.*
