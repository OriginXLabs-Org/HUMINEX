import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Lock,
  Globe,
  Activity,
  RefreshCw,
  Bell,
  Clock,
  Server,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { huminexApi, type InternalAdminAuditLogResponse, type InternalSystemLogResponse } from "@/integrations/api/client";
import { toast } from "sonner";

type ThreatEvent = {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  source: string;
  target: string;
  attempts: number;
  status: "blocked" | "monitoring" | "active";
  time: string;
};

export const AdminThreatDetection = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [auditLogs, setAuditLogs] = useState<InternalAdminAuditLogResponse[]>([]);
  const [systemLogs, setSystemLogs] = useState<InternalSystemLogResponse[]>([]);

  const loadData = async () => {
    try {
      const [audits, logs] = await Promise.all([
        huminexApi.getInternalAuditLogs(500),
        huminexApi.getInternalSystemLogs("all", 500),
      ]);
      setAuditLogs(audits || []);
      setSystemLogs(logs || []);
    } catch (error) {
      console.error("Failed to load threat data", error);
      toast.error("Failed to load threat telemetry");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const threatData = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, index) => {
      const hour = (new Date().getHours() - (23 - index) + 24) % 24;
      return {
        time: `${hour.toString().padStart(2, "0")}:00`,
        threats: 0,
        blocked: 0,
        anomalies: 0,
      };
    });

    for (const log of auditLogs) {
      const t = new Date(log.occurredAtUtc).getTime();
      if (t < oneDayAgo) continue;
      const hourOffset = Math.floor((now - t) / (60 * 60 * 1000));
      const idx = 23 - hourOffset;
      if (idx < 0 || idx > 23) continue;

      const outcome = log.outcome.toLowerCase();
      const action = log.action.toLowerCase();
      if (outcome === "failure" || outcome === "blocked" || outcome === "denied" || action.includes("auth") || action.includes("login")) {
        buckets[idx].threats += 1;
      }
      if (outcome === "blocked" || outcome === "denied") {
        buckets[idx].blocked += 1;
      }
    }

    for (const log of systemLogs) {
      const t = new Date(log.createdAtUtc).getTime();
      if (t < oneDayAgo) continue;
      const hourOffset = Math.floor((now - t) / (60 * 60 * 1000));
      const idx = 23 - hourOffset;
      if (idx < 0 || idx > 23) continue;

      if (log.level === "warning") buckets[idx].anomalies += 1;
      if (log.level === "error") {
        buckets[idx].threats += 1;
        buckets[idx].anomalies += 1;
      }
    }

    return buckets;
  }, [auditLogs, systemLogs, now, oneDayAgo]);

  const activeThreats = useMemo<ThreatEvent[]>(() => {
    const rows = auditLogs
      .filter((log) => {
        const outcome = log.outcome.toLowerCase();
        const action = log.action.toLowerCase();
        return outcome === "failure" || outcome === "blocked" || action.includes("auth") || action.includes("login") || action.includes("delete");
      })
      .slice(0, 12)
      .map((log, idx) => {
        const outcome = log.outcome.toLowerCase();
        const severity: ThreatEvent["severity"] = outcome === "failure"
          ? "high"
          : outcome === "blocked"
            ? "medium"
            : "low";

        const status: ThreatEvent["status"] = outcome === "blocked" ? "blocked" : outcome === "failure" ? "monitoring" : "active";

        return {
          id: log.id,
          type: log.action,
          severity,
          source: log.actorEmail || "unknown",
          target: `${log.resourceType}:${log.resourceId}`,
          attempts: 1,
          status,
          time: new Date(log.occurredAtUtc).toLocaleString(),
        };
      });

    return rows;
  }, [auditLogs]);

  const securityAlerts = useMemo(() => {
    return systemLogs
      .filter((log) => log.level === "warning" || log.level === "error")
      .slice(0, 10)
      .map((log) => ({
        id: log.id,
        title: log.message,
        severity: log.level === "error" ? "critical" : "warning",
        time: new Date(log.createdAtUtc).toLocaleString(),
      }));
  }, [systemLogs]);

  const sourceBreakdown = useMemo(() => {
    const sourceMap = new Map<string, number>();
    for (const log of auditLogs) {
      const key = log.actorEmail || "unknown";
      sourceMap.set(key, (sourceMap.get(key) ?? 0) + 1);
    }
    return Array.from(sourceMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [auditLogs]);

  const activeThreatCount = activeThreats.filter((x) => x.status === "active" || x.status === "monitoring").length;
  const blockedToday = auditLogs.filter((x) => {
    const outcome = x.outcome.toLowerCase();
    return (outcome === "blocked" || outcome === "denied") && new Date(x.occurredAtUtc).getTime() >= oneDayAgo;
  }).length;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "high": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "low": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "warning": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      default: return "bg-gray-500/10 text-gray-500";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "blocked": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "monitoring": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "active": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-gray-500/10 text-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-red-500/10">
            <Shield className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Threat Detection</h1>
            <p className="text-muted-foreground">Backend security telemetry from audit and system logs</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-green-500/20 text-green-500 px-3 py-1">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Live Monitoring
          </Badge>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-500 mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-medium">Active Threats</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{activeThreatCount}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-500 mb-2">
              <Lock className="w-4 h-4" />
              <span className="text-xs font-medium">Blocked (24h)</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{blockedToday}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-yellow-500 mb-2">
              <Eye className="w-4 h-4" />
              <span className="text-xs font-medium">Under Watch</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{securityAlerts.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-500 mb-2">
              <Globe className="w-4 h-4" />
              <span className="text-xs font-medium">Top Sources</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{sourceBreakdown.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Threat Activity (24h)</CardTitle>
          <CardDescription>Derived from backend logs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={threatData}>
                <defs>
                  <linearGradient id="threatGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="blockedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(190, 15%, 20%)" />
                <XAxis dataKey="time" stroke="hsl(190, 30%, 40%)" fontSize={10} />
                <YAxis stroke="hsl(190, 30%, 40%)" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(190, 40%, 12%)",
                    border: "1px solid hsl(190, 25%, 22%)",
                    borderRadius: "8px",
                  }}
                />
                <Area type="monotone" dataKey="threats" name="Threats" stroke="hsl(0, 84%, 60%)" fill="url(#threatGradient)" />
                <Area type="monotone" dataKey="blocked" name="Blocked" stroke="hsl(160, 84%, 39%)" fill="url(#blockedGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Recent Threat Events
            </CardTitle>
            <CardDescription>Latest suspicious backend events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
            {activeThreats.length === 0 ? (
              <p className="text-sm text-muted-foreground">No threat events in current window</p>
            ) : (
              activeThreats.map((threat) => (
                <div key={threat.id} className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getSeverityColor(threat.severity)}>{threat.severity}</Badge>
                      <span className="font-medium">{threat.type}</span>
                    </div>
                    <Badge className={getStatusColor(threat.status)}>{threat.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {threat.source}
                    </div>
                    <div className="flex items-center gap-1">
                      <Server className="w-3 h-3" />
                      {threat.target}
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      {threat.attempts} attempts
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {threat.time}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-yellow-500" />
              Security Alerts
            </CardTitle>
            <CardDescription>Warnings and errors from system logs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
            {securityAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No warning/error alerts found</p>
            ) : (
              securityAlerts.map((alert) => (
                <div key={alert.id} className="p-4 rounded-lg bg-muted/50 border-l-4 border-yellow-500">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-sm">{alert.title}</p>
                    <Badge className={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{alert.time}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-red-500" />
            Top Event Sources
          </CardTitle>
          <CardDescription>Most active actor sources from audit logs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            {sourceBreakdown.map((source) => (
              <div key={source.source} className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium truncate max-w-[70%]">{source.source}</span>
                  <Badge className="bg-red-500/20 text-red-500">SRC</Badge>
                </div>
                <p className="text-2xl font-bold text-foreground">{source.count.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">events</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminThreatDetection;
