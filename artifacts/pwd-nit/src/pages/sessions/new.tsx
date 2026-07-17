import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, FileText, Loader2, UploadCloud } from "lucide-react";
import { formatINR } from "@/lib/format";
import {
  useComputeValues,
  useCreateNitSession,
  useGenerateDocuments,
  type GenerateDocumentsInputDocumentsItem,
  type NitSessionInput,
  type WorkDetails,
  type WorkComputation,
} from "@workspace/api-client-react";

const REQUIRED_DOCS = [
  { id: "scrutiny_note", label: "Scrutiny Sheet" },
  { id: "acceptance_letters", label: "Acceptance Letter" },
  { id: "work_order", label: "Work Order" },
  { id: "negotiation_letters", label: "Negotiation Letter" },
  { id: "bank_bg_letters", label: "Letter to Bank for BG/FDR Confirmation" },
  { id: "negotiation_reply", label: "Sample Format for Negotiation Reply by Contractor" },
] as const;

const DEFAULT_SESSION: NitSessionInput = {
  title: "",
  nitDetails: {
    nitNo: "",
    nitDate: "",
    office: "Executive Engineer, P.W.D. District Division-II, Udaipur",
    signingAuthority: "Executive Engineer",
  },
  works: [],
  challanEntries: [],
  diprPublication: null,
};

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

