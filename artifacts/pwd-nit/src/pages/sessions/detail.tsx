import React, { useState } from "react";
import { useRoute, Link } from "wouter";
import { 
  useGetNitSession, 
  useGetNitSessionSummary, 
  useGenerateDocuments,
  getGetNitSessionQueryKey,
  getGetNitSessionSummaryQueryKey,
  GenerateDocumentsInputDocumentsItem
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, FileText, Loader2, Calendar, FileSignature, CheckCircle2 } from "lucide-react";
import { formatINR, formatDate } from "@/lib/format";

const DOC_TYPES = [
  { id: "scrutiny_note", label: "Tender Scrutiny Note Sheet" },
  { id: "acceptance_letters", label: "Acceptance Letters" },
  { id: "challan_verification", label: "eGross Challan Verification Sheet" },
  { id: "publication_cost", label: "NIT Publication Cost Statement" },
  { id: "master_record", label: "Master Complete Record" },
] as const;

export default function SessionDetail() {
  const [, params] = useRoute("/sessions/:id");
  const sessionId = params?.id ? parseInt(params.id, 10) : 0;
  const { toast } = useToast();

  const { data: session, isLoading: sessionLoading } = useGetNitSession(sessionId, {
    query: { enabled: !!sessionId, queryKey: getGetNitSessionQueryKey(sessionId) }
  });
  
  const { data: summary, isLoading: summaryLoading } = useGetNitSessionSummary(sessionId, {
    query: { enabled: !!sessionId, queryKey: getGetNitSessionSummaryQueryKey(sessionId) }
  });

  const generateMutation = useGenerateDocuments();
  const [selectedDocs, setSelectedDocs] = useState<GenerateDocumentsInputDocumentsItem[]>([
    "scrutiny_note", "acceptance_letters", "challan_verification", "publication_cost", "master_record"
  ]);

  const handleGenerate = () => {
    if (selectedDocs.length === 0) {
      toast({ title: "Select at least one document", variant: "destructive" });
      return;
    }

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
        toast({ title: "Documents generated successfully. Downloading..." });
      },
      onError: () => {
        toast({ title: "Failed to generate documents", variant: "destructive" });
      }
    });
  };

  if (sessionLoading || summaryLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-48 col-span-2" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout>
        <div className="text-center py-20 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <h2 className="text-xl font-semibold mb-2">Session Not Found</h2>
          <p>The NIT session you are looking for does not exist or was deleted.</p>
          <Link href="/sessions">
            <Button variant="outline" className="mt-4">Back to Sessions</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 pb-20">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/sessions">
              <Button variant="ghost" size="icon" className="shrink-0 rounded-full h-8 w-8 bg-muted/50 border border-border">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold font-serif text-secondary tracking-tight">{session.title}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <Badge variant="outline" className="font-mono bg-background">{session.nitDetails.nitNo}</Badge>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(session.nitDetails.nitDate)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <CardTitle className="text-base font-serif flex items-center gap-2">
                  <FileSignature className="w-4 h-4 text-primary" /> NIT Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Office Name</p>
                  <p className="font-medium">{session.nitDetails.office}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Signing Authority</p>
                  <p className="font-medium">{session.nitDetails.signingAuthority}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Total Works</p>
                  <p className="font-medium">{summary?.totalWorks || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Total Bid Value</p>
                  <p className="font-medium text-secondary">{formatINR(summary?.totalBidValue)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-serif">Works & Computations</CardTitle>
                <CardDescription>Stamp Duty and APS computed automatically.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="w-[60px]">S.No</TableHead>
                        <TableHead>Work Name</TableHead>
                        <TableHead>Bid Amount</TableHead>
                        <TableHead>Stamp Duty</TableHead>
                        <TableHead>APS</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary?.workComputations.map(cw => (
                        <TableRow key={cw.sno} className="hover:bg-muted/20">
                          <TableCell className="font-medium text-muted-foreground">{cw.sno}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={cw.nameOfWork}>{cw.nameOfWork}</TableCell>
                          <TableCell>{formatINR(cw.bidAmount)}</TableCell>
                          <TableCell className="font-semibold text-secondary">{formatINR(cw.stampDuty)}</TableCell>
                          <TableCell className="font-semibold text-secondary">{formatINR(cw.aps)}</TableCell>
                          <TableCell>
                            <Badge variant={cw.status === 'accepted' ? 'default' : 'destructive'} className={cw.status === 'accepted' ? 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200' : ''}>
                              {cw.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="bg-muted/30 p-4 border-t flex justify-end gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Total Stamp Duty:</span>
                    <span className="font-bold text-secondary">{formatINR(summary?.totalStampDuty)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Total APS:</span>
                    <span className="font-bold text-secondary">{formatINR(summary?.totalAps)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {session.challanEntries && session.challanEntries.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-serif">eGross Challans</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>S.No</TableHead>
                        <TableHead>GRN / Challan</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>0075 Amt</TableHead>
                        <TableHead>8443 Amt</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {session.challanEntries.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell>{c.workSno}</TableCell>
                          <TableCell>
                            <div className="font-medium text-xs font-mono">{c.grnNo}</div>
                            <div className="text-xs text-muted-foreground">{c.challanNo}</div>
                          </TableCell>
                          <TableCell>{c.vendorName}</TableCell>
                          <TableCell>{formatINR(c.head0075Amount)}</TableCell>
                          <TableCell>{formatINR(c.head8443Amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {session.diprPublication && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-serif">DIPR Publication</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-muted/20 p-4 rounded-md border">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">RO No.</p>
                      <p className="font-medium">{session.diprPublication.roNo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Release Date</p>
                      <p className="font-medium">{session.diprPublication.releaseDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
                      <p className="font-bold text-secondary">{formatINR(session.diprPublication.totalAmount)}</p>
                    </div>
                  </div>
                  
                  {session.diprPublication.entries && session.diprPublication.entries.length > 0 && (
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead>Newspaper</TableHead>
                          <TableHead>Edition</TableHead>
                          <TableHead>Size / SqCm</TableHead>
                          <TableHead>Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {session.diprPublication.entries.map((e, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{e.newspaperName}</TableCell>
                            <TableCell>{e.editionName}</TableCell>
                            <TableCell>
                              <div>{e.advtSize}</div>
                              <div className="text-xs text-muted-foreground">{e.sqCm} sq.cm. @ ₹{e.rate}</div>
                            </TableCell>
                            <TableCell className="font-medium">{formatINR(e.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}

          </div>

          {/* Right Sidebar - Generate Documents */}
          <div className="space-y-6">
            <Card className="border-primary/20 shadow-md sticky top-24">
              <CardHeader className="bg-primary/5 pb-4 border-b border-primary/10">
                <CardTitle className="text-lg text-secondary flex items-center gap-2">
                  <Download className="w-5 h-5 text-primary" /> Generate Documents
                </CardTitle>
                <CardDescription>Select documents to download as MS Word files (.docx).</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-3">
                  {DOC_TYPES.map(doc => (
                    <div key={doc.id} className="flex items-start space-x-3 p-2 hover:bg-muted/50 rounded-md transition-colors">
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
                        className="mt-1 border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      />
                      <div className="grid gap-1.5 leading-none cursor-pointer" onClick={() => {
                        const checked = selectedDocs.includes(doc.id as any);
                        if (!checked) setSelectedDocs([...selectedDocs, doc.id as any]);
                        else setSelectedDocs(selectedDocs.filter(d => d !== doc.id));
                      }}>
                        <Label htmlFor={doc.id} className="text-sm font-medium cursor-pointer">
                          {doc.label}
                        </Label>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-border mt-4">
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm"
                    size="lg"
                    onClick={handleGenerate}
                    disabled={generateMutation.isPending || selectedDocs.length === 0}
                  >
                    {generateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Generate {selectedDocs.length} {selectedDocs.length === 1 ? 'Document' : 'Documents'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
