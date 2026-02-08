import { useEffect, useMemo, useState } from "react";
import { huminexApi, type InternalAdminInvoiceResponse, type InternalAdminTenantBillingItemResponse } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CreditCard,
  TrendingUp,
  DollarSign,
  Calendar,
  Search,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

export const AdminTenantBilling = () => {
  const [billingData, setBillingData] = useState<InternalAdminTenantBillingItemResponse[]>([]);
  const [invoices, setInvoices] = useState<InternalAdminInvoiceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({
    totalMRR: 0,
    totalARR: 0,
    activeSubs: 0,
    trialAccounts: 0,
    pastDue: 0,
    outstanding: 0,
  });

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const [billing, recentInvoices] = await Promise.all([
        huminexApi.getInternalTenantBilling(500),
        huminexApi.getInternalInvoices(50, "all"),
      ]);

      setBillingData(billing.items || []);
      setInvoices(recentInvoices || []);
      setStats({
        totalMRR: Number(billing.totalMrr || 0),
        totalARR: Number(billing.totalArr || 0),
        activeSubs: billing.activeSubscriptions || 0,
        trialAccounts: billing.trialAccounts || 0,
        pastDue: billing.pastDueAccounts || 0,
        outstanding: (billing.items || []).reduce((sum, item) => sum + Number(item.outstandingAmount || 0), 0),
      });
    } catch (error) {
      console.error("Error fetching billing data:", error);
      toast.error("Failed to load tenant billing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const filteredData = useMemo(
    () =>
      billingData.filter((b) =>
        `${b.tenantName} ${b.plan} ${b.status}`.toLowerCase().includes(searchTerm.trim().toLowerCase())
      ),
    [billingData, searchTerm]
  );

  const statusColors: Record<string, string> = {
    active: "bg-green-500/10 text-green-500 border-green-500/20",
    trial: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    past_due: "bg-red-500/10 text-red-500 border-red-500/20",
    cancelled: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };

  const planColors: Record<string, string> = {
    enterprise: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    growth: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    startup: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };

  const exportBillingCsv = () => {
    const rows = [
      [
        "tenant",
        "plan",
        "status",
        "mrr",
        "next_billing",
        "total_invoiced",
        "total_paid",
        "outstanding",
        "overdue",
      ],
      ...filteredData.map((item) => [
        item.tenantName,
        item.plan,
        item.status,
        String(item.mrr),
        item.nextBillingAtUtc,
        String(item.totalInvoiced),
        String(item.totalPaid),
        String(item.outstandingAmount),
        String(item.overdueAmount),
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tenant-billing-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Tenant Billing</h1>
            <p className="text-muted-foreground">Real billing data across all employer tenants</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchBillingData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportBillingCsv} disabled={filteredData.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-500 mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium">MRR</span>
            </div>
            <p className="text-2xl font-bold text-foreground">₹{stats.totalMRR.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-500 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">ARR</span>
            </div>
            <p className="text-2xl font-bold text-foreground">₹{stats.totalARR.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-purple-500 mb-2">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-medium">Active</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.activeSubs}</p>
            <p className="text-xs text-muted-foreground mt-1">Subscriptions</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-transparent border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-cyan-500 mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">Trials</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.trialAccounts}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-transparent border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-500 mb-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Past Due</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.pastDue}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-500 mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium">Outstanding</span>
            </div>
            <p className="text-2xl font-bold text-foreground">₹{stats.outstanding.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tenants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>MRR</TableHead>
                      <TableHead>Next Billing</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead className="text-right">Invoices</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((billing) => (
                      <TableRow key={billing.tenantId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-primary" />
                            </div>
                            <span className="font-medium">{billing.tenantName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={planColors[billing.plan] || planColors.startup}>{billing.plan}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[billing.status] || statusColors.active}>{billing.status}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">₹{Number(billing.mrr).toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            {new Date(billing.nextBillingAtUtc).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">₹{Number(billing.outstandingAmount).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{billing.invoiceCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>Latest invoices from backend internal-admin API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {invoices.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No invoice records available</p>
              ) : (
                invoices.slice(0, 15).map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-mono text-sm font-medium">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.contactName || "Unknown"} • {invoice.contactEmail || "No email"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₹{Number(invoice.totalAmount).toLocaleString()}</p>
                      <Badge className={statusColors[invoice.status] || statusColors.draft}>{invoice.status}</Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminTenantBilling;
