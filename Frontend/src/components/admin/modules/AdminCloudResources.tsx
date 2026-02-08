import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Cloud,
  Server,
  Database,
  Cpu,
  Globe,
  Zap,
  DollarSign,
  RefreshCw,
  Settings,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { huminexApi, type InternalAdminInvoiceResponse, type InternalSystemHealthResponse, type InternalSystemLogResponse } from "@/integrations/api/client";
import { toast } from "sonner";

export const AdminCloudResources = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [health, setHealth] = useState<InternalSystemHealthResponse | null>(null);
  const [systemLogs, setSystemLogs] = useState<InternalSystemLogResponse[]>([]);
  const [invoices, setInvoices] = useState<InternalAdminInvoiceResponse[]>([]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [healthData, logs, invoiceData] = await Promise.all([
        huminexApi.getInternalSystemHealth(),
        huminexApi.getInternalSystemLogs("all", 1000),
        huminexApi.getInternalInvoices(500, "all"),
      ]);
      setHealth(healthData);
      setSystemLogs(logs || []);
      setInvoices(invoiceData || []);
    } catch (error) {
      console.error("Failed to load cloud resources", error);
      toast.error("Failed to load cloud resources data");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void handleRefresh();
  }, []);

  const usageData = useMemo(() => {
    const dayKeys = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });

    const daily = dayKeys.map((d) => ({
      day: d.toLocaleString("en-US", { weekday: "short" }),
      compute: 0,
      storage: 0,
      bandwidth: 0,
    }));

    for (const log of systemLogs) {
      const t = new Date(log.createdAtUtc);
      const idx = dayKeys.findIndex((d, i) => {
        const next = dayKeys[i + 1];
        return t >= d && (!next || t < next);
      });
      if (idx < 0) continue;

      if (log.level === "info") daily[idx].compute += 1;
      if (log.level === "warning") daily[idx].storage += 1;
      if (log.level === "error") daily[idx].bandwidth += 1;
    }

    const normalize = (value: number, max: number) => (max <= 0 ? 0 : Math.round((value * 100) / max));
    const maxCompute = Math.max(...daily.map((d) => d.compute), 1);
    const maxStorage = Math.max(...daily.map((d) => d.storage), 1);
    const maxBandwidth = Math.max(...daily.map((d) => d.bandwidth), 1);

    return daily.map((d) => ({
      day: d.day,
      compute: normalize(d.compute, maxCompute),
      storage: normalize(d.storage, maxStorage),
      bandwidth: normalize(d.bandwidth, maxBandwidth),
    }));
  }, [systemLogs]);

  const monthlyInvoices = useMemo(() => {
    const now = new Date();
    return invoices.filter((invoice) => {
      const d = new Date(invoice.createdAtUtc);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [invoices]);

  const monthlyAmount = monthlyInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);

  const costBreakdown = useMemo(() => {
    const paid = invoices.filter((x) => x.status === "paid").reduce((sum, x) => sum + Number(x.totalAmount || 0), 0);
    const sent = invoices.filter((x) => x.status === "sent").reduce((sum, x) => sum + Number(x.totalAmount || 0), 0);
    const overdue = invoices.filter((x) => x.status === "overdue").reduce((sum, x) => sum + Number(x.totalAmount || 0), 0);
    const draft = invoices.filter((x) => x.status === "draft").reduce((sum, x) => sum + Number(x.totalAmount || 0), 0);

    const total = Math.max(1, paid + sent + overdue + draft);
    return [
      { name: "Paid", value: Math.round((paid * 100) / total), color: "hsl(160, 84%, 39%)", amount: paid },
      { name: "Sent", value: Math.round((sent * 100) / total), color: "hsl(188, 94%, 43%)", amount: sent },
      { name: "Overdue", value: Math.round((overdue * 100) / total), color: "hsl(0, 84%, 60%)", amount: overdue },
      { name: "Draft", value: Math.round((draft * 100) / total), color: "hsl(262, 83%, 58%)", amount: draft },
    ];
  }, [invoices]);

  const resources = useMemo(() => {
    return (health?.checks || []).map((check, index) => {
      const ms = Number.parseInt(String(check.latency).replace("ms", ""), 10);
      const load = Number.isNaN(ms) ? 0 : Math.min(100, Math.max(0, ms));
      return {
        id: index + 1,
        name: check.name,
        type: check.description || "Service Check",
        region: "Platform",
        status: check.status,
        load,
      };
    });
  }, [health]);

  const healthyCount = (health?.checks || []).filter((x) => x.status === "healthy").length;
  const totalChecks = Math.max(1, (health?.checks || []).length);
  const uptimePercent = ((healthyCount * 100) / totalChecks).toFixed(2);
  const warningOrError = systemLogs.filter((x) => x.level === "warning" || x.level === "error").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-500/10">
            <Cloud className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Cloud Resources</h1>
            <p className="text-muted-foreground">Live platform health and operational telemetry</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-500 mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium">Monthly Billed</span>
            </div>
            <p className="text-2xl font-bold text-foreground">₹{monthlyAmount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">From invoices this month</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-purple-500 mb-2">
              <Server className="w-4 h-4" />
              <span className="text-xs font-medium">Active Services</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{resources.length}</p>
            <p className="text-xs text-muted-foreground mt-1">From health checks</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-transparent border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-cyan-500 mb-2">
              <Globe className="w-4 h-4" />
              <span className="text-xs font-medium">Healthy Checks</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{healthyCount}/{totalChecks}</p>
            <p className="text-xs text-muted-foreground mt-1">Current status</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-500 mb-2">
              <Zap className="w-4 h-4" />
              <span className="text-xs font-medium">Service Uptime</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{uptimePercent}%</p>
            <p className="text-xs text-muted-foreground mt-1">Based on check health</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Operational Signal (7 Days)</CardTitle>
            <CardDescription>Normalized system log levels by day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageData}>
                  <defs>
                    <linearGradient id="computeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="storageGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(188, 94%, 43%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(188, 94%, 43%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(190, 15%, 20%)" />
                  <XAxis dataKey="day" stroke="hsl(190, 30%, 40%)" fontSize={12} />
                  <YAxis stroke="hsl(190, 30%, 40%)" fontSize={12} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(190, 40%, 12%)",
                      border: "1px solid hsl(190, 25%, 22%)",
                      borderRadius: "8px",
                    }}
                  />
                  <Area type="monotone" dataKey="compute" name="Info" stroke="hsl(262, 83%, 58%)" fill="url(#computeGrad)" />
                  <Area type="monotone" dataKey="storage" name="Warning" stroke="hsl(188, 94%, 43%)" fill="url(#storageGrad)" />
                  <Area type="monotone" dataKey="bandwidth" name="Error" stroke="hsl(0, 84%, 60%)" fill="hsl(0, 84%, 60%, 0.12)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Status Mix</CardTitle>
            <CardDescription>Distribution of invoice amounts by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] flex items-center">
              <ResponsiveContainer width="50%" height="100%">
                <PieChart>
                  <Pie data={costBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                    {costBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {costBreakdown.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-8">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="font-medium">₹{item.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Service Checks</CardTitle>
          <CardDescription>Live checks from internal system health endpoint</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {resources.length === 0 ? (
              <div className="p-4 bg-muted/50 rounded-xl text-sm text-muted-foreground">No health check resources available.</div>
            ) : (
              resources.map((resource) => (
                <div key={resource.id} className="p-4 bg-muted/50 rounded-xl">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        {resource.name.toLowerCase().includes("database") ? <Database className="w-5 h-5 text-primary" /> : null}
                        {resource.name.toLowerCase().includes("cache") ? <Zap className="w-5 h-5 text-cyan-500" /> : null}
                        {resource.name.toLowerCase().includes("api") ? <Cpu className="w-5 h-5 text-purple-500" /> : null}
                        {!resource.name.toLowerCase().includes("database") && !resource.name.toLowerCase().includes("cache") && !resource.name.toLowerCase().includes("api") ? <Server className="w-5 h-5 text-orange-500" /> : null}
                      </div>
                      <div>
                        <p className="font-medium">{resource.name}</p>
                        <p className="text-sm text-muted-foreground">{resource.type} • {resource.region}</p>
                      </div>
                    </div>
                    <Badge className={resource.status === "healthy" ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"}>
                      {resource.status === "healthy" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                      {resource.status}
                    </Badge>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Latency Load</span>
                      <span className="text-xs font-medium">{resource.load}%</span>
                    </div>
                    <Progress value={resource.load} className="h-1.5" />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            Warning/Error logs in current window: {warningOrError}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCloudResources;
