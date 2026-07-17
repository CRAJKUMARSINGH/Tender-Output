# PATCH.MD

## Status

Implemented the main design correction: the app now follows a 4-document tender intake flow instead of the old individual manual form-filling wizard.

## Product Change

Old path:

- Manual NIT details
- Manual work entry
- Manual bidder entry
- One challan/publication PDF upload
- Select outputs

New path:

- Upload NIT PDF
- Upload Tender Opening PDF
- Upload EMD and other fee details PDF
- Upload Publication details PDF
- Extract tender data
- Review/correct extracted values only if needed
- Generate the required outputs together

## Required Outputs Now Wired

The required output set is now:

1. Scrutiny Sheet
2. Acceptance Letter
3. Work Order
4. Negotiation Letter
5. Letter to Bank for BG/FDR Confirmation
6. Sample Format for Negotiation Reply by Contractor

## Files Changed

### `artifacts/pwd-nit/src/pages/sessions/new.tsx`

- Replaced the old 4-step manual wizard.
- Added four PDF upload cards:
  - NIT PDF
  - Tender Opening PDF
  - EMD and Other Fee Details
  - Publication Details
- Added `Extract Tender Data` button.
- Added review screen for extracted NIT/work data.
- Added one-click generation for the six required outputs.
- Kept manual editing only as a correction/review layer, not as the main workflow.

### `artifacts/pwd-nit/src/pages/sessions/detail.tsx`

- Updated default document generation list to the six required outputs.
- Added `bank_bg_letters` and `negotiation_reply`.
- Removed the old mindset of negotiation as merely optional.

### `artifacts/api-server/src/routes/parse.ts`

- Added `POST /parse/tender-case`.
- Accepts four base64 PDFs:
  - `nitPdfBase64`
  - `openingPdfBase64`
  - `feePdfBase64`
  - `publicationPdfBase64`
- Extracts raw PDF text.
- Builds a draft `NitSessionInput`-shaped response.
- Reuses existing fee/publication parser for challan and DIPR extraction.

### `artifacts/api-server/src/routes/documents.ts`

- Added backend document routes for:
  - `negotiation_letters`
  - `negotiation_reply`
  - `bank_bg_letters`

### `artifacts/api-server/src/lib/doc-generator.ts`

- Added BG/FDR bank confirmation letter generator.
- Added standalone negotiation reply format generator.
- Added bank letter fallback from accepted works when explicit BG/FDR metadata is not available.

### `lib/api-zod/src/generated/api.ts`

- Extended document enum to include:
  - `negotiation_letters`
  - `negotiation_reply`
  - `bank_bg_letters`

### `lib/api-zod/src/generated/types/generateDocumentsInputDocumentsItem.ts`

- Added generated type enum values for:
  - `negotiation_reply`
  - `bank_bg_letters`

### `lib/api-client-react/src/generated/api.schemas.ts`

- Added client enum values for:
  - `negotiation_reply`
  - `bank_bg_letters`

### `lib/api-spec/openapi.yaml`

- Updated generation summary.
- Extended generated document enum to include the new required outputs.

## Verification

Dependency restoration:

- `pnpm.cmd install --ignore-scripts --config.confirmModulesPurge=false` succeeded after network permission was granted.

Attempted full typecheck:

- `pnpm.cmd run typecheck` could not complete because TypeScript hit `EPERM` writing existing generated build artifacts under `lib/*/dist`.

Attempted package typechecks:

- `@workspace/pwd-nit` still reports missing Radix modules and existing UI typing noise after pnpm dependency repair.
- `@workspace/api-server` reports missing dependency type resolution plus many pre-existing Express implicit-type errors.
- One new frontend implicit `checked` type issue in `detail.tsx` was fixed.

## Known Remaining Work

The current parser is a first-pass extraction layer. It establishes the correct app path, but PDF extraction accuracy must still be hardened against the real NIT and tender opening PDF formats.

Next parser work should focus on:

- Reliable work-table extraction from NIT PDF.
- Reliable bidder/rate/status extraction from Tender Opening PDF.
- Contractor DB matching for bidder address autofill.
- BG/FDR detail extraction where bank/FDR values are present.
- Better confidence flags in the review table.

## Bottom Line

The app design path has been corrected from manual labour to:

`4 documents in -> extracted review -> 6 required outputs out`

