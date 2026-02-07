import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  DollarSign,
  Play,
  Eye,
  Download,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Users,
  TrendingUp,
  ChevronRight,
  Plus,
  Settings,
  ArrowUpRight,
  Mail,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { RunPayrollModal } from "@/components/tenant/modals/RunPayrollModal";
import { toast } from "sonner";
import { huminexApi, type EmployeeDto, type PayrollRunDto } from "@/integrations/api/client";

const fallbackPayrollRuns = [
  { id: 1, month: "January 2026", status: "draft", employees: 184, gross: 1850000, net: 1620000, runDate: null },
  { id: 2, month: "December 2025", status: "complete", employees: 182, gross: 1820000, net: 1598000, runDate: "2025-12-31" },
  { id: 3, month: "November 2025", status: "complete", employees: 180, gross: 1790000, net: 1570000, runDate: "2025-11-30" },
  { id: 4, month: "October 2025", status: "complete", employees: 178, gross: 1760000, net: 1545000, runDate: "2025-10-31" },
];

const salaryComponents = [
  { name: "Basic Salary", type: "earning", percent: 50 },
  { name: "HRA", type: "earning", percent: 25 },
  { name: "Special Allowance", type: "earning", percent: 15 },
  { name: "Conveyance", type: "earning", fixed: 1600 },
  { name: "PF (Employee)", type: "deduction", percent: 12 },
  { name: "Professional Tax", type: "deduction", fixed: 200 },
  { name: "TDS", type: "deduction", variable: true },
];

const fallbackEmployeeDirectory = [
  { id: 1, name: "Sarah Johnson", role: "Engineering Manager", email: "sarah.j@acme.com" },
  { id: 2, name: "John Smith", role: "Senior Developer", email: "john.s@acme.com" },
  { id: 3, name: "Mike Chen", role: "Product Manager", email: "mike.c@acme.com" },
  { id: 4, name: "Emily Davis", role: "UX Designer", email: "emily.d@acme.com" },
  { id: 5, name: "Alex Wilson", role: "Sales Executive", email: "alex.w@acme.com" },
  { id: 6, name: "Priya Sharma", role: "HR Manager", email: "priya.s@acme.com" },
  { id: 7, name: "Robert Brown", role: "Contractor", email: "robert.b@acme.com" },
  { id: 8, name: "Lisa Wang", role: "Finance Lead", email: "lisa.w@acme.com" },
];

type PayrollRunView = {
  id: string;
  month: string;
  status: string;
  employees: number;
  gross: number;
  net: number;
  runDate: string | null;
  period: string;
};

