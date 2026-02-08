import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, Target, Loader2 } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { huminexApi, type InternalAdminRevenueAnalyticsResponse } from "@/integrations/api/client";
import { toast } from "sonner";

const planColorMap: Record<string, string> = {
  enterprise: "hsl(262, 83%, 58%)",
  growth: "hsl(188, 94%, 43%)",
  startup: "hsl(190, 30%, 40%)",
};

const rangeToMonths: Record<string, number> = {
  "3m": 3,
  "6m": 6,
  "12m": 12,
  all: 36,
};

export const AdminRevenueAnalytics = () => {
  const [timeRange, setTimeRange] = useState("12m");
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<InternalAdminRevenueAnalyticsResponse | null>(null);

  const loadAnalytics = async (range: string) => {
    setLoading(true);
    try {
      const months = rangeToMonths[range] ?? 12;
      const data = await huminexApi.getInternalRevenueAnalytics(months);
      setAnalytics(data);
    } catch (error) {
      console.error("Error fetching revenue analytics:", error);
      toast.error("Failed to load revenue analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics(timeRange);
  }, [timeRange]);

  const revenueData = useMemo(
    () =>
      (analytics?.timeline || []).map((point) => {
        const [year, month] = point.month.split("-").map(Number);
        const monthLabel = Number.isFinite(year) && Number.isFinite(month)
          ? new Date(year, month - 1, 1).toLocaleString("en-US", { month: "short" })
          : point.month;

        return {
          ...point,
          monthLabel,
        };
      }),
    [analytics]
  );

  const planDistribution = useMemo(
    () =>
      (analytics?.planDistribution || []).map((item) => ({
        name: item.plan,
        value: Number(item.percent || 0),
        color: planColorMap[item.plan] || "hsl(190, 30%, 40%)",
      })),
    [analytics]
  );

  const latestPoint = revenueData.length > 0 ? revenueData[revenueData.length - 1] : null;
  const expansionRevenue = Number(latestPoint?.newMrr || 0);
  const churnedRevenue = Number(latestPoint?.churned || 0);
  const netChange = expansionRevenue - churnedRevenue;

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const mrr = Number(analytics?.currentMrr || 0);
  const arr = Number(analytics?.currentArr || 0);
  const arpu = Number(analytics?.arpu || 0);
  const churn = Number(analytics?.churnRatePercent || 0);
  const nrr = Number(analytics?.netRevenueRetentionPercent || 0);
  const mrrGrowth = Number(analytics?.mrrGrowthPercent || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Revenue Analytics</h1>
            <p className="text-muted-foreground">Backend-driven MRR, ARR, churn and plan distribution</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">3 Months</SelectItem>
              <SelectItem value="6m">6 Months</SelectItem>
              <SelectItem value="12m">12 Months</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">MRR</span>
              <Badge className="bg-green-500/20 text-green-500 text-[10px]">
                <ArrowUpRight className="w-3 h-3 mr-0.5" />
                {mrrGrowth.toFixed(2)}%
              </Badge>
            </div>
            <p className="text-2xl font-bold text-foreground">₹{mrr.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">ARR</span>
              <Badge className="bg-blue-500/20 text-blue-500 text-[10px]">Live</Badge>
            </div>
            <p className="text-2xl font-bold text-foreground">₹{arr.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">ARPU</span>
              <Badge className="bg-purple-500/20 text-purple-500 text-[10px]">Live</Badge>
            </div>
            <p className="text-2xl font-bold text-foreground">₹{arpu.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Churn</span>
              <Badge className="bg-red-500/20 text-red-500 text-[10px]">
                <ArrowDownRight className="w-3 h-3 mr-0.5" />
                rate
              </Badge>
            </div>
            <p className="text-2xl font-bold text-foreground">{churn.toFixed(2)}%</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-transparent border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">NRR</span>
              <Badge className="bg-cyan-500/20 text-cyan-500 text-[10px]">Live</Badge>
            </div>
            <p className="text-2xl font-bold text-foreground">{nrr.toFixed(2)}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>MRR Growth</CardTitle>
            <CardDescription>Monthly recurring revenue trend</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(190, 15%, 20%)" />
                  <XAxis dataKey="monthLabel" stroke="hsl(190, 30%, 40%)" fontSize={12} />
                  <YAxis stroke="hsl(190, 30%, 40%)" fontSize={12} tickFormatter={(v) => `₹${Number(v).toLocaleString()}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(190, 40%, 12%)",
                      border: "1px solid hsl(190, 25%, 22%)",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`₹${Number(value).toLocaleString()}`, "MRR"]}
                  />
                  <Area type="monotone" dataKey="mrr" stroke="hsl(262, 83%, 58%)" strokeWidth={2} fill="url(#mrrGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Plan</CardTitle>
            <CardDescription>Distribution from active tenant base</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={planDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                    {planDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(190, 40%, 12%)",
                      border: "1px solid hsl(190, 25%, 22%)",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${Number(value).toFixed(2)}%`, "Share"]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Net MRR Movement</CardTitle>
            <CardDescription>New revenue vs churn</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(190, 15%, 20%)" />
                  <XAxis dataKey="monthLabel" stroke="hsl(190, 30%, 40%)" fontSize={12} />
                  <YAxis stroke="hsl(190, 30%, 40%)" fontSize={12} tickFormatter={(v) => `₹${Number(v).toLocaleString()}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(190, 40%, 12%)",
                      border: "1px solid hsl(190, 25%, 22%)",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`₹${Number(value).toLocaleString()}`]}
                  />
                  <Legend />
                  <Bar dataKey="newMrr" name="New MRR" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="churned" name="Churned" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Net Revenue Retention</CardTitle>
              <CardDescription>Current-period movement</CardDescription>
            </div>
            <Badge className="bg-green-500/20 text-green-500 text-lg px-3 py-1">{nrr.toFixed(2)}%</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                <div>
                  <p className="text-sm text-muted-foreground">Expansion Revenue</p>
                  <p className="text-xl font-bold text-green-500">+₹{expansionRevenue.toLocaleString()}</p>
                </div>
                <ArrowUpRight className="w-6 h-6 text-green-500" />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                <div>
                  <p className="text-sm text-muted-foreground">Churned Revenue</p>
                  <p className="text-xl font-bold text-red-500">-₹{churnedRevenue.toLocaleString()}</p>
                </div>
                <ArrowDownRight className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex items-center justify-between p-4 bg-primary/10 rounded-xl border border-primary/20">
                <div>
                  <p className="text-sm text-muted-foreground">Net Change</p>
                  <p className="text-xl font-bold text-primary">{netChange >= 0 ? "+" : ""}₹{netChange.toLocaleString()}</p>
                </div>
                <Target className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Refreshing analytics...
        </div>
      )}
    </div>
  );
};

export default AdminRevenueAnalytics;
