import React, { useState } from "react";
import { 
  useListContractors, 
  useCreateContractor, 
  useUpdateContractor, 
  useDeleteContractor,
  getListContractorsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Search, Plus, Edit2, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const contractorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  contactNo: z.string().optional().nullable(),
});

type ContractorFormValues = z.infer<typeof contractorSchema>;

export default function Contractors() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: contractors, isLoading } = useListContractors({ search: debouncedSearch });
  
  const createMutation = useCreateContractor();
  const updateMutation = useUpdateContractor();
  const deleteMutation = useDeleteContractor();

  const form = useForm<ContractorFormValues>({
    resolver: zodResolver(contractorSchema),
    defaultValues: { name: "", address: "", contactNo: "" },
  });

  const openCreateDialog = () => {
    setEditingId(null);
    form.reset({ name: "", address: "", contactNo: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (contractor: any) => {
    setEditingId(contractor.id);
    form.reset({ 
      name: contractor.name, 
      address: contractor.address, 
      contactNo: contractor.contactNo || "" 
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: ContractorFormValues) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListContractorsQueryKey() });
          setIsDialogOpen(false);
          toast({ title: "Contractor updated successfully" });
        }
      });
    } else {
      createMutation.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListContractorsQueryKey() });
          setIsDialogOpen(false);
          toast({ title: "Contractor added successfully" });
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this contractor?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListContractorsQueryKey() });
          toast({ title: "Contractor deleted successfully" });
        }
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-serif text-secondary tracking-tight">Contractor Register</h1>
            <p className="text-muted-foreground mt-1">Manage bidder details for auto-completion in NIT documents.</p>
          </div>
          <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Contractor
          </Button>
        </div>

        <div className="flex items-center gap-4 bg-card p-4 rounded-md shadow-sm border border-border">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {contractors?.length || 0} total records
          </div>
        </div>

        <div className="bg-card border border-border rounded-md shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[80px]">S.No.</TableHead>
                <TableHead>Contractor Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Contact No.</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="w-8 h-4" /></TableCell>
                    <TableCell><Skeleton className="w-32 h-4" /></TableCell>
                    <TableCell><Skeleton className="w-48 h-4" /></TableCell>
                    <TableCell><Skeleton className="w-24 h-4" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="w-16 h-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : contractors?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="w-8 h-8 mb-2 opacity-20" />
                      No contractors found.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                contractors?.map((contractor, index) => (
                  <TableRow key={contractor.id} className="group hover:bg-muted/30">
                    <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-semibold text-secondary">{contractor.name}</TableCell>
                    <TableCell className="text-muted-foreground">{contractor.address}</TableCell>
                    <TableCell className="text-muted-foreground">{contractor.contactNo || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="outline" size="icon" onClick={() => openEditDialog(contractor)} className="h-8 w-8">
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleDelete(contractor.id)} className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground">
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">{editingId ? "Edit Contractor" : "Add New Contractor"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contractor Name</FormLabel>
                    <FormControl>
                      <Input placeholder="M/s Name..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Full address..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="+91..." {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Contractor"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
