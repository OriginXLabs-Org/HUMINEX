import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { huminexApi } from "@/integrations/api/client";
import { RefreshCw, Search, Terminal, AlertCircle, AlertTriangle, Info, Bug, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SystemLog = {
  id: string;
  level: string;
  source: string;
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const LOCAL_BYPASS_ENABLED =
  import.meta.env.DEV === true &&
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname) &&
  String(import.meta.env.VITE_ENABLE_LOCAL_INTERNAL_ADMIN_BYPASS ?? "true").toLowerCase() !== "false";

const levelIcons: Record<string, any> = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  debug: Bug,
};

const levelColors: Record<string, string> = {
  info: "bg-blue-100 text-blue-800",
  warning: "bg-amber-100 text-amber-800",
  error: "bg-red-100 text-red-800",
  debug: "bg-slate-100 text-slate-800",
};

async function fetchSystemLogs(levelFilter: string): Promise<SystemLog[]> {
  if (LOCAL_BYPASS_ENABLED) {
    try {
      const raw = localStorage.getItem("huminex_admin_auth_audit");
      const entries = raw ? (JSON.parse(raw) as Array<{ timestamp: string; status: string; reason: string; portal: string }>) : [];
      return entries
        .slice(-200)
        .reverse()
        .map((entry, index) => ({
          id: `local-system-${index}-${entry.timestamp}`,
          level: entry.status === "failure" ? "error" : entry.status === "blocked" ? "warning" : "info",
          source: entry.portal || "internal_admin",
          message: `admin_auth_${entry.status}: ${entry.reason}`,
          metadata: { localBypass: true },
          created_at: entry.timestamp,
        }));
    } catch {
      return [];
    }
  }

  const logs = await huminexApi.getInternalSystemLogs(levelFilter, 200);
  return logs.map((log) => {
    let metadata: Record<string, unknown> | null = null;
    try {
      metadata = log.metadataJson ? (JSON.parse(log.metadataJson) as Record<string, unknown>) : null;
    } catch {
      metadata = { raw: log.metadataJson };
    }

    return {
      id: log.id,
      level: log.level,
      source: log.source,
      message: log.message,
      metadata,
      created_at: log.createdAtUtc,
    };
  });
}

export const AdminSystemLogs = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");

  const {
    data: logs = [],
    isLoading: loading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["internal-admin-system-logs", levelFilter],
    queryFn: () => fetchSystemLogs(levelFilter),
    refetchInterval: 10000,
    refetchOnWindowFocus: false,
  });

  const filteredLogs = useMemo(
    () =>
      logs.filter(
        (log) =>
          log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.source.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [logs, searchQuery]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">System Logs</h1>
          <p className="text-muted-foreground">Internal admin event stream and system-level logs</p>
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
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
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
              <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No system logs found</p>
            </div>
          ) : (
            <div className="font-mono text-sm space-y-1 max-h-[600px] overflow-auto">
              {filteredLogs.map((log) => {
                const Icon = levelIcons[log.level] || Info;
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                    <Badge className={`${levelColors[log.level] || levelColors.info} text-xs px-1.5`}>
                      {log.level.toUpperCase()}
                    </Badge>
                    <span className="text-cyan-600 whitespace-nowrap flex items-center gap-1">
                      <Icon className="h-3.5 w-3.5" />[{log.source}]
                    </span>
                    <span className="flex-1 break-all">{log.message}</span>
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
