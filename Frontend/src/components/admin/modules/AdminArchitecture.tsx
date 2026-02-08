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
};

function moduleStatusIcon(status: string) {
  if (status === "completed") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
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
