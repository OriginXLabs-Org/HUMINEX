import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Upload,
  Download,
  MoreHorizontal,
  Mail,
  Phone,
  MapPin,
  Building,
  Edit,
  UserX,
  Eye,
  Calendar,
  Briefcase,
  Shield,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  TrendingUp,
  UserPlus,
  FileText,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { InviteEmployeeModal } from "@/components/tenant/modals/InviteEmployeeModal";
import { toast } from "sonner";

const mockEmployees = [
  { id: 1, name: "Sarah Johnson", email: "sarah.j@acme.com", phone: "+91 98765 43210", role: "Engineering Manager", department: "Engineering", location: "Bangalore", status: "active", avatar: null, joinDate: "2023-03-15" },
  { id: 2, name: "John Smith", email: "john.s@acme.com", phone: "+91 98765 43211", role: "Senior Developer", department: "Engineering", location: "Mumbai", status: "active", avatar: null, joinDate: "2022-08-20" },
  { id: 3, name: "Mike Chen", email: "mike.c@acme.com", phone: "+91 98765 43212", role: "Product Manager", department: "Product", location: "Delhi", status: "probation", avatar: null, joinDate: "2024-11-01" },
  { id: 4, name: "Emily Davis", email: "emily.d@acme.com", phone: "+91 98765 43213", role: "UX Designer", department: "Design", location: "Bangalore", status: "active", avatar: null, joinDate: "2023-06-10" },
  { id: 5, name: "Alex Wilson", email: "alex.w@acme.com", phone: "+91 98765 43214", role: "Sales Executive", department: "Sales", location: "Chennai", status: "active", avatar: null, joinDate: "2023-01-05" },
  { id: 6, name: "Priya Sharma", email: "priya.s@acme.com", phone: "+91 98765 43215", role: "HR Manager", department: "HR", location: "Bangalore", status: "active", avatar: null, joinDate: "2022-04-18" },
  { id: 7, name: "Robert Brown", email: "robert.b@acme.com", phone: "+91 98765 43216", role: "Contractor", department: "Engineering", location: "Remote", status: "contractor", avatar: null, joinDate: "2024-09-01" },
  { id: 8, name: "Lisa Wang", email: "lisa.w@acme.com", phone: "+91 98765 43217", role: "Finance Lead", department: "Finance", location: "Mumbai", status: "active", avatar: null, joinDate: "2022-11-22" },
];

type EmployeePayrollRecord = {
  periodKey: string;
  month: string;
  year: number;
  gross: number;
  deductions: number;
  net: number;
  status: "Paid" | "Processed" | "On Hold";
  payoutDate: string;
};

const payrollPeriods = [
  { month: "January", year: 2026 },
  { month: "December", year: 2025 },
  { month: "November", year: 2025 },
  { month: "October", year: 2025 },
  { month: "September", year: 2025 },
];

const getPayrollHistoryForEmployee = (employeeId: number): EmployeePayrollRecord[] =>
  payrollPeriods.map((period, index) => {
    const gross = 145000 + employeeId * 3800 - index * 2100;
    const deductions = 18000 + employeeId * 480 + index * 190;
    const net = gross - deductions;
    return {
      periodKey: `${period.year}-${String(index + 1).padStart(2, "0")}`,
      month: period.month,
      year: period.year,
      gross,
      deductions,
      net,
      status: index === 0 ? "Processed" : "Paid",
      payoutDate: `${String(28 - index).padStart(2, "0")} ${period.month} ${period.year}`,
    };
  });

