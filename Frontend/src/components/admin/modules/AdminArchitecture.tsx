import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { huminexApi } from "@/integrations/api/client";
import { CheckCircle2, CircleDashed, Loader2 } from "lucide-react";

const statusClass: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  in_progress: "bg-blue-500/10 text-blue-300 border-blue-500/30",
  blocked: "bg-rose-500/10 text-rose-300 border-rose-500/30",
};

function moduleStatusIcon(status: string) {
  if (status === "completed") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  }
  if (status === "in_progress") {
    return <Loader2 className="h-4 w-4 text-blue-300 animate-spin" />;
  }
  return <CircleDashed className="h-4 w-4 text-amber-400" />;
}

export const AdminArchitecture = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["internal-admin-architecture-status"],
    queryFn: () => huminexApi.getInternalArchitectureStatus(),
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const defaultPortal = useMemo(() => data?.portals?.[0]?.name ?? "EMPLOYEE Portal", [data?.portals]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const portals = data?.portals ?? [];
  const deliveryTracker = data?.deliveryTracker;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{data?.title ?? "HUMINEX Architecture"}</h1>
        <p className="text-muted-foreground mt-2">
          {data?.notes ?? "Central tracker for Employee Portal, Employer Portal and HUMINEX Internal architecture status."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tech Stack (.NET and Platform)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(data?.techStack ?? []).map((item) => (
            <Badge key={item} variant="outline">{item}</Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>15-Module Delivery Tracker</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="rounded-lg border p-3 bg-muted/20">
              <p className="text-xs text-muted-foreground">Current Module</p>
              <p className="text-sm font-semibold mt-1">{deliveryTracker?.currentModule ?? "-"}</p>
            </div>
            <div className="rounded-lg border p-3 bg-muted/20">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-sm font-semibold mt-1">{deliveryTracker?.totalModules ?? 0}</p>
            </div>
            <div className="rounded-lg border p-3 bg-muted/20">
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-sm font-semibold mt-1 text-emerald-400">{deliveryTracker?.completedModules ?? 0}</p>
            </div>
            <div className="rounded-lg border p-3 bg-muted/20">
              <p className="text-xs text-muted-foreground">In Progress</p>
              <p className="text-sm font-semibold mt-1 text-blue-300">{deliveryTracker?.inProgressModules ?? 0}</p>
            </div>
            <div className="rounded-lg border p-3 bg-muted/20">
              <p className="text-xs text-muted-foreground">Blocked</p>
              <p className="text-sm font-semibold mt-1 text-rose-300">{deliveryTracker?.blockedModules ?? 0}</p>
            </div>
          </div>

          <div className="space-y-2">
            {(deliveryTracker?.items ?? []).map((item) => (
              <div key={item.order} className="rounded-lg border p-3 bg-muted/20">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-sm">{item.order}. {item.module}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.phase}</Badge>
                    <Badge variant="outline" className={statusClass[item.status] || ""}>{item.status}</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{item.scopeSummary}</p>
                <p className="text-xs text-muted-foreground mt-1">Next: {item.nextMilestone}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue={defaultPortal} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          {portals.map((portal) => (
            <TabsTrigger key={portal.name} value={portal.name}>
              {portal.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {portals.map((portal) => (
          <TabsContent key={portal.name} value={portal.name} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Completed Modules</CardTitle></CardHeader>
                <CardContent><p className="text-3xl font-semibold text-emerald-400">{portal.completedModules}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending Modules</CardTitle></CardHeader>
                <CardContent><p className="text-3xl font-semibold text-amber-400">{portal.pendingModules}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Mapped API Endpoints</CardTitle></CardHeader>
                <CardContent><p className="text-3xl font-semibold">{portal.endpointCount}</p></CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{portal.name} Modules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {portal.modules.map((module) => (
                    <div key={module.module} className="rounded-lg border p-3 bg-muted/20">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {moduleStatusIcon(module.status)}
                          <p className="font-medium truncate">{module.module}</p>
                        </div>
                        <Badge variant="outline" className={statusClass[module.status] || ""}>{module.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Implemented with: {module.implementedWith}</p>
                      <p className="text-xs text-muted-foreground mt-1">Primary endpoint: <code>{module.primaryEndpoint}</code></p>
                      {module.status !== "completed" && module.pendingReason ? (
                        <p className="text-xs text-amber-300 mt-1">Pending: {module.pendingReason}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <p className="text-xs text-muted-foreground">
        Last updated: {data?.generatedAtUtc ? new Date(data.generatedAtUtc).toLocaleString() : "-"}
      </p>
    </div>
  );
};

export default AdminArchitecture;
