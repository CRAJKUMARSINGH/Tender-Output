import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { BgVerification, WorkDetails } from "@workspace/api-client-react";

interface Props {
  works: WorkDetails[];
  value: BgVerification[];
  onChange: (next: BgVerification[]) => void;
  readOnly?: boolean;
}

/**
 * Controlled editor for the Bank BG / FDR confirmation rows that feed
 * `bank_bg_letters`. Field names mirror `BgVerificationData` in the doc
 * generator so nothing silently renders blank.
 */
export function BgVerificationsEditor({ works, value, onChange, readOnly }: Props) {
  const acceptedWorks = useMemo(() => works.filter((w) => w.status === "accepted"), [works]);

  const duplicateWorkSno = useMemo(() => {
    const seen = new Set<number>();
    const dupes = new Set<number>();
    for (const r of value) {
      if (seen.has(r.workSno)) dupes.add(r.workSno);
      seen.add(r.workSno);
    }
    return dupes;
  }, [value]);

  const update = (i: number, patch: Partial<BgVerification>) =>
    onChange(value.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const add = () =>
    onChange([
      ...value,
      {
        workSno: acceptedWorks[0]?.sno ?? 1,
        contractorName: acceptedWorks[0]?.bidderName ?? "",
        contractorAddress: null,
        bankName: "",
        bankBranch: null,
        bgFdrNo: "",
        amount: 0,
        amountDate: null,
        purpose: null,
        letterNo: null,
        letterDate: null,
      },
    ]);

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  /** Fill blank amounts from the work's APS (fallback: stamp duty). */
  const prefillFromAps = () =>
    onChange(
      value.map((row) => {
        if (row.amount) return row;
        const w = acceptedWorks.find((x) => x.sno === row.workSno);
        return { ...row, amount: w?.aps ?? w?.stampDuty ?? 0 };
      }),
    );

  const incomplete = value.some(
    (r) => !r.bankName.trim() || !r.bgFdrNo.trim() || !r.amount || !r.amountDate,
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-secondary">
            Bank BG / FDR Confirmations
            <span className="ml-2 font-normal text-muted-foreground">one row per work requiring an instrument</span>
          </h3>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={prefillFromAps}>
              Prefill amounts from APS
            </Button>
            <Button type="button" size="sm" onClick={add}>
              + Add row
            </Button>
          </div>
        )}
      </div>

      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No instruments recorded. The Bank BG/FDR letter will render empty.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[92px]">Work S.No</TableHead>
                <TableHead>Contractor</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>BG/FDR No.</TableHead>
                <TableHead>Amount (Rs.)</TableHead>
                <TableHead>Dated</TableHead>
                <TableHead>Letter No.</TableHead>
                {!readOnly && <TableHead className="w-[48px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {value.map((row, i) => (
                <TableRow key={i} className={duplicateWorkSno.has(row.workSno) ? "bg-amber-50" : ""}>
                  <TableCell>
                    {readOnly ? (
                      <span className="font-medium text-muted-foreground">{row.workSno}</span>
                    ) : (
                      <select
                        className="w-full rounded border border-input bg-background px-2 py-1 text-sm"
                        value={row.workSno}
                        onChange={(e) => update(i, { workSno: Number(e.target.value) })}
                      >
                        {acceptedWorks.map((w) => (
                          <option key={w.sno} value={w.sno}>
                            {w.sno} — {w.nameOfWork.slice(0, 40)}
                          </option>
                        ))}
                      </select>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.contractorName ?? ""}
                      readOnly={readOnly}
                      onChange={(e) => update(i, { contractorName: e.target.value || null })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.bankName}
                      readOnly={readOnly}
                      onChange={(e) => update(i, { bankName: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.bankBranch ?? ""}
                      readOnly={readOnly}
                      onChange={(e) => update(i, { bankBranch: e.target.value || null })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.bgFdrNo}
                      readOnly={readOnly}
                      onChange={(e) => update(i, { bgFdrNo: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={row.amount || ""}
                      readOnly={readOnly}
                      onChange={(e) => update(i, { amount: Number(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={row.amountDate ?? ""}
                      readOnly={readOnly}
                      onChange={(e) => update(i, { amountDate: e.target.value || null })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.letterNo ?? ""}
                      readOnly={readOnly}
                      onChange={(e) => update(i, { letterNo: e.target.value || null })}
                    />
                  </TableCell>
                  {!readOnly && (
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(i)}
                        className="text-destructive hover:text-destructive"
                        aria-label={`Remove row ${i + 1}`}
                      >
                        ✕
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {duplicateWorkSno.size > 0 && (
        <p className="text-xs text-amber-700">
          Duplicate Work S.No: {[...duplicateWorkSno].join(", ")} — two instruments on one work is
          legal but confirm it is intended.
        </p>
      )}
      {incomplete && (
        <p className="text-xs text-amber-700">
          Some rows are incomplete (bank, BG/FDR no., amount and dated are required).
        </p>
      )}
    </div>
  );
}

/** Shared pre-submit validation. Returns an error string or null. */
export function validateBgVerifications(rows: BgVerification[]): string | null {
  for (const [i, r] of rows.entries()) {
    if (!r.bankName.trim()) return `BG row ${i + 1}: bank name is required`;
    if (!r.bgFdrNo.trim()) return `BG row ${i + 1}: BG/FDR number is required`;
    if (!r.amount || r.amount <= 0) return `BG row ${i + 1}: amount must be positive`;
    if (!r.amountDate) return `BG row ${i + 1}: instrument date is required`;
  }
  return null;
}