const TenantWorkforce: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<typeof mockEmployees[0] | null>(null);
  const [selectedPayrollYear, setSelectedPayrollYear] = useState("all");
  const [selectedPayrollPeriod, setSelectedPayrollPeriod] = useState("");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-[#0FB07A]/10 text-[#0FB07A] border-[#0FB07A]/20";
      case "probation": return "bg-[#FFB020]/10 text-[#FFB020] border-[#FFB020]/20";
      case "contractor": return "bg-[#00C2FF]/10 text-[#00C2FF] border-[#00C2FF]/20";
      case "inactive": return "bg-[#6B7280]/10 text-[#6B7280] border-[#6B7280]/20";
      default: return "bg-[#6B7280]/10 text-[#6B7280] border-[#6B7280]/20";
    }
  };

  const filteredEmployees = mockEmployees.filter((emp) => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDepartment === "all" || emp.department === selectedDepartment;
    const matchesStatus = selectedStatus === "all" || emp.status === selectedStatus;
    return matchesSearch && matchesDept && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map((e) => e.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleImportCSV = () => {
    toast.info("Import CSV: Upload your employee data file to bulk import");
  };

  const handleExport = () => {
    toast.success("Generating workforce report... Download will start shortly.");
  };

  const handleBulkEdit = () => {
    toast.info(`Editing ${selectedEmployees.length} employees...`);
  };

  const handleDeactivate = () => {
    toast.error(`Deactivating ${selectedEmployees.length} employees...`);
    setSelectedEmployees([]);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const openEmployeeProfile = (employee: typeof mockEmployees[0]) => {
    setSelectedEmployee(employee);
    setSelectedPayrollYear("all");
    const firstPeriod = getPayrollHistoryForEmployee(employee.id)[0];
    setSelectedPayrollPeriod(firstPeriod?.periodKey ?? "");
  };

  const openEmployeePayroll = (employee: typeof mockEmployees[0]) => {
    const latestPeriod = getPayrollHistoryForEmployee(employee.id)[0];
    if (!latestPeriod) {
      toast.error("No payroll period available for this employee.");
      return;
    }
    const params = new URLSearchParams({
      employeeId: String(employee.id),
      month: latestPeriod.month,
      year: String(latestPeriod.year),
    });
    navigate(`/tenant/payroll?${params.toString()}`);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1E3A]">Workforce Directory</h1>
          <p className="text-sm text-[#6B7280]">
            <span className="font-medium text-[#0FB07A]">{mockEmployees.length}</span> employees in your organization
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="border-gray-200 text-[#6B7280] gap-2 hover:border-[#005EEB]/30 hover-lift"
            onClick={handleImportCSV}
          >
            <Upload className="w-4 h-4" /> Import CSV
          </Button>
          <Button 
            variant="outline" 
            className="border-gray-200 text-[#6B7280] gap-2 hover:border-[#005EEB]/30 hover-lift"
            onClick={handleExport}
          >
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button 
            className="bg-[#005EEB] hover:bg-[#004ACC] gap-2 shadow-lg shadow-[#005EEB]/20" 
            onClick={() => setShowInviteModal(true)}
          >
            <UserPlus className="w-4 h-4" /> Invite Employee
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Employees", value: mockEmployees.length, icon: Users, color: "#005EEB" },
          { label: "Active", value: mockEmployees.filter(e => e.status === "active").length, icon: TrendingUp, color: "#0FB07A" },
          { label: "On Probation", value: mockEmployees.filter(e => e.status === "probation").length, icon: Clock, color: "#FFB020" },
          { label: "Contractors", value: mockEmployees.filter(e => e.status === "contractor").length, icon: Briefcase, color: "#00C2FF" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-4 bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all hover-lift"
            style={{ boxShadow: "0 6px 18px rgba(16,24,40,0.06)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${stat.color}15` }}
              >
                <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#0F1E3A]">{stat.value}</p>
                <p className="text-xs text-[#6B7280]">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employees by name, email, or role..."
            className="pl-10 bg-white border-gray-200"
          />
        </div>
        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger className="w-[180px] bg-white border-gray-200">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="Engineering">Engineering</SelectItem>
            <SelectItem value="Product">Product</SelectItem>
            <SelectItem value="Design">Design</SelectItem>
            <SelectItem value="Sales">Sales</SelectItem>
            <SelectItem value="HR">HR</SelectItem>
            <SelectItem value="Finance">Finance</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[150px] bg-white border-gray-200">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="probation">Probation</SelectItem>
            <SelectItem value="contractor">Contractor</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selectedEmployees.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-[#005EEB]/10 to-[#00C2FF]/5 rounded-xl border border-[#005EEB]/20 animate-scale-in">
          <span className="text-sm font-semibold text-[#005EEB]">
            {selectedEmployees.length} employee{selectedEmployees.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2 ml-auto">
            <Button 
              size="sm" 
              variant="outline" 
              className="border-[#005EEB]/30 text-[#005EEB] hover:bg-[#005EEB]/10"
              onClick={handleBulkEdit}
            >
              <Edit className="w-3 h-3 mr-1" /> Bulk Edit
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="border-[#E23E57]/30 text-[#E23E57] hover:bg-[#E23E57]/10"
              onClick={handleDeactivate}
            >
              <UserX className="w-3 h-3 mr-1" /> Deactivate
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ boxShadow: "0 6px 18px rgba(16,24,40,0.06)" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F7F9FC] border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <Checkbox
                    checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Department</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-[#F7F9FC] transition-colors">
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selectedEmployees.includes(employee.id)}
                      onCheckedChange={() => toggleSelect(employee.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={employee.avatar || undefined} />
                        <AvatarFallback className="bg-[#005EEB]/10 text-[#005EEB] font-medium">
                          {employee.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-[#0F1E3A]">{employee.name}</p>
                        <p className="text-xs text-[#6B7280]">{employee.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#0F1E3A]">{employee.role}</td>
                  <td className="px-4 py-3 text-sm text-[#6B7280]">{employee.department}</td>
                  <td className="px-4 py-3 text-sm text-[#6B7280]">{employee.location}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={cn("capitalize", getStatusColor(employee.status))}>
                      {employee.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4 text-[#6B7280]" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEmployeeProfile(employee)}>
                          <Eye className="w-4 h-4 mr-2" /> View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEmployeePayroll(employee)}>
                          <DollarSign className="w-4 h-4 mr-2" /> Payroll Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-[#E23E57]">
                          <UserX className="w-4 h-4 mr-2" /> Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-[#F7F9FC]">
          <p className="text-sm text-[#6B7280]">Showing 1-{filteredEmployees.length} of {mockEmployees.length}</p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-[#005EEB] text-white border-[#005EEB]">1</Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">2</Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Employee Detail Slide-out */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedEmployee(null)} />
          <div className="absolute right-0 top-0 bottom-0 w-[480px] bg-white shadow-2xl animate-slide-panel overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="font-semibold text-[#0F1E3A]">Employee Profile</h2>
              <Button variant="ghost" size="icon" onClick={() => setSelectedEmployee(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="p-6">
              {/* Profile Header */}
              <div className="flex items-center gap-4 mb-6">
                <Avatar className="w-20 h-20">
                  <AvatarFallback className="bg-[#005EEB]/10 text-[#005EEB] text-2xl font-semibold">
                    {selectedEmployee.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold text-[#0F1E3A]">{selectedEmployee.name}</h3>
                  <p className="text-[#6B7280]">{selectedEmployee.role}</p>
                  <Badge variant="outline" className={cn("mt-2 capitalize", getStatusColor(selectedEmployee.status))}>
                    {selectedEmployee.status}
                  </Badge>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 p-3 bg-[#F7F9FC] rounded-lg">
                  <Mail className="w-5 h-5 text-[#6B7280]" />
                  <span className="text-sm text-[#0F1E3A]">{selectedEmployee.email}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-[#F7F9FC] rounded-lg">
                  <Phone className="w-5 h-5 text-[#6B7280]" />
                  <span className="text-sm text-[#0F1E3A]">{selectedEmployee.phone}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-[#F7F9FC] rounded-lg">
                  <MapPin className="w-5 h-5 text-[#6B7280]" />
                  <span className="text-sm text-[#0F1E3A]">{selectedEmployee.location}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-[#F7F9FC] rounded-lg">
                  <Building className="w-5 h-5 text-[#6B7280]" />
                  <span className="text-sm text-[#0F1E3A]">{selectedEmployee.department}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-[#F7F9FC] rounded-lg">
                  <Calendar className="w-5 h-5 text-[#6B7280]" />
                  <span className="text-sm text-[#0F1E3A]">Joined {selectedEmployee.joinDate}</span>
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="employment">
                <TabsList className="w-full bg-[#F7F9FC]">
                  <TabsTrigger value="employment" className="flex-1">Employment</TabsTrigger>
                  <TabsTrigger value="documents" className="flex-1">Documents</TabsTrigger>
                  <TabsTrigger value="payroll" className="flex-1">Payroll</TabsTrigger>
                </TabsList>
                <TabsContent value="employment" className="mt-4 space-y-3">
                  <div className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="w-4 h-4 text-[#005EEB]" />
                      <span className="text-sm font-medium text-[#0F1E3A]">Current Position</span>
                    </div>
                    <p className="text-sm text-[#6B7280]">{selectedEmployee.role}</p>
                  </div>
                  <div className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-[#0FB07A]" />
                      <span className="text-sm font-medium text-[#0F1E3A]">BGV Status</span>
                    </div>
                    <Badge className="bg-[#0FB07A]/10 text-[#0FB07A] border-[#0FB07A]/20">Verified</Badge>
                  </div>
                  <div className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-[#FFB020]" />
                      <span className="text-sm font-medium text-[#0F1E3A]">Last Performance Review</span>
                    </div>
                    <p className="text-sm text-[#6B7280]">December 2024 - Rating: 4.2/5</p>
                  </div>
                </TabsContent>
                <TabsContent value="documents" className="mt-4">
                  <div className="space-y-2">
                    {["Offer Letter.pdf", "ID Proof.pdf", "Address Proof.pdf"].map((doc) => (
                      <div key={doc} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#6B7280]" />
                          <span className="text-sm text-[#0F1E3A]">{doc}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="text-[#005EEB]">View</Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="payroll" className="mt-4 space-y-3">
                  {(() => {
                    const payrollHistory = getPayrollHistoryForEmployee(selectedEmployee.id);
                    const payrollYears = Array.from(new Set(payrollHistory.map((item) => String(item.year))));
                    const filteredHistory =
                      selectedPayrollYear === "all"
                        ? payrollHistory
                        : payrollHistory.filter((item) => String(item.year) === selectedPayrollYear);
                    const selectedRecord =
                      payrollHistory.find((item) => item.periodKey === selectedPayrollPeriod) ?? filteredHistory[0];

                    const triggerPayslipEmail = (record: EmployeePayrollRecord) => {
                      toast.success(
                        `Payslip email triggered for ${selectedEmployee.name} (${record.month} ${record.year})`
                      );
                    };

                    return (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <Select
                            value={selectedPayrollYear}
                            onValueChange={(value) => {
                              setSelectedPayrollYear(value);
                              const nextRecord =
                                value === "all"
                                  ? payrollHistory[0]
                                  : payrollHistory.find((item) => String(item.year) === value);
                              if (nextRecord) setSelectedPayrollPeriod(nextRecord.periodKey);
                            }}
                          >
                            <SelectTrigger className="bg-white border-gray-200 h-9">
                              <SelectValue placeholder="Filter by year" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Years</SelectItem>
                              {payrollYears.map((year) => (
                                <SelectItem key={year} value={year}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={selectedPayrollPeriod} onValueChange={setSelectedPayrollPeriod}>
                            <SelectTrigger className="bg-white border-gray-200 h-9">
                              <SelectValue placeholder="Select period" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredHistory.map((record) => (
                                <SelectItem key={record.periodKey} value={record.periodKey}>
                                  {record.month} {record.year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedRecord && (
                          <div className="p-3 border border-gray-200 rounded-lg bg-[#F7F9FC]">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-semibold text-[#0F1E3A]">
                                Payroll Snapshot: {selectedRecord.month} {selectedRecord.year}
                              </p>
                              <Badge variant="outline" className="text-[#005EEB] border-[#005EEB]/30 bg-[#005EEB]/10">
                                {selectedRecord.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="p-2 rounded-md bg-white border border-gray-200">
                                <p className="text-[#6B7280]">Gross</p>
                                <p className="font-semibold text-[#0F1E3A]">{formatCurrency(selectedRecord.gross)}</p>
                              </div>
                              <div className="p-2 rounded-md bg-white border border-gray-200">
                                <p className="text-[#6B7280]">Deductions</p>
                                <p className="font-semibold text-[#E23E57]">{formatCurrency(selectedRecord.deductions)}</p>
                              </div>
                              <div className="p-2 rounded-md bg-white border border-gray-200">
                                <p className="text-[#6B7280]">Net Pay</p>
                                <p className="font-semibold text-[#0FB07A]">{formatCurrency(selectedRecord.net)}</p>
                              </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                              <Button
                                size="sm"
                                className="flex-1 bg-[#005EEB] hover:bg-[#004ACC]"
                                onClick={() => triggerPayslipEmail(selectedRecord)}
                              >
                                <Mail className="w-3.5 h-3.5 mr-1.5" />
                                Send Payslip Email
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-gray-200 text-[#0F1E3A]"
                                onClick={() =>
                                  toast.success(`Payslip downloaded for ${selectedRecord.month} ${selectedRecord.year}`)
                                }
                              >
                                <Download className="w-3.5 h-3.5 mr-1.5" />
                                Download
                              </Button>
                            </div>
                          </div>
                        )}

                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="bg-[#F7F9FC] px-3 py-2 border-b border-gray-200">
                            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                              Payroll History (Month/Year)
                            </p>
                          </div>
                          <div className="divide-y divide-gray-100">
                            {filteredHistory.map((record) => (
                              <div key={record.periodKey} className="px-3 py-2.5 flex items-center justify-between gap-2">
                                <div>
                                  <p className="text-sm font-medium text-[#0F1E3A]">
                                    {record.month} {record.year}
                                  </p>
                                  <p className="text-xs text-[#6B7280]">Payout: {record.payoutDate}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-[#0FB07A]">{formatCurrency(record.net)}</p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-[#005EEB]"
                                    onClick={() => {
                                      setSelectedPayrollPeriod(record.periodKey);
                                      triggerPayslipEmail(record);
                                    }}
                                  >
                                    Email Slip
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}

      <InviteEmployeeModal open={showInviteModal} onOpenChange={setShowInviteModal} />
    </div>
  );
};

export default TenantWorkforce;
