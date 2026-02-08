import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { huminexApi } from "@/integrations/api/client";
import { Activity, ExternalLink, Loader2, RefreshCw, Shield } from "lucide-react";

const METHOD_STYLES: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  POST: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  PUT: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  PATCH: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  DELETE: "bg-red-500/10 text-red-400 border-red-500/30",
};

function methodBadge(method: string) {
  const upper = method.toUpperCase();
  return (
    <Badge variant="outline" className={METHOD_STYLES[upper] || "bg-muted text-muted-foreground"}>
      {upper}
    </Badge>
  );
}

export const AdminAPIGateway = () => {
  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["internal-admin-api-endpoints"],
    queryFn: () => huminexApi.getInternalApiEndpoints(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

  const endpoints = useMemo(
    () => (data?.endpoints ?? []).slice().sort((a, b) => b.callCount - a.callCount || a.route.localeCompare(b.route)),
    [data?.endpoints]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">API Endpoints Dashboard</h1>
          <p className="text-muted-foreground">
            Auto-discovered from backend API metadata. New endpoints appear automatically after deployment.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button asChild>
            <a href={data?.swaggerUrl ?? "https://api.gethuminex.com/swagger/index.html"} target="_blank" rel="noreferrer">
              Open Swagger
              <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Endpoints</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{data?.endpointCount ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Calls</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{(data?.totalCallCount ?? 0).toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Authenticated</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {(endpoints.filter((x) => x.authRequired).length).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Public</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {(endpoints.filter((x) => !x.authRequired).length).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Endpoint Inventory
          </CardTitle>
        </CardHeader>
        <CardContent>
          {endpoints.length === 0 ? (
            <p className="text-sm text-muted-foreground">No endpoint metadata returned.</p>
          ) : (
            <div className="space-y-3">
              {endpoints.map((endpoint) => (
                <div key={`${endpoint.method}-${endpoint.route}`} className="rounded-lg border p-3 bg-muted/20">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {methodBadge(endpoint.method)}
                      <code className="text-sm truncate">{endpoint.route}</code>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{endpoint.callCount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">calls</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate">Operation: {endpoint.operationName || "n/a"}</span>
                    <span className="inline-flex items-center gap-1">
                      {endpoint.authRequired ? <Shield className="h-3 w-3" /> : null}
                      {endpoint.authRequired ? "Auth required" : "Public"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Last generated: {data?.generatedAtUtc ? new Date(data.generatedAtUtc).toLocaleString() : "-"}.
        Call counts are runtime counters and reset on pod restart.
      </p>
    </div>
  );
};

export default AdminAPIGateway;
