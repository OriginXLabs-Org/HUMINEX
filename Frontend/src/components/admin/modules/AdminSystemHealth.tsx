import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { huminexApi } from "@/integrations/api/client";
import { Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Loader2, ExternalLink } from "lucide-react";

const statusStyles: Record<string, string> = {
  healthy: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  degraded: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  unhealthy: "bg-red-500/10 text-red-500 border-red-500/20",
  unknown: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  running: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  crashloop: "bg-red-500/10 text-red-500 border-red-500/20",
  failed: "bg-red-500/10 text-red-500 border-red-500/20",
  succeeded: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
};

function getStatusIcon(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "healthy" || normalized === "running" || normalized === "succeeded") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (normalized === "degraded" || normalized === "pending" || normalized === "unknown") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
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
    refetchInterval: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const counts = useMemo(() => {
    const checks = data?.checks || [];
    return {
      total: checks.length,
      healthy: checks.filter((item) => item.status === "healthy").length,
      degraded: checks.filter((item) => item.status === "degraded").length,
      unhealthy: checks.filter((item) => item.status === "unhealthy").length,
      unknown: checks.filter((item) => item.status === "unknown").length,
    };
  }, [data]);

  const quickLinks = useMemo(() => {
    const links = new Map<string, string>();
    links.set("API Swagger", "https://api.gethuminex.com/swagger/index.html");
    for (const check of data?.checks ?? []) {
      if (check.portalUrl && check.portalUrl.startsWith("http")) {
        links.set(check.name, check.portalUrl);
      }
    }
    return Array.from(links.entries());
  }, [data?.checks]);

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
          <p className="text-muted-foreground">Live infrastructure checks with Azure links, AKS runtime details, and backend dependency signals</p>
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
                      <p className="text-xs text-muted-foreground mt-1">
                        {check.category || "general"} • {check.resourceType || "resource"} • {check.resourceName || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant="outline" className={statusStyles[check.status] || ""}>{check.status}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{check.latency}</p>
                    {check.portalUrl && (
                      <a
                        className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
                        href={check.portalUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open in Azure <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {quickLinks.map(([label, href]) => (
              <a
                key={`${label}-${href}`}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/30"
              >
                <span className="truncate">{label}</span>
                <ExternalLink className="h-3.5 w-3.5 ml-2 shrink-0" />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Last checked: {data?.checkedAtUtc ? new Date(data.checkedAtUtc).toLocaleString() : "-"} • Auto-refresh: every 30 minutes •
        Unknown checks: {counts.unknown}
      </p>
    </div>
  );
};