const formatPeriodLabel = (period: string): string => {
  const [year, month] = period.split("-");
  const monthNumber = Number(month);
  if (!year || Number.isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12) return period;
  return new Date(Number(year), monthNumber - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
};

const toPeriod = (month: string, year: string): string => {
  const monthDate = new Date(`${month} 1, ${year}`);
  const monthIndex = monthDate.getMonth() + 1;
  return `${year}-${String(monthIndex).padStart(2, "0")}`;
};

const TenantPayroll: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [showRunPayroll, setShowRunPayroll] = useState(false);
  const [selectedRun, setSelectedRun] = useState<PayrollRunView | null>(null);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRunView[]>(() =>
    fallbackPayrollRuns.map((run) => ({
      id: String(run.id),
      month: run.month,
      status: run.status,
      employees: run.employees,
      gross: run.gross,
      net: run.net,
      runDate: run.runDate,
      period: toPeriod(run.month.split(" ").slice(0, -1).join(" "), run.month.split(" ").slice(-1)[0]),
    }))
  );
  const [employeeDirectory, setEmployeeDirectory] = useState<Array<{ id: string; name: string; role: string; email: string }>>(
    fallbackEmployeeDirectory.map((emp) => ({ ...emp, id: String(emp.id) }))
  );
  const [isApiConnected, setIsApiConnected] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "complete":
        return { color: "#0FB07A", bg: "#0FB07A", icon: CheckCircle, label: "Complete" };
      case "processing":
        return { color: "#FFB020", bg: "#FFB020", icon: Clock, label: "Processing" };
      case "draft":
        return { color: "#6B7280", bg: "#6B7280", icon: FileText, label: "Draft" };
      default:
        return { color: "#6B7280", bg: "#6B7280", icon: FileText, label: status };
    }
  };

  const handleViewRun = (run: PayrollRunView) => {
    toast.info(`Opening payroll details for ${run.month}`);
    setSelectedRun(run);
  };

  const handleSettings = () => {
    toast.info("Opening payroll settings...");
  };

  const handleFileNow = (title: string) => {
    toast.success(`Filing ${title}...`);
  };

  const preselectedEmployeeId = searchParams.get("employeeId") || "";
  const preselectedMonth = searchParams.get("month");
  const preselectedYear = searchParams.get("year");

  const focusedEmployee = useMemo(
    () => employeeDirectory.find((employee) => employee.id === preselectedEmployeeId),
    [employeeDirectory, preselectedEmployeeId]
  );

  const preselectedRun = useMemo(() => {
    if (!preselectedMonth || !preselectedYear) return null;
    const period = toPeriod(preselectedMonth, preselectedYear);
    return (
      payrollRuns.find((run) => run.period === period) ??
      null
    );
  }, [payrollRuns, preselectedMonth, preselectedYear]);

  useEffect(() => {
    let mounted = true;
    const fetchPayrollAndEmployees = async () => {
      try {
        const [runs, employeePage] = await Promise.all([
          huminexApi.getPayrollRuns(),
          huminexApi.getEmployees(1, 500),
        ]);

        if (!mounted) return;

        const mappedRuns: PayrollRunView[] = runs.map((run: PayrollRunDto) => ({
          id: run.runId,
          month: formatPeriodLabel(run.period),
          status: run.status,
          employees: run.employees,
          gross: run.gross,
          net: run.net,
          runDate: null,
          period: run.period,
        }));

        const mappedEmployees = employeePage.page.items.map((emp: EmployeeDto) => ({
          id: emp.employeeId,
          name: emp.name,
          role: emp.role,
          email: emp.email,
        }));

        if (mappedRuns.length > 0) {
          setPayrollRuns(mappedRuns);
        }
        if (mappedEmployees.length > 0) {
          setEmployeeDirectory(mappedEmployees);
        }
        setIsApiConnected(true);
      } catch (error) {
        console.error("Failed to load payroll from API:", error);
        setIsApiConnected(false);
      }
    };

    fetchPayrollAndEmployees();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (preselectedRun) {
      setSelectedRun(preselectedRun);
    }
  }, [preselectedRun]);

  const currentRun = selectedRun ?? preselectedRun ?? payrollRuns[0];

  const sendPayslipEmailForFocus = async () => {
    if (!focusedEmployee) return;
    try {
      await huminexApi.emailEmployeePayslip(
        focusedEmployee.id,
        currentRun.period,
        crypto.randomUUID()
      );
      toast.success(`Payslip email triggered for ${focusedEmployee.name} (${currentRun.month})`);
    } catch (error) {
      console.error("Failed to send payslip email:", error);
      toast.error("Payslip email API call failed.");
    }
  };

  const buildFocusedPayrollDeepLink = () => {
    if (!focusedEmployee) return "";
    const tokens = currentRun.month.trim().split(" ");
    const year = tokens[tokens.length - 1];
    const month = tokens.slice(0, -1).join(" ") || currentRun.month;
    const params = new URLSearchParams({
      employeeId: String(focusedEmployee.id),
      month: month || currentRun.month,
      year,
    });
    return `${window.location.origin}/tenant/payroll?${params.toString()}`;
  };

  const copyFocusedPayrollDeepLink = async () => {
    if (!focusedEmployee) return;
    const deepLink = buildFocusedPayrollDeepLink();
    if (!deepLink) return;
    try {
      await navigator.clipboard.writeText(deepLink);
      toast.success("Payroll deep link copied.");
    } catch {
      toast.error("Unable to copy deep link. Please copy it manually.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1E3A]">Payroll</h1>
          <p className="text-sm text-[#6B7280]">
            Manage payroll runs, salary components, and compliance
            <span className="ml-2 text-xs">{isApiConnected ? "• Live API" : "• Demo fallback"}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="border-gray-200 text-[#6B7280] gap-2 hover:border-[#005EEB]/30 hover-lift"
            onClick={handleSettings}
          >
            <Settings className="w-4 h-4" /> Settings
          </Button>
          <Button
            className="bg-gradient-to-r from-[#E23E57] to-[#D63150] hover:from-[#D63150] hover:to-[#C02848] gap-2 shadow-lg shadow-[#E23E57]/30"
            onClick={() => setShowRunPayroll(true)}
          >
            <Play className="w-4 h-4" /> Run Payroll
          </Button>
        </div>
      </div>

      {focusedEmployee && (
        <div className="bg-white rounded-2xl border border-[#005EEB]/20 p-4" style={{ boxShadow: "0 6px 18px rgba(16,24,40,0.06)" }}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#005EEB] font-semibold">Focused Employee Payroll View</p>
              <h3 className="text-lg font-semibold text-[#0F1E3A]">{focusedEmployee.name}</h3>
              <p className="text-sm text-[#6B7280]">
                {focusedEmployee.role} • {focusedEmployee.email}
              </p>
              <p className="text-sm text-[#0F1E3A] mt-1">
                Preselected period: <span className="font-semibold">{currentRun.month}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-gray-200 text-[#0F1E3A]"
                onClick={copyFocusedPayrollDeepLink}
              >
                <Copy className="w-4 h-4 mr-1.5" />
                Copy Deep Link
              </Button>
              <Button
                variant="outline"
                className="border-gray-200 text-[#0F1E3A]"
                onClick={() => toast.success(`Payslip downloaded for ${focusedEmployee.name} (${currentRun.month})`)}
              >
                <Download className="w-4 h-4 mr-1.5" />
                Download Payslip
              </Button>
              <Button className="bg-[#005EEB] hover:bg-[#004ACC]" onClick={sendPayslipEmailForFocus}>
                <Mail className="w-4 h-4 mr-1.5" />
                Send Payslip Email
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Current Cycle Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all" style={{ boxShadow: "0 6px 18px rgba(16,24,40,0.06)" }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm text-[#6B7280]">Current Payroll Cycle</p>
            <h2 className="text-xl font-bold text-[#0F1E3A]">{currentRun.month}</h2>
          </div>
          <Badge
            variant="outline"
            className="capitalize px-3 py-1.5 bg-[#6B7280]/10 text-[#6B7280] border-[#6B7280]/20"
          >
            <FileText className="w-3 h-3 mr-1" />
            {getStatusConfig(currentRun.status).label}
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Employees", value: currentRun.employees, icon: Users, color: "#005EEB" },
            { label: "Gross Payroll", value: formatCurrency(currentRun.gross), icon: TrendingUp, color: "#0FB07A" },
            { label: "Net Payout", value: formatCurrency(currentRun.net), icon: DollarSign, color: "#00C2FF" },
            { label: "Pending Actions", value: "12", icon: AlertTriangle, color: "#FFB020", alert: true },
          ].map((stat) => (
            <button
              key={stat.label}
              onClick={() => toast.info(`${stat.label}: ${stat.value}`)}
              className={cn(
                "p-4 rounded-xl text-left transition-all hover-lift",
                stat.alert ? "bg-gradient-to-br from-[#FFB020]/15 to-[#FFB020]/5" : "bg-[#F7F9FC]"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                <span className="text-sm text-[#6B7280]">{stat.label}</span>
              </div>
              <p className={cn(
                "text-2xl font-bold",
                stat.alert ? "text-[#FFB020]" : "text-[#0F1E3A]"
              )}>
                {stat.value}
              </p>
            </button>
          ))}
        </div>

        {/* Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#6B7280]">Payroll Progress</span>
            <span className="font-semibold text-[#005EEB]">2 of 4 steps complete</span>
          </div>
          <Progress value={50} className="h-2.5" />
          <div className="flex justify-between mt-4">
            {["Collect Data", "Review", "Approve", "Disburse"].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                    i < 2 
                      ? "bg-gradient-to-br from-[#0FB07A] to-[#00C2FF] text-white shadow-lg shadow-[#0FB07A]/30" 
                      : "bg-[#F7F9FC] text-[#6B7280]"
                  )}
                >
                  {i < 2 ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className={cn("text-xs font-medium", i < 2 ? "text-[#0F1E3A]" : "text-[#6B7280]")}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="runs">
        <TabsList className="bg-[#F7F9FC]">
          <TabsTrigger value="runs">Payroll Runs</TabsTrigger>
          <TabsTrigger value="components">Salary Components</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="runs" className="mt-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ boxShadow: "0 6px 18px rgba(16,24,40,0.06)" }}>
            <table className="w-full">
              <thead className="bg-[#F7F9FC] border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Month</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Employees</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Gross</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Net</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Run Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payrollRuns.map((run) => {
                  const statusConfig = getStatusConfig(run.status);
                  return (
                    <tr key={run.id} className="hover:bg-[#F7F9FC] transition-colors">
                      <td className="px-4 py-4 font-medium text-[#0F1E3A]">{run.month}</td>
                      <td className="px-4 py-4 text-[#6B7280]">{run.employees}</td>
                      <td className="px-4 py-4 text-[#0F1E3A]">{formatCurrency(run.gross)}</td>
                      <td className="px-4 py-4 text-[#0FB07A] font-medium">{formatCurrency(run.net)}</td>
                      <td className="px-4 py-4">
                        <Badge
                          variant="outline"
                          className={`bg-[${statusConfig.bg}]/10 text-[${statusConfig.color}] border-[${statusConfig.color}]/20 capitalize`}
                        >
                          {statusConfig.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-[#6B7280]">{run.runDate || "—"}</td>
                      <td className="px-4 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-[#005EEB] gap-1 group"
                          onClick={() => handleViewRun(run)}
                        >
                          View 
                          <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="components" className="mt-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6" style={{ boxShadow: "0 6px 18px rgba(16,24,40,0.06)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#0F1E3A]">Salary Structure</h3>
              <Button size="sm" variant="outline" className="gap-1">
                <Plus className="w-4 h-4" /> Add Component
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-[#0FB07A] mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Earnings
                </h4>
                <div className="space-y-2">
                  {salaryComponents
                    .filter((c) => c.type === "earning")
                    .map((comp) => (
                      <div key={comp.name} className="flex items-center justify-between p-3 bg-[#F7F9FC] rounded-lg">
                        <span className="text-sm text-[#0F1E3A]">{comp.name}</span>
                        <span className="text-sm font-medium text-[#0FB07A]">
                          {comp.percent ? `${comp.percent}%` : formatCurrency(comp.fixed || 0)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-[#E23E57] mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Deductions
                </h4>
                <div className="space-y-2">
                  {salaryComponents
                    .filter((c) => c.type === "deduction")
                    .map((comp) => (
                      <div key={comp.name} className="flex items-center justify-between p-3 bg-[#F7F9FC] rounded-lg">
                        <span className="text-sm text-[#0F1E3A]">{comp.name}</span>
                        <span className="text-sm font-medium text-[#E23E57]">
                          {comp.percent ? `${comp.percent}%` : comp.variable ? "Variable" : formatCurrency(comp.fixed || 0)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { title: "PF Filing", deadline: "Feb 15, 2026", status: "pending" },
              { title: "ESI Filing", deadline: "Feb 21, 2026", status: "pending" },
              { title: "TDS Payment", deadline: "Feb 7, 2026", status: "complete" },
              { title: "Form 24Q", deadline: "Jan 31, 2026", status: "complete" },
              { title: "PT Filing", deadline: "Feb 28, 2026", status: "pending" },
              { title: "Gratuity Report", deadline: "Mar 31, 2026", status: "upcoming" },
            ].map((item) => (
              <div
                key={item.title}
                className="p-4 bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow"
                style={{ boxShadow: "0 6px 18px rgba(16,24,40,0.06)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-[#0F1E3A]">{item.title}</h4>
                  {item.status === "complete" ? (
                    <CheckCircle className="w-5 h-5 text-[#0FB07A]" />
                  ) : item.status === "pending" ? (
                    <Clock className="w-5 h-5 text-[#FFB020]" />
                  ) : (
                    <Calendar className="w-5 h-5 text-[#6B7280]" />
                  )}
                </div>
                <p className="text-sm text-[#6B7280]">Due: {item.deadline}</p>
                {item.status === "pending" && (
                  <Button 
                    size="sm" 
                    className="w-full mt-3 bg-[#005EEB] hover:bg-[#004ACC] shadow-lg shadow-[#005EEB]/20"
                    onClick={() => handleFileNow(item.title)}
                  >
                    File Now
                  </Button>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <RunPayrollModal open={showRunPayroll} onOpenChange={setShowRunPayroll} />
    </div>
  );
};

export default TenantPayroll;
