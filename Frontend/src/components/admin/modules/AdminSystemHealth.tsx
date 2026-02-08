import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { huminexApi } from "@/integrations/api/client";
import { Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Loader2 } from "lucide-react";

const statusStyles: Record<string, string> = {
  healthy: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  degraded: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  unhealthy: "bg-red-500/10 text-red-500 border-red-500/20",
};

function getStatusIcon(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "healthy") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (normalized === "degraded") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <XCircle className="h-4 w-4 text-red-500" />;
}

export const AdminSystemHealth = () => {
  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["internal-admin-system-health"],
    queryFn: () => huminexApi.getInternalSystemHealth(),
    refetchInterval: 15000,
    refetchOnWindowFocus: false,
  });

  const counts = useMemo(() => {
    const checks = data?.checks || [];
    return {
      total: checks.length,
      healthy: checks.filter((item) => item.status === "healthy").length,
      degraded: checks.filter((item) => item.status === "degraded").length,
      unhealthy: checks.filter((item) => item.status === "unhealthy").length,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const overall = data?.status || "unknown";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground mb-2">System Health Dashboard</h1>
          <p className="text-muted-foreground">Live infrastructure checks from HUMINEX backend health providers</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Overall</CardTitle></CardHeader>
          <CardContent>
            <Badge className={statusStyles[overall] || "bg-muted text-muted-foreground"}>{overall}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Checks</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{counts.total}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Healthy</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-emerald-500">{counts.healthy}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Issues</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-amber-500">{counts.degraded + counts.unhealthy}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Health Checks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!data?.checks || data.checks.length === 0) ? (
            <p className="text-sm text-muted-foreground">No health checks returned.</p>
          ) : (
            <div className="space-y-3">
              {data.checks.map((check) => (
                <div key={check.name} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(check.status)}
                    <div>
                      <p className="font-medium text-foreground">{check.name}</p>
                      <p className="text-xs text-muted-foreground">{check.description || "No description"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={statusStyles[check.status] || ""}>{check.status}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{check.latency}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Last checked: {data?.checkedAtUtc ? new Date(data.checkedAtUtc).toLocaleString() : "-"}
      </p>
    </div>
  );
};
