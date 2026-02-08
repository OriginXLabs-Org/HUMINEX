import { useQuery } from "@tanstack/react-query";
import { huminexApi } from "@/integrations/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Beaker, CheckCircle, Flag, RefreshCw } from "lucide-react";

const statusClass: Record<string, string> = {
  enabled: "bg-green-500/10 text-green-600 border-green-500/20",
  disabled: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  partial: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  running: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  completed: "bg-green-500/10 text-green-600 border-green-500/20",
};

export const AdminFeatureFlags = () => {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["internal-admin-feature-flags"],
    queryFn: () => huminexApi.getInternalFeatureFlags(),
    staleTime: 15000,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feature Flags</h1>
          <p className="text-muted-foreground">Runtime configuration and experiment visibility from backend</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading || isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{data?.totalFlags ?? 0}</div>
            <p className="text-sm text-muted-foreground">Total Flags</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{data?.enabledFlags ?? 0}</div>
            <p className="text-sm text-muted-foreground">Enabled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-600">{data?.partialFlags ?? 0}</div>
            <p className="text-sm text-muted-foreground">Partial</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{data?.abTests.length ?? 0}</div>
            <p className="text-sm text-muted-foreground">A/B Tests</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Flag className="w-5 h-5" /> Runtime Feature Flags</CardTitle>
          <CardDescription>Read from backend FeatureManagement configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rollout</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.flags ?? []).map((flag) => (
                <TableRow key={flag.id}>
                  <TableCell className="font-mono text-xs">{flag.key}</TableCell>
                  <TableCell className="font-medium">{flag.name}</TableCell>
                  <TableCell>{flag.type}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusClass[flag.status] ?? ""}>{flag.status}</Badge>
                  </TableCell>
                  <TableCell className="w-44">
                    <div className="flex items-center gap-3">
                      <Progress value={flag.rolloutPercent} className="h-2" />
                      <span className="text-xs text-muted-foreground w-10">{flag.rolloutPercent}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{new Date(flag.updatedAtUtc).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {(!data || data.flags.length === 0) && !isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No feature flags found in backend configuration.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Beaker className="w-5 h-5" /> Experiment Snapshot</CardTitle>
          <CardDescription>Backend-derived A/B experiment distributions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(data?.abTests ?? []).map((test) => (
            <Card key={test.id}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{test.name}</div>
                    <div className="text-xs text-muted-foreground">Visitors: {test.visitors}</div>
                  </div>
                  <Badge variant="outline" className={statusClass[test.status] ?? ""}>{test.status}</Badge>
                </div>

                <div className="space-y-2">
                  {test.variants.map((variant) => {
                    const percent = test.visitors > 0 ? (variant.conversions * 100) / test.visitors : 0;
                    return (
                      <div key={`${test.id}-${variant.name}`}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{variant.name}{test.winner === variant.name ? " (winner)" : ""}</span>
                          <span>{variant.conversions} conversions</span>
                        </div>
                        <Progress value={percent} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          {(!data || data.abTests.length === 0) && !isLoading && (
            <div className="text-center text-muted-foreground py-8">No active experiments found.</div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle className="w-4 h-4 text-green-600" />
        Feature data on this page is backend-derived (no frontend mock dataset).
      </div>
    </div>
  );
};

export default AdminFeatureFlags;
