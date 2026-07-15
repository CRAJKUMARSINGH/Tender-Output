import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Upload, FileText, CheckCircle2, ChevronRight, Search } from "lucide-react";
import { formatINR } from "@/lib/format";
import {
  useParseChallanPdf,
  useComputeValues,
  useCreateNitSession,
  useGenerateDocuments,
  useListContractors,
  WorkDetails,
  WorkDetailsBidRateType,
  WorkDetailsStatus,
  NitSessionInput,
  GenerateDocumentsInputDocumentsItem,
  WorkComputation,
  ChallanEntry,
  DiprPublication
} from "@workspace/api-client-react";

const DOC_TYPES = [
  { id: "scrutiny_note", label: "Tender Scrutiny Note Sheet" },
  { id: "acceptance_letters", label: "Acceptance Letters" },
  { id: "challan_verification", label: "eGross Challan Verification Sheet" },
  { id: "publication_cost", label: "NIT Publication Cost Statement" },
  { id: "master_record", label: "Master Complete Record" },
] as const;

export default function NewSession() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSessionId, setCreatedSessionId] = useState<number | null>(null);

  // Main state
  const [sessionData, setSessionData] = useState<NitSessionInput>({
    title: "",
    nitDetails: {
      nitNo: "",
      nitDate: new Date().toISOString().split("T")[0],
      office: "Executive Engineer, P.W.D. District Division-II, Udaipur",
      signingAuthority: "Executive Engineer"
    },
    works: [],
    challanEntries: [],
    diprPublication: null
  });

  // Step 2 Local State
  const [isWorkDialogOpen, setIsWorkDialogOpen] = useState(false);
  const [currentWork, setCurrentWork] = useState<Partial<WorkDetails>>({});
  const [bidderSearch, setBidderSearch] = useState("");
  
  const { data: contractors } = useListContractors({ search: bidderSearch }, { query: { enabled: true } });

  // Step 3 Local State
  const parsePdfMutation = useParseChallanPdf();
  
  // Step 4 Local State
  const computeMutation = useComputeValues();
  const [computedWorks, setComputedWorks] = useState<WorkComputation[]>([]);
  const createSessionMutation = useCreateNitSession();
  const generateMutation = useGenerateDocuments();
  const [selectedDocs, setSelectedDocs] = useState<GenerateDocumentsInputDocumentsItem[]>([
    "scrutiny_note", "acceptance_letters", "challan_verification", "publication_cost", "master_record"
  ]);

  // Handle auto-compute on step 4
  useEffect(() => {
    if (step === 4 && sessionData.works.length > 0 && computedWorks.length === 0) {
      computeMutation.mutate({ data: { works: sessionData.works } }, {
        onSuccess: (res) => setComputedWorks(res.works)
      });
    }
  }, [step, sessionData.works]);

  const handleNext = () => {
    if (step === 1) {
      if (!sessionData.title || !sessionData.nitDetails.nitNo || !sessionData.nitDetails.nitDate) {
        toast({ title: "Please fill required NIT details", variant: "destructive" });
        return;
      }
    }
    if (step === 2) {
      if (sessionData.works.length === 0) {
        toast({ title: "Please add at least one work", variant: "destructive" });
        return;
      }
    }
    setStep(s => Math.min(s + 1, 4));
    window.scrollTo(0, 0);
  };

  const saveWork = () => {
    if (!currentWork.ubn || !currentWork.nameOfWork || !currentWork.gScheduleAmount || !currentWork.period) {
      toast({ title: "Please fill all required work details", variant: "destructive" });
      return;
    }
    
    const newWork = {
      ...currentWork,
      sno: sessionData.works.length + 1,
      bidRateType: currentWork.bidRateType || "below",
      status: currentWork.status || "accepted",
      gScheduleAmount: Number(currentWork.gScheduleAmount),
      bidAmount: currentWork.bidAmount ? Number(currentWork.bidAmount) : null,
      bidRatePercent: currentWork.bidRatePercent ? Number(currentWork.bidRatePercent) : null,
    } as WorkDetails;

    setSessionData({
      ...sessionData,
      works: [...sessionData.works, newWork]
    });
    setIsWorkDialogOpen(false);
    setCurrentWork({});
    setBidderSearch("");
  };

  const removeWork = (index: number) => {
    const updated = sessionData.works.filter((_, i) => i !== index).map((w, i) => ({ ...w, sno: i + 1 }));
    setSessionData({ ...sessionData, works: updated });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      parsePdfMutation.mutate({ data: { fileBase64: base64, filename: file.name } }, {
        onSuccess: (res) => {
          setSessionData({
            ...sessionData,
            challanEntries: res.challanEntries || [],
            diprPublication: res.diprPublication || null
          });
          toast({ title: "PDF parsed successfully" });
        },
        onError: () => {
          toast({ title: "Failed to parse PDF", variant: "destructive" });
        }
      });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = () => {
    if (selectedDocs.length === 0) {
      toast({ title: "Select at least one document", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    
    if (!createdSessionId) {
      // Create first
      createSessionMutation.mutate({ data: sessionData }, {
        onSuccess: (res) => {
          setCreatedSessionId(res.id);
          generateDocs(res.id);
        },
        onError: () => {
          setIsSubmitting(false);
          toast({ title: "Failed to save session", variant: "destructive" });
        }
      });
    } else {
      generateDocs(createdSessionId);
    }
  };

  const generateDocs = (sessionId: number) => {
    generateMutation.mutate({ data: { sessionId, documents: selectedDocs } }, {
      onSuccess: (res) => {
        res.documents.forEach(doc => {
          const a = document.createElement("a");
          a.href = `/api/documents/download/${doc.downloadToken}`;
          a.download = doc.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        });
        toast({ title: "Documents generating... Check your downloads." });
        setIsSubmitting(false);
        setLocation(`/sessions/${sessionId}`);
      },
      onError: () => {
        setIsSubmitting(false);
        toast({ title: "Failed to generate documents", variant: "destructive" });
      }
    });
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Wizard Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-serif text-secondary tracking-tight">New NIT Session</h1>
            <p className="text-muted-foreground mt-1">Follow the steps to configure and generate documents.</p>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === s ? 'bg-primary text-primary-foreground' : step > s ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          {/* STEP 1: NIT Details */}
          {step === 1 && (
            <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h2 className="text-xl font-serif font-bold text-secondary">Step 1: NIT Details</h2>
                <p className="text-sm text-muted-foreground">Basic information about the Notice Inviting Tender.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label>Session Title (Internal Reference)</Label>
                  <Input 
                    value={sessionData.title} 
                    onChange={e => setSessionData({...sessionData, title: e.target.value})} 
                    placeholder="e.g. NIT 15 - Rural Roads Repair" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>NIT Number</Label>
                  <Input 
                    value={sessionData.nitDetails.nitNo} 
                    onChange={e => setSessionData({...sessionData, nitDetails: {...sessionData.nitDetails, nitNo: e.target.value}})} 
                    placeholder="e.g. 15/2023-24" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>NIT Date</Label>
                  <Input 
                    type="date"
                    value={sessionData.nitDetails.nitDate} 
                    onChange={e => setSessionData({...sessionData, nitDetails: {...sessionData.nitDetails, nitDate: e.target.value}})} 
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Office Name</Label>
                  <Input 
                    value={sessionData.nitDetails.office} 
                    onChange={e => setSessionData({...sessionData, nitDetails: {...sessionData.nitDetails, office: e.target.value}})} 
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Signing Authority</Label>
                  <Input 
                    value={sessionData.nitDetails.signingAuthority} 
                    onChange={e => setSessionData({...sessionData, nitDetails: {...sessionData.nitDetails, signingAuthority: e.target.value}})} 
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Works */}
          {step === 2 && (
            <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-serif font-bold text-secondary">Step 2: Works & Bidders</h2>
                  <p className="text-sm text-muted-foreground">Add up to 6 works for this NIT session.</p>
                </div>
                <Button onClick={() => setIsWorkDialogOpen(true)} disabled={sessionData.works.length >= 6}>
                  <Plus className="w-4 h-4 mr-2" /> Add Work
                </Button>
              </div>

              {sessionData.works.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-lg bg-muted/30">
                  <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No works added yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S.No</TableHead>
                      <TableHead>UBN / Work Name</TableHead>
                      <TableHead>G-Schedule</TableHead>
                      <TableHead>Bid Amount</TableHead>
                      <TableHead>Bidder</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionData.works.map((work, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{work.sno}</TableCell>
                        <TableCell>
                          <div className="font-medium text-xs font-mono">{work.ubn}</div>
                          <div className="text-sm line-clamp-1" title={work.nameOfWork}>{work.nameOfWork}</div>
                        </TableCell>
                        <TableCell>{formatINR(work.gScheduleAmount)}</TableCell>
                        <TableCell>
                          {work.bidAmount ? formatINR(work.bidAmount) : "-"}
                          <div className="text-xs text-muted-foreground">
                            {work.bidRatePercent}% {work.bidRateType}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{work.bidderName || "-"}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[150px]">{work.bidderAddress}</div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeWork(idx)} className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {/* STEP 3: Challan PDF */}
          {step === 3 && (
            <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h2 className="text-xl font-serif font-bold text-secondary">Step 3: Challans & Publication</h2>
                <p className="text-sm text-muted-foreground">Upload the eGross challan and DIPR publication PDF to auto-extract details.</p>
              </div>

              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-muted/10">
                <Input 
                  type="file" 
                  accept=".pdf" 
                  className="hidden" 
                  id="pdf-upload" 
                  onChange={handleFileUpload}
                  disabled={parsePdfMutation.isPending}
                />
                <Label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center justify-center">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                    {parsePdfMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                  </div>
                  <span className="font-semibold text-secondary text-lg">Click to Upload PDF</span>
                  <span className="text-sm text-muted-foreground mt-1">Parses eGross Challan and DIPR forms automatically</span>
                </Label>
              </div>

              {sessionData.challanEntries.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-lg font-serif">Extracted Challan Entries</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Work S.No</TableHead>
                        <TableHead>GRN No.</TableHead>
                        <TableHead>Challan No.</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>0075 Amt</TableHead>
                        <TableHead>8443 Amt</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessionData.challanEntries.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Input 
                              type="number" 
                              className="w-16 h-8" 
                              value={c.workSno} 
                              onChange={(e) => {
                                const nw = [...sessionData.challanEntries];
                                nw[i].workSno = Number(e.target.value);
                                setSessionData({...sessionData, challanEntries: nw});
                              }}
                            />
                          </TableCell>
                          <TableCell><Input className="h-8" value={c.grnNo} onChange={e => { const nw=[...sessionData.challanEntries]; nw[i].grnNo=e.target.value; setSessionData({...sessionData, challanEntries: nw}) }} /></TableCell>
                          <TableCell><Input className="h-8" value={c.challanNo} onChange={e => { const nw=[...sessionData.challanEntries]; nw[i].challanNo=e.target.value; setSessionData({...sessionData, challanEntries: nw}) }} /></TableCell>
                          <TableCell><Input className="h-8" value={c.vendorName} onChange={e => { const nw=[...sessionData.challanEntries]; nw[i].vendorName=e.target.value; setSessionData({...sessionData, challanEntries: nw}) }} /></TableCell>
                          <TableCell><Input type="number" className="w-24 h-8" value={c.head0075Amount} onChange={e => { const nw=[...sessionData.challanEntries]; nw[i].head0075Amount=Number(e.target.value); setSessionData({...sessionData, challanEntries: nw}) }} /></TableCell>
                          <TableCell><Input type="number" className="w-24 h-8" value={c.head8443Amount} onChange={e => { const nw=[...sessionData.challanEntries]; nw[i].head8443Amount=Number(e.target.value); setSessionData({...sessionData, challanEntries: nw}) }} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {sessionData.diprPublication && (
                <div className="space-y-3">
                  <h3 className="font-bold text-lg font-serif">Extracted DIPR Publication</h3>
                  <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded border">
                    <div>
                      <Label className="text-xs">RO Number</Label>
                      <Input className="h-8" value={sessionData.diprPublication.roNo} onChange={e => setSessionData({...sessionData, diprPublication: {...sessionData.diprPublication!, roNo: e.target.value}})} />
                    </div>
                    <div>
                      <Label className="text-xs">Release Date</Label>
                      <Input className="h-8" value={sessionData.diprPublication.releaseDate} onChange={e => setSessionData({...sessionData, diprPublication: {...sessionData.diprPublication!, releaseDate: e.target.value}})} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Review & Generate */}
          {step === 4 && (
            <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h2 className="text-xl font-serif font-bold text-secondary">Step 4: Review & Generate</h2>
                <p className="text-sm text-muted-foreground">Verify computed values and select documents to generate.</p>
              </div>

              {computeMutation.isPending ? (
                <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : (
                <div className="space-y-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Computed Values (Stamp Duty & APS)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>S.No</TableHead>
                            <TableHead>Work Name</TableHead>
                            <TableHead>Bid Amount</TableHead>
                            <TableHead>Stamp Duty</TableHead>
                            <TableHead>APS</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {computedWorks.map(cw => (
                            <TableRow key={cw.sno}>
                              <TableCell>{cw.sno}</TableCell>
                              <TableCell className="max-w-[200px] truncate" title={cw.nameOfWork}>{cw.nameOfWork}</TableCell>
                              <TableCell>{formatINR(cw.bidAmount)}</TableCell>
                              <TableCell className="font-semibold text-secondary">{formatINR(cw.stampDuty)}</TableCell>
                              <TableCell className="font-semibold text-secondary">{formatINR(cw.aps)}</TableCell>
                              <TableCell>
                                <span className={`text-xs px-2 py-1 rounded-full ${cw.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                  {cw.status}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card className="border-primary/20 shadow-md">
                    <CardHeader className="bg-primary/5 pb-4">
                      <CardTitle className="text-lg text-secondary">Generate Documents</CardTitle>
                      <CardDescription>Select which official documents to generate.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        {DOC_TYPES.map(doc => (
                          <div key={doc.id} className="flex items-center space-x-3">
                            <Checkbox 
                              id={doc.id} 
                              checked={selectedDocs.includes(doc.id as any)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedDocs([...selectedDocs, doc.id as any]);
                                } else {
                                  setSelectedDocs(selectedDocs.filter(d => d !== doc.id));
                                }
                              }}
                            />
                            <Label htmlFor={doc.id} className="text-sm font-medium leading-none cursor-pointer">
                              {doc.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* Footer Navigation */}
          <div className="p-4 bg-muted/30 border-t border-border flex justify-between">
            <Button variant="outline" onClick={() => setStep(s => Math.max(s - 1, 1))} disabled={step === 1 || isSubmitting}>
              Back
            </Button>
            {step < 4 ? (
              <Button onClick={handleNext} className="bg-secondary hover:bg-secondary/90 text-white">
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleGenerate} 
                disabled={isSubmitting || computeMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                Save Session & Generate
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Add Work Dialog */}
      <Dialog open={isWorkDialogOpen} onOpenChange={setIsWorkDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Add Work & Bidder</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>UBN <span className="text-destructive">*</span></Label>
              <Input value={currentWork.ubn || ""} onChange={e => setCurrentWork({...currentWork, ubn: e.target.value})} placeholder="e.g. PWD2324WSOB01234" />
            </div>
            <div className="space-y-2">
              <Label>Name of Work <span className="text-destructive">*</span></Label>
              <Input value={currentWork.nameOfWork || ""} onChange={e => setCurrentWork({...currentWork, nameOfWork: e.target.value})} />
            </div>
            
            <div className="space-y-2">
              <Label>G-Schedule Amount (₹) <span className="text-destructive">*</span></Label>
              <Input type="number" value={currentWork.gScheduleAmount || ""} onChange={e => setCurrentWork({...currentWork, gScheduleAmount: Number(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Completion Period <span className="text-destructive">*</span></Label>
              <Input value={currentWork.period || ""} onChange={e => setCurrentWork({...currentWork, period: e.target.value})} placeholder="e.g. 6 Months" />
            </div>

            <div className="space-y-2">
              <Label>Bid Status</Label>
              <Select value={currentWork.status || "accepted"} onValueChange={(v: WorkDetailsStatus) => setCurrentWork({...currentWork, status: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-2 mt-4 pt-4 border-t">
              <h4 className="font-semibold text-sm mb-4 uppercase tracking-wider text-muted-foreground">Tender Rates</h4>
            </div>

            <div className="space-y-2">
              <Label>Rate Type</Label>
              <Select value={currentWork.bidRateType || "below"} onValueChange={(v: WorkDetailsBidRateType) => setCurrentWork({...currentWork, bidRateType: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="below">Below G-Schedule</SelectItem>
                  <SelectItem value="above">Above G-Schedule</SelectItem>
                  <SelectItem value="item_rate">Item Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Rate Percentage (%)</Label>
              <Input type="number" step="0.01" value={currentWork.bidRatePercent || ""} onChange={e => setCurrentWork({...currentWork, bidRatePercent: Number(e.target.value)})} />
            </div>
            
            <div className="space-y-2">
              <Label>Final Bid Amount (₹)</Label>
              <Input type="number" value={currentWork.bidAmount || ""} onChange={e => setCurrentWork({...currentWork, bidAmount: Number(e.target.value)})} />
            </div>
            
            <div className="space-y-2">
              <Label>Rate in Words (Optional)</Label>
              <Input value={currentWork.bidRate || ""} onChange={e => setCurrentWork({...currentWork, bidRate: e.target.value})} placeholder="e.g. 15.5% Below" />
            </div>

            <div className="col-span-2 mt-4 pt-4 border-t">
              <h4 className="font-semibold text-sm mb-4 uppercase tracking-wider text-muted-foreground">Bidder Details</h4>
            </div>
            
            <div className="space-y-2 col-span-2 relative">
              <Label>Bidder Name / Firm</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  className="pl-9"
                  value={bidderSearch} 
                  onChange={e => {
                    setBidderSearch(e.target.value);
                    setCurrentWork({...currentWork, bidderName: e.target.value});
                  }} 
                  placeholder="Search registered contractors or type new..." 
                />
              </div>
              {/* Autocomplete Dropdown */}
              {bidderSearch.length > 1 && contractors && contractors.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border shadow-lg rounded-md max-h-48 overflow-y-auto">
                  {contractors.map(c => (
                    <div 
                      key={c.id} 
                      className="px-4 py-2 hover:bg-muted cursor-pointer text-sm"
                      onClick={() => {
                        setCurrentWork({
                          ...currentWork, 
                          bidderName: c.name,
                          bidderAddress: c.address,
                          bidderContact: c.contactNo || ""
                        });
                        setBidderSearch(c.name);
                      }}
                    >
                      <div className="font-medium text-secondary">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.address}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Bidder Address</Label>
              <Input value={currentWork.bidderAddress || ""} onChange={e => setCurrentWork({...currentWork, bidderAddress: e.target.value})} />
            </div>
            
            <div className="space-y-2">
              <Label>Contact Number</Label>
              <Input value={currentWork.bidderContact || ""} onChange={e => setCurrentWork({...currentWork, bidderContact: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>AEN Sub-Division</Label>
              <Input value={currentWork.aenSubDivision || ""} onChange={e => setCurrentWork({...currentWork, aenSubDivision: e.target.value})} placeholder="e.g. Salumber" />
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWorkDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveWork}>Save Work</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Layout>
  );
}
