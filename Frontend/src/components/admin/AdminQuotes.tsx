import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { huminexApi } from "@/integrations/api/client";
import { toast } from "sonner";
import { Check, X, Receipt, Eye, Loader2, Search, RefreshCw } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  converted: "bg-blue-100 text-blue-800",
  draft: "bg-gray-100 text-gray-800",
};

export const AdminQuotes = () => {
  const queryClient = useQueryClient();
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [search, setSearch] = useState("");

  const {
    data: quotes = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["internal-admin-quotes", search],
    queryFn: () => huminexApi.getInternalQuotes(500, "all", search || undefined),
    refetchOnWindowFocus: false,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ quoteId, status }: { quoteId: string; status: "approved" | "rejected" }) => {
      return huminexApi.updateInternalQuoteStatus(quoteId, status);
    },
    onSuccess: (_, variables) => {
      toast.success(`Quote ${variables.status}`);
      queryClient.invalidateQueries({ queryKey: ["internal-admin-quotes"] });
      setSelectedQuote(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update quote");
    },
  });

  const convertMutation = useMutation({
    mutationFn: async (quoteId: string) => huminexApi.convertInternalQuoteToInvoice(quoteId),
    onSuccess: (result) => {
      toast.success(`Invoice ${result.invoiceNumber} created`);
      queryClient.invalidateQueries({ queryKey: ["internal-admin-quotes"] });
      setSelectedQuote(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to convert quote");
    },
  });

  const counts = useMemo(() => ({
    total: quotes.length,
    pending: quotes.filter((quote) => quote.status === "pending").length,
    approved: quotes.filter((quote) => quote.status === "approved").length,
    converted: quotes.filter((quote) => quote.status === "converted").length,
  }), [quotes]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground mb-2">Manage Quotes</h1>
          <p className="text-muted-foreground">Review, approve, reject, or convert quotes to invoices</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{counts.total}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-yellow-600">{counts.pending}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Approved</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-green-600">{counts.approved}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Converted</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-blue-600">{counts.converted}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by quote, contact, email, service"
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {quotes.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">No quotes found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Quote #</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Contact</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Service</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((quote) => (
                    <tr key={quote.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium">{quote.quoteNumber}</td>
                      <td className="py-3 px-4">
                        <p className="text-foreground">{quote.contactName || "-"}</p>
                        <p className="text-xs text-muted-foreground">{quote.contactEmail || "-"}</p>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground capitalize">{(quote.serviceType || "").replace('-', ' ')}</td>
                      <td className="py-3 px-4">₹{Number(quote.finalPrice || 0).toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <Badge className={statusColors[quote.status || "pending"]}>{quote.status || "pending"}</Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{new Date(quote.createdAtUtc).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedQuote(quote)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Quote Details - {selectedQuote?.quoteNumber}</DialogTitle>
          </DialogHeader>

          {selectedQuote && (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground">Contact Name</p><p className="font-medium">{selectedQuote.contactName || "-"}</p></div>
                <div><p className="text-sm text-muted-foreground">Contact Email</p><p className="font-medium">{selectedQuote.contactEmail || "-"}</p></div>
                <div><p className="text-sm text-muted-foreground">Contact Phone</p><p className="font-medium">{selectedQuote.contactPhone || "-"}</p></div>
                <div><p className="text-sm text-muted-foreground">Company</p><p className="font-medium">{selectedQuote.contactCompany || "-"}</p></div>
                <div><p className="text-sm text-muted-foreground">Client Type</p><p className="font-medium capitalize">{selectedQuote.clientType}</p></div>
                <div><p className="text-sm text-muted-foreground">Service Type</p><p className="font-medium capitalize">{(selectedQuote.serviceType || "").replace('-', ' ')}</p></div>
                <div><p className="text-sm text-muted-foreground">Complexity</p><p className="font-medium capitalize">{selectedQuote.complexity}</p></div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={statusColors[selectedQuote.status || "pending"]}>{selectedQuote.status || "pending"}</Badge>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-xl">
                <div className="flex justify-between items-center"><span className="text-muted-foreground">Estimated Price</span><span className="font-medium">₹{Number(selectedQuote.estimatedPrice || 0).toLocaleString()}</span></div>
                {Number(selectedQuote.discountPercent || 0) > 0 && (
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">Discount</span><span className="text-green-600">-{selectedQuote.discountPercent}%</span></div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-border mt-2">
                  <span className="font-medium">Final Price</span>
                  <span className="text-xl font-bold text-primary">₹{Number(selectedQuote.finalPrice || 0).toLocaleString()}</span>
                </div>
              </div>

              {selectedQuote.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-foreground">{selectedQuote.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            {selectedQuote?.status === "pending" && (
              <>
                <Button variant="destructive" onClick={() => statusMutation.mutate({ quoteId: selectedQuote.id, status: "rejected" })} disabled={statusMutation.isPending || convertMutation.isPending}>
                  <X className="h-4 w-4 mr-2" />Reject
                </Button>
                <Button variant="outline" onClick={() => statusMutation.mutate({ quoteId: selectedQuote.id, status: "approved" })} disabled={statusMutation.isPending || convertMutation.isPending} className="border-green-500 text-green-600 hover:bg-green-50">
                  <Check className="h-4 w-4 mr-2" />Approve
                </Button>
              </>
            )}
            {selectedQuote?.status === "approved" && (
              <Button variant="default" onClick={() => convertMutation.mutate(selectedQuote.id)} disabled={statusMutation.isPending || convertMutation.isPending}>
                {convertMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Receipt className="h-4 w-4 mr-2" />}
                Convert to Invoice
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