export default function NewSession() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  // Flexible fee file (PDF, Excel, image, text) and other required docs
  const [files, setFiles] = useState<{
    nit?: File;
    opening?: File;
    fee?: File;
    publication?: File;
  }>({});
  const [sessionData, setSessionData] = useState<NitSessionInput>(DEFAULT_SESSION);
  const [computedWorks, setComputedWorks] = useState<WorkComputation[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const computeMutation = useComputeValues();
  const createSessionMutation = useCreateNitSession();
  const generateMutation = useGenerateDocuments();

  // Check all required files are present
  const allFilesReady =
    files.nit && files.opening && files.fee && files.publication;
  const selectedDocs = useMemo(
    () => REQUIRED_DOCS.map((doc) => doc.id as GenerateDocumentsInputDocumentsItem),
    []
  );

  const updateWork = (index: number, patch: Partial<WorkDetails>) => {
    const next = [...sessionData.works];
    next[index] = { ...next[index]!, ...patch };
    setSessionData({ ...sessionData, works: next });
    setComputedWorks([]);
  };

  const extractTenderData = async () => {
    if (!allFilesReady) {
      toast({ title: "Upload all required files (NIT PDF, Tender Opening PDF, EMD & Fees file, Publication PDF)", variant: "destructive" });
      return;
    }

    setIsExtracting(true);
    try {
      const payload = {
        nitPdfBase64: await fileToBase64(files.nit!),
        nitFileName: files.nit!.name,
        openingPdfBase64: await fileToBase64(files.opening!),
        openingFileName: files.opening!.name,
        feeFileBase64: await fileToBase64(files.fee!),
        feeFileName: files.fee!.name,
        publicationPdfBase64: await fileToBase64(files.publication!),
        publicationFileName: files.publication!.name,
      };

      const response = await fetch("/api/parse/tender-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(await response.text());

      const parsed = await response.json();
      const nextSession: NitSessionInput = {
        ...DEFAULT_SESSION,
        title: parsed.title || DEFAULT_SESSION.title,
        nitDetails: {
          ...DEFAULT_SESSION.nitDetails,
          ...(parsed.nitDetails ?? {}),
        },
        works: parsed.works ?? [],
        challanEntries: parsed.challanEntries ?? [],
        diprPublication: parsed.diprPublication ?? null,
      };

      setSessionData(nextSession);
      if (nextSession.works.length > 0) {
        computeMutation.mutate(
          { data: { works: nextSession.works } },
          { onSuccess: (res) => setComputedWorks(res.works) }
        );
      }
      toast({ title: "Tender data extracted. Review once, then generate." });
    } catch (error) {
      toast({ title: "Could not extract tender data", description: String(error), variant: "destructive" });
    } finally {
      setIsExtracting(false);
    }
  };

  const generateRequiredDocuments = () => {
    if (!sessionData.title || !sessionData.nitDetails.nitNo) {
      toast({ title: "Review NIT title and number before generating", variant: "destructive" });
      return;
    }
    if (sessionData.works.length === 0) {
      toast({ title: "No works extracted. Add/correct parser output first.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    createSessionMutation.mutate(
      { data: sessionData },
      {
        onSuccess: (session) => {
          generateMutation.mutate(
            { data: { sessionId: session.id, documents: selectedDocs } },
            {
              onSuccess: (res) => {
                res.documents.forEach((doc) => {
                  if (!doc.downloadToken) return;
                  const a = document.createElement("a");
                  a.href = `/api/documents/download/${doc.downloadToken}`;
                  a.download = doc.filename;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                });
                toast({ title: "Required documents generated. Check downloads." });
                setLocation(`/sessions/${session.id}`);
              },
              onError: () => {
                toast({ title: "Failed to generate documents", variant: "destructive" });
                setIsSubmitting(false);
              },
            }
          );
        },
        onError: () => {
          toast({ title: "Failed to save tender case", variant: "destructive" });
          setIsSubmitting(false);
        },
      }
    );
  };

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-6 pb-16">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-secondary">New Tender Case</h1>
            <p className="text-muted-foreground">Upload 4 source documents. The app extracts the case and generates the required outputs.</p>
          </div>
          <Button onClick={extractTenderData} disabled={!allFilesReady || isExtracting} className="bg-secondary text-white hover:bg-secondary/90">
            {isExtracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            Extract Tender Data
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* NIT PDF */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                NIT PDF
                {files.nit && <CheckCircle2 className="h-4 w-4 text-green-700" />}
              </CardTitle>
              <CardDescription>NIT number, date, work register, UBN and G-schedule values</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                type="file"
                accept=".pdf"
                onChange={(event) => setFiles({ ...files, nit: event.target.files?.[0] })}
              />
              {files.nit && <p className="mt-2 truncate text-xs text-muted-foreground">{files.nit.name}</p>}
            </CardContent>
          </Card>
          {/* Tender Opening PDF */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                Tender Opening PDF
                {files.opening && <CheckCircle2 className="h-4 w-4 text-green-700" />}
              </CardTitle>
              <CardDescription>Bidder, tender rate, accepted/cancelled status</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                type="file"
                accept=".pdf"
                onChange={(event) => setFiles({ ...files, opening: event.target.files?.[0] })}
              />
              {files.opening && <p className="mt-2 truncate text-xs text-muted-foreground">{files.opening.name}</p>}
            </CardContent>
          </Card>
          {/* EMD & Fees File */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                EMD & Fees File
                {files.fee && <CheckCircle2 className="h-4 w-4 text-green-700" />}
              </CardTitle>
              <CardDescription>EMD & Other Fees file (PDF, Excel, Image, Text)</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                type="file"
                accept=".pdf,.xlsx,.xls,.csv,.txt,image/*"
                onChange={(event) => setFiles({ ...files, fee: event.target.files?.[0] })}
              />
              {files.fee && <p className="mt-2 truncate text-xs text-muted-foreground">{files.fee.name}</p>}
            </CardContent>
          </Card>
          {/* Publication Details */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                Publication Details
                {files.publication && <CheckCircle2 className="h-4 w-4 text-green-700" />}
              </CardTitle>
              <CardDescription>DIPR RO, newspaper entries and publication cost</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                type="file"
                accept=".pdf,.xlsx,.xls,.csv,.txt,image/*"
                onChange={(event) => setFiles({ ...files, publication: event.target.files?.[0] })}
              />
              {files.publication && <p className="mt-2 truncate text-xs text-muted-foreground">{files.publication.name}</p>}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Review Extracted Tender Data</CardTitle>
            <CardDescription>Only correct what the PDFs could not provide. This is not the primary data-entry workflow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Case Title</Label>
                <Input value={sessionData.title} onChange={(e) => setSessionData({ ...sessionData, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>NIT Number</Label>
                <Input
                  value={sessionData.nitDetails.nitNo}
                  onChange={(e) => setSessionData({ ...sessionData, nitDetails: { ...sessionData.nitDetails, nitNo: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label>NIT Date</Label>
                <Input
                  value={sessionData.nitDetails.nitDate}
                  onChange={(e) => setSessionData({ ...sessionData, nitDetails: { ...sessionData.nitDetails, nitDate: e.target.value } })}
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[64px]">S.No</TableHead>
                    <TableHead>Work</TableHead>
                    <TableHead>G-Schedule</TableHead>
                    <TableHead>Bidder</TableHead>
                    <TableHead>Bid Amount</TableHead>
                    <TableHead>Rate %</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionData.works.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        Upload all 4 PDFs and extract data.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sessionData.works.map((work, index) => (
                      <TableRow key={index}>
                        <TableCell>{work.sno}</TableCell>
                        <TableCell className="min-w-[280px]">
                          <Input value={work.nameOfWork} onChange={(e) => updateWork(index, { nameOfWork: e.target.value })} />
                          <Input className="mt-2 font-mono text-xs" value={work.ubn} onChange={(e) => updateWork(index, { ubn: e.target.value })} placeholder="UBN" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" value={work.gScheduleAmount || ""} onChange={(e) => updateWork(index, { gScheduleAmount: Number(e.target.value) })} />
                        </TableCell>
                        <TableCell>
                          <Input value={work.bidderName ?? ""} onChange={(e) => updateWork(index, { bidderName: e.target.value })} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" value={work.bidAmount ?? ""} onChange={(e) => updateWork(index, { bidAmount: Number(e.target.value) || null })} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" value={work.bidRatePercent ?? ""} onChange={(e) => updateWork(index, { bidRatePercent: Number(e.target.value) || null })} />
                        </TableCell>
                        <TableCell>
                          <Input value={work.status} onChange={(e) => updateWork(index, { status: e.target.value as WorkDetails["status"] })} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {computedWorks.length > 0 && (
              <div className="rounded-md border bg-muted/20 p-4">
                <h3 className="mb-3 font-serif font-semibold text-secondary">Computed Stamp Duty and APS</h3>
                <div className="grid gap-2 md:grid-cols-2">
                  {computedWorks.map((work) => (
                    <div key={work.sno} className="flex items-center justify-between rounded border bg-background px-3 py-2 text-sm">
                      <span className="truncate pr-4">Work {work.sno}: {work.nameOfWork}</span>
                      <span className="shrink-0 font-medium">{formatINR(work.stampDuty)} / {formatINR(work.aps)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Required Outputs
            </CardTitle>
            <CardDescription>These six documents are generated together by default.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 md:grid-cols-2">
              {REQUIRED_DOCS.map((doc) => (
                <div key={doc.id} className="flex items-center gap-2 rounded border bg-muted/20 px-3 py-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-700" />
                  {doc.label}
                </div>
              ))}
            </div>
            <Button
              size="lg"
              className="w-full bg-primary font-bold text-primary-foreground hover:bg-primary/90"
              disabled={isSubmitting || generateMutation.isPending || createSessionMutation.isPending}
              onClick={generateRequiredDocuments}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              Save Case and Generate Required Documents
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
