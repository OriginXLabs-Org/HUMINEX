import { useQuery } from "@tanstack/react-query";
import { huminexApi } from "@/integrations/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Brain, Clock, MessageSquare, Target, Workflow, RefreshCw } from "lucide-react";

const statusBadgeClass: Record<string, string> = {
  active: "bg-green-500/10 text-green-600 border-green-500/20",
  paused: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  success: "bg-green-500/10 text-green-600 border-green-500/20",
  failed: "bg-red-500/10 text-red-600 border-red-500/20",
  error: "bg-red-500/10 text-red-600 border-red-500/20",
};

export const AdminAIDashboard = () => {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["internal-admin-ai-dashboard"],
    queryFn: () => huminexApi.getInternalAiDashboard(500),
    staleTime: 15000,
    refetchOnWindowFocus: false,
  });

  const metrics = {
    totalQueries: data?.totalQueries ?? 0,
    successRate: data && data.totalQueries > 0
      ? ((data.successfulQueries * 100) / data.totalQueries).toFixed(1)
      : "0.0",
    avgResponse: data?.avgResponseTimeSeconds ?? 0,
    activeWorkflows: data?.activeWorkflows ?? 0,
    estimatedSavings: data?.estimatedCostSavings ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI & Automation</h1>
          <p className="text-muted-foreground">Live operational intelligence for AI and OpenHuman activities</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading || isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Queries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalQueries.toLocaleString()}</div>
            <MessageSquare className="mt-2 h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.successRate}%</div>
            <Target className="mt-2 h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Avg Response</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgResponse}s</div>
            <Clock className="mt-2 h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active Workflows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeWorkflows}</div>
            <Workflow className="mt-2 h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Estimated Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${metrics.estimatedSavings.toLocaleString()}</div>
            <Brain className="mt-2 h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI Workflows</CardTitle>
          <CardDescription>Aggregated from internal audit activity</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead>Total Runs</TableHead>
                <TableHead>Success %</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Run</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.workflows ?? []).map((workflow) => (
                <TableRow key={workflow.id}>
                  <TableCell className="font-medium">{workflow.name}</TableCell>
                  <TableCell>{workflow.totalRuns}</TableCell>
                  <TableCell>{workflow.successRatePercent}%</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusBadgeClass[workflow.status] ?? ""}>
                      {workflow.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(workflow.lastRunAtUtc).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {(!data || data.workflows.length === 0) && !isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No AI workflow activity found yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent AI Activity</CardTitle>
          <CardDescription>Latest AI/OpenHuman events with status and latency</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.recentActivity ?? []).map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>
                    <div className="font-medium">{activity.kind}</div>
                    <div className="text-xs text-muted-foreground">{activity.message}</div>
                  </TableCell>
                  <TableCell>{activity.actorEmail}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusBadgeClass[activity.status] ?? ""}>
                      {activity.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{activity.latencyMs ? `${activity.latencyMs.toFixed(0)} ms` : "-"}</TableCell>
                  <TableCell>{new Date(activity.occurredAtUtc).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {(!data || data.recentActivity.length === 0) && !isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No AI activity logs available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAIDashboard;
