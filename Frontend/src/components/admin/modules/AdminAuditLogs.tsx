import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { huminexApi } from "@/integrations/api/client";
import { RefreshCw, Search, Activity, User, FileText, Settings, Loader2 } from "lucide-react";

type AuditLog = {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

const LOCAL_BYPASS_ENABLED =
  import.meta.env.DEV === true &&
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname) &&
  String(import.meta.env.VITE_ENABLE_LOCAL_INTERNAL_ADMIN_BYPASS ?? "true").toLowerCase() !== "false";

function getActionIcon(action: string) {
  const normalized = action.toLowerCase();
  if (normalized.includes("user") || normalized.includes("profile")) return User;
  if (normalized.includes("quote") || normalized.includes("invoice")) return FileText;
  if (normalized.includes("setting")) return Settings;
  return Activity;
}

function getActionColor(action: string) {
  const normalized = action.toLowerCase();
  if (normalized.includes("create") || normalized.includes("approve") || normalized.includes("success")) {
    return "bg-emerald-100 text-emerald-800";
  }
  if (normalized.includes("update") || normalized.includes("edit")) {
    return "bg-blue-100 text-blue-800";
  }
  if (normalized.includes("delete") || normalized.includes("reject") || normalized.includes("failure") || normalized.includes("blocked")) {
    return "bg-red-100 text-red-800";
  }
  return "bg-slate-100 text-slate-800";
}

async function fetchAuditLogs(): Promise<AuditLog[]> {
  if (LOCAL_BYPASS_ENABLED) {
    try {
      const raw = localStorage.getItem("huminex_admin_auth_audit");
      const entries = raw ? (JSON.parse(raw) as Array<{ timestamp: string; status: string; reason: string; portal: string }>) : [];
      return entries
        .slice(-100)
        .reverse()
        .map((entry, index) => ({
          id: `local-${index}-${entry.timestamp}`,
          user_id: "local-admin",
          action: `admin_auth_${entry.status}`,
          entity_type: entry.portal || "internal_admin",
          entity_id: "/admin/login",
          old_values: null,
          new_values: { reason: entry.reason },
          ip_address: null,
          created_at: entry.timestamp,
        }));
    } catch {
      return [];
    }
  }

  const logs = await huminexApi.getInternalAuditLogs(100);
  return logs.map((log) => ({
    id: log.id,
    user_id: log.actorUserId,
    action: log.action,
    entity_type: log.resourceType,
    entity_id: log.resourceId,
    old_values: null,
    new_values: log.metadataJson ? { metadataJson: log.metadataJson, outcome: log.outcome, actorEmail: log.actorEmail } : null,
    ip_address: null,
    created_at: log.occurredAtUtc,
  }));
}

export const AdminAuditLogs = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: logs = [],
    isLoading: loading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["internal-admin-audit-logs"],
    queryFn: fetchAuditLogs,
    refetchInterval: 10000,
    refetchOnWindowFocus: false,
  });

  const filteredLogs = useMemo(
    () =>
      logs.filter((log) =>
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.entity_type.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [logs, searchQuery]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground">Track internal admin and platform activities</p>
        </div>
        <Button onClick={() => refetch()} disabled={loading || isFetching} variant="outline" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading || isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline">{filteredLogs.length} entries</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit logs found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => {
                const Icon = getActionIcon(log.action);
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getActionColor(log.action)}>{log.action}</Badge>
                        <span className="text-sm text-muted-foreground">{log.entity_type}</span>
                        {log.entity_id && (
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{log.entity_id.slice(0, 24)}</code>
                        )}
                      </div>
                      {log.new_values && Object.keys(log.new_values).length > 0 && (
                        <pre className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.new_values, null, 2)}
                        </pre>
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
                      <p>{new Date(log.created_at).toLocaleDateString()}</p>
                      <p>{new Date(log.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
