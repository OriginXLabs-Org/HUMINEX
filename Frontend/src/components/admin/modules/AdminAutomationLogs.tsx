import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { huminexApi } from "@/integrations/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, RefreshCw, Search, Workflow, XCircle } from "lucide-react";

const statusClass: Record<string, string> = {
  active: "bg-green-500/10 text-green-600 border-green-500/20",
  paused: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  success: "bg-green-500/10 text-green-600 border-green-500/20",
  failed: "bg-red-500/10 text-red-600 border-red-500/20",
  error: "bg-red-500/10 text-red-600 border-red-500/20",
  scheduled: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

export const AdminAutomationLogs = () => {
  const [search, setSearch] = useState("");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["internal-admin-automation-logs"],
    queryFn: () => huminexApi.getInternalAutomationLogs(1000),
    staleTime: 10000,
    refetchOnWindowFocus: false,
  });

  const filteredExecutions = (data?.executions ?? []).filter((row) =>
    row.workflowName.toLowerCase().includes(search.toLowerCase())
    || row.workflowId.toLowerCase().includes(search.toLowerCase())
    || row.triggeredBy.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Automation Logs</h1>
          <p className="text-muted-foreground">Live workflow execution telemetry from backend audit trails</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading || isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{data?.activeWorkflows ?? 0}</div>
            <p className="text-sm text-muted-foreground">Active Workflows</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{data?.totalExecutions ?? 0}</div>
            <p className="text-sm text-muted-foreground">Total Executions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{data?.successfulExecutions ?? 0}</div>
            <p className="text-sm text-muted-foreground">Successful</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{data?.failedExecutions ?? 0}</div>
            <p className="text-sm text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="executions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="executions">Execution Logs</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="executions" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search execution logs..."
              className="pl-9"
            />
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Triggered By</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Started</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExecutions.map((execution) => (
                    <TableRow key={execution.id}>
                      <TableCell>
                        <div className="font-medium">{execution.workflowName}</div>
                        <div className="text-xs text-muted-foreground">{execution.workflowId}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusClass[execution.status] ?? ""}>
                          {execution.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{execution.triggeredBy}</TableCell>
                      <TableCell>{execution.durationMs ? `${execution.durationMs.toFixed(0)} ms` : "-"}</TableCell>
                      <TableCell>{new Date(execution.startedAtUtc).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {(!data || filteredExecutions.length === 0) && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No execution logs found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Health</CardTitle>
              <CardDescription>Aggregated by workflow identifier</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Runs</TableHead>
                    <TableHead>Success %</TableHead>
                    <TableHead>Avg Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Run</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.workflows ?? []).map((workflow) => (
                    <TableRow key={workflow.id}>
                      <TableCell>
                        <div className="font-medium">{workflow.name}</div>
                        <div className="text-xs text-muted-foreground">{workflow.trigger}</div>
                      </TableCell>
                      <TableCell>{workflow.totalRuns}</TableCell>
                      <TableCell>{workflow.successRatePercent}%</TableCell>
                      <TableCell>{workflow.avgDurationMs.toFixed(1)} ms</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusClass[workflow.status] ?? ""}>
                          {workflow.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(workflow.lastRunAtUtc).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Jobs</CardTitle>
              <CardDescription>System-generated schedule hints based on active workflows</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.scheduledJobs ?? []).map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.name}</TableCell>
                      <TableCell>{job.schedule}</TableCell>
                      <TableCell>{new Date(job.nextRunAtUtc).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusClass[job.status] ?? ""}>{job.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!data || data.scheduledJobs.length === 0) && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No scheduled jobs available.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {!isLoading && data && (
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2"><Workflow className="w-4 h-4" /> Live telemetry source</span>
          <span className="inline-flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Success tracked</span>
          <span className="inline-flex items-center gap-2"><XCircle className="w-4 h-4 text-red-600" /> Failures tracked</span>
        </div>
      )}
    </div>
  );
};

export default AdminAutomationLogs;
