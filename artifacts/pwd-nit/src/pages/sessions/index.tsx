import React from "react";
import { Link } from "wouter";
import { useListNitSessions, useDeleteNitSession, getListNitSessionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileSignature, Trash2, Eye, Calendar, Plus } from "lucide-react";
import { formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function SessionsList() {
  const { data: sessions, isLoading } = useListNitSessions();
  const deleteMutation = useDeleteNitSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this NIT session? All associated works and data will be lost.")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListNitSessionsQueryKey() });
          toast({ title: "Session deleted successfully" });
        }
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-serif text-secondary tracking-tight">NIT Sessions</h1>
            <p className="text-muted-foreground mt-1">View and manage all your Notice Inviting Tender workflows.</p>
          </div>
          <Link href="/sessions/new">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              Create New Session
            </Button>
          </Link>
        </div>

        <div className="bg-card border border-border rounded-md shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Session Title</TableHead>
                <TableHead>NIT No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-center">Works</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="w-48 h-4" /></TableCell>
                    <TableCell><Skeleton className="w-24 h-4" /></TableCell>
                    <TableCell><Skeleton className="w-32 h-4" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="w-8 h-4 mx-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="w-16 h-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : sessions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <FileSignature className="w-8 h-8 mb-2 opacity-20" />
                      No sessions created yet.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sessions?.map((session) => (
                  <TableRow key={session.id} className="group hover:bg-muted/30">
                    <TableCell className="font-medium text-secondary">
                      <Link href={`/sessions/${session.id}`} className="hover:underline text-secondary">
                        {session.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono bg-background">
                        {session.nitDetails?.nitNo || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      {formatDate(session.nitDetails?.nitDate)}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {session.works?.length || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/sessions/${session.id}`}>
                          <Button variant="outline" size="sm" className="h-8">
                            <Eye className="w-3 h-3 mr-1" /> View
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => handleDelete(session.id)} 
                          className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          title="Delete Session"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
