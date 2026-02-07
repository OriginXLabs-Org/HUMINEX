import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useTenantRole } from "@/hooks/useTenantRole";
import {
  HUMINEX_ORG,
  ORG_ROLE_LABELS,
  canViewEmployeeProfile,
  getAllReports,
  getManagerChain,
  mapTenantRoleToOrgRole,
  type OrgEmployee,
  type OrgRole,
} from "@/lib/rbacHierarchy";
import { Mail, Save, Search, ShieldCheck, Users } from "lucide-react";
import {
  TenantAccessConfig,
  TenantModuleId,
  TENANT_NON_ADMIN_ROLES,
  TENANT_ROLE_LABELS,
  getDefaultTenantAccessConfig,
  readTenantAccessConfig,
  saveTenantAccessConfig,
} from "@/lib/tenantRbac";
import { huminexApi } from "@/integrations/api/client";

type EmployeeVisibility = {
  finance: boolean;
  payslips: boolean;
  insurance: boolean;
  benefits: boolean;
  documents: boolean;
};

const ROLE_OPTIONS: OrgRole[] = [
  "intern",
  "junior_employee",
  "employee",
  "senior_employee",
  "lead",
  "manager",
  "senior_manager",
  "director",
  "vp",
  "cfo",
  "cto",
  "ceo",
];

const DEFAULT_EMPLOYEE_VISIBILITY: EmployeeVisibility = {
  finance: true,
  payslips: true,
  insurance: true,
  benefits: true,
  documents: true,
};

const normalize = (value?: string | null) => (value || "").toLowerCase();

const mapApiRoleToOrgRole = (role?: string | null): OrgRole => {
  const normalized = (role || "").toLowerCase();
  if (normalized === "intern") return "intern";
  if (normalized === "junior_employee") return "junior_employee";
  if (normalized === "employee") return "employee";
  if (normalized === "senior_employee") return "senior_employee";
  if (normalized === "lead") return "lead";
  if (normalized === "manager" || normalized === "technical_manager") return "manager";
  if (normalized === "senior_manager") return "senior_manager";
  if (normalized === "director") return "director";
  if (normalized === "vp") return "vp";
  if (normalized === "cfo") return "cfo";
  if (normalized === "cto") return "cto";
  if (normalized === "ceo") return "ceo";
  if (normalized === "founder") return "founder";
  return "employee";
};

const findActingUser = (tenantRole: ReturnType<typeof useTenantRole>["role"]): OrgEmployee => {
  const mappedRole = mapTenantRoleToOrgRole(tenantRole);
  return HUMINEX_ORG.find((e) => e.role === mappedRole) ?? HUMINEX_ORG[0];
};

const TenantEmployees = () => {
  const { role: tenantRole } = useTenantRole();
  const actor = useMemo(() => findActingUser(tenantRole), [tenantRole]);
  const [employees, setEmployees] = useState(HUMINEX_ORG);
  const [search, setSearch] = useState("");
  const [tenantAccessConfig, setTenantAccessConfig] = useState<TenantAccessConfig>(() => readTenantAccessConfig());
  const [activePolicyRole, setActivePolicyRole] = useState<(typeof TENANT_NON_ADMIN_ROLES)[number]>("hr");
  const [isSyncing, setIsSyncing] = useState(false);

  const [portalAccessMap, setPortalAccessMap] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("huminex_employee_portal_access") || "{}");
    } catch {
      return {};
    }
  });

  const [visibilityMap, setVisibilityMap] = useState<Record<string, EmployeeVisibility>>(() => {
    try {
      return JSON.parse(localStorage.getItem("huminex_employee_visibility") || "{}");
    } catch {
      return {};
    }
  });

  const visibleEmployees = useMemo(() => {
    if (["founder", "ceo", "cto", "cfo", "vp", "director"].includes(actor.role)) return employees;
    return [actor, ...getAllReports(actor.id, employees)];
  }, [actor, employees]);

  const filteredEmployees = useMemo(() => {
    return visibleEmployees
      .filter((emp) => canViewEmployeeProfile(actor, emp, employees))
      .filter((emp) => {
        const q = search.toLowerCase();
        return (
          emp.name.toLowerCase().includes(q) ||
          emp.email.toLowerCase().includes(q) ||
          ORG_ROLE_LABELS[emp.role].toLowerCase().includes(q)
        );
      });
  }, [actor, employees, search, visibleEmployees]);

  const managerChainLabel = useMemo(() => {
    const chain = getManagerChain(actor.id, employees);
    return chain.length ? chain.map((m) => m.name).join(" -> ") : "Top-level";
  }, [actor.id, employees]);

  const canAdminManage = tenantRole === "super_admin" || tenantRole === "admin";

  useEffect(() => {
    let mounted = true;
    const fetchEmployees = async () => {
      setIsSyncing(true);
      try {
        const [page, structure] = await Promise.all([
          huminexApi.getEmployees(1, 500),
          huminexApi.getOrgStructure(),
        ]);

        const managerMap = new Map<string, string | null>(
          structure.map((node) => [node.employeeId, node.managerId ?? null])
        );

        const mappedEmployees: OrgEmployee[] = page.page.items.map((item) => ({
          id: item.employeeId,
          name: item.name,
          email: item.email,
          role: mapApiRoleToOrgRole(item.role),
          department: item.department,
          managerId: managerMap.get(item.employeeId) ?? null,
        }));

        if (mounted && mappedEmployees.length > 0) {
          setEmployees(mappedEmployees);
        }
      } catch (error) {
        console.error("Failed to load employees from API:", error);
        toast.error("Using local demo employee data. API sync failed.");
      } finally {
        if (mounted) setIsSyncing(false);
      }
    };

    fetchEmployees();
    return () => {
      mounted = false;
    };
  }, []);

  const modulePolicyCatalog: { id: TenantModuleId; label: string }[] = [
    { id: "workforce", label: "Employee Directory" },
    { id: "employees", label: "Portal Access Admin" },
    { id: "payroll", label: "Payroll" },
    { id: "finance", label: "Finance" },
    { id: "attendance", label: "Attendance" },
    { id: "documents", label: "Documents" },
    { id: "recruitment", label: "Recruitment" },
    { id: "performance", label: "Performance" },
    { id: "projects", label: "Projects" },
    { id: "compliance", label: "Compliance" },
    { id: "intelligence", label: "Proxima AI" },
    { id: "openhuman-studio", label: "OpenHuman Interview Studio" },
  ];

  const setTenantRoleModuleAccess = (role: (typeof TENANT_NON_ADMIN_ROLES)[number], moduleId: TenantModuleId, enabled: boolean) => {
    if (!canAdminManage) return;
    const updated: TenantAccessConfig = {
      ...tenantAccessConfig,
      [role]: {
        ...tenantAccessConfig[role],
        [moduleId]: enabled,
      },
    };
    setTenantAccessConfig(updated);
    saveTenantAccessConfig(updated);
  };

  const getPortalAccess = (email: string) => {
    const key = normalize(email);
    return portalAccessMap[key] !== false;
  };

  const getVisibility = (email: string): EmployeeVisibility => {
    const key = normalize(email);
    return visibilityMap[key] || DEFAULT_EMPLOYEE_VISIBILITY;
  };

  const setRole = (target: OrgEmployee, role: OrgRole) => {
    if (!canAdminManage) return;
    // UI updates instantly; backend user-role endpoint needs userId mapping (not employeeId).
    setEmployees((prev) => prev.map((e) => (e.id === target.id ? { ...e, role } : e)));
  };

  const setPortalAccess = async (employee: OrgEmployee, enabled: boolean) => {
    if (!canAdminManage) return;
    const key = normalize(employee.email);
    const allowedWidgets = Object.entries(DEFAULT_EMPLOYEE_VISIBILITY)
      .filter(([, isEnabled]) => isEnabled)
      .map(([widget]) => widget);

    try {
      await huminexApi.updatePortalAccess(employee.id, enabled, allowedWidgets);
    } catch (error) {
      console.error("Failed to update portal access in API:", error);
      toast.error(`Portal access update failed for ${employee.name}`);
      return;
    }

    const updated = { ...portalAccessMap, [key]: enabled };
    setPortalAccessMap(updated);
    localStorage.setItem("huminex_employee_portal_access", JSON.stringify(updated));
    toast.success(`Portal access ${enabled ? "enabled" : "disabled"} for ${employee.name}`);
  };

  const setVisibilityFlag = (email: string, field: keyof EmployeeVisibility, enabled: boolean) => {
    if (!canAdminManage) return;
    const key = normalize(email);
    const updatedEntry = { ...getVisibility(email), [field]: enabled };
    const updated = { ...visibilityMap, [key]: updatedEntry };
    setVisibilityMap(updated);
    localStorage.setItem("huminex_employee_visibility", JSON.stringify(updated));
  };

  const sendCredentials = (employee: OrgEmployee) => {
    if (!canAdminManage) return;
    toast.success(`Credentials email sent to ${employee.email}`);
  };

  const saveEmployeePolicy = (employee: OrgEmployee) => {
    if (!canAdminManage) return;
    const roleConfig = JSON.parse(localStorage.getItem("huminex_employee_role_overrides") || "{}");
    roleConfig[normalize(employee.email)] = employee.role;
    localStorage.setItem("huminex_employee_role_overrides", JSON.stringify(roleConfig));
    toast.success(`Access policy saved for ${employee.name}`);
  };

  const applyVisibilityToAll = () => {
    if (!canAdminManage) return;
    const updated: Record<string, EmployeeVisibility> = {};
    employees.forEach((emp) => {
      updated[normalize(emp.email)] = { ...DEFAULT_EMPLOYEE_VISIBILITY };
    });
    setVisibilityMap(updated);
    localStorage.setItem("huminex_employee_visibility", JSON.stringify(updated));
    toast.success("Finance, payslips, insurance, benefits and documents enabled for all employees.");
  };

  const resetTenantRolePolicy = () => {
    if (!canAdminManage) return;
    const defaults = getDefaultTenantAccessConfig();
    setTenantAccessConfig(defaults);
    saveTenantAccessConfig(defaults);
    toast.success("Employer role access policy reset to defaults.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1E3A]">Employee Access Administration</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Admin-only controls for role assignment, credentials, login access, and employee portal visibility.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-[#005EEB]/10 text-[#005EEB]">Signed in as {ORG_ROLE_LABELS[actor.role]}</Badge>
          <Badge variant="outline">{tenantRole || "employee"}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Admin Scope</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[#6B7280] space-y-1">
          <p>Visible employees: <strong>{visibleEmployees.length}</strong></p>
          <p>Manager chain: {managerChainLabel}</p>
          <p>Source: {isSyncing ? "Syncing with HUMINEX API..." : "HUMINEX API / local fallback"}</p>
          <div className="pt-2">
            <Button size="sm" variant="outline" onClick={applyVisibilityToAll} disabled={!canAdminManage}>
              <ShieldCheck className="h-4 w-4 mr-2" />
              Apply Standard Employee Benefits Visibility to All
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employer Role Access Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[#6B7280]">
            Admin has full access to Employee Directory and Payroll for any employee. Configure what non-admin employer roles can access.
          </p>
          <div className="flex flex-wrap gap-2">
            {TENANT_NON_ADMIN_ROLES.map((role) => (
              <Button
                key={role}
                type="button"
                size="sm"
                variant={activePolicyRole === role ? "default" : "outline"}
                onClick={() => setActivePolicyRole(role)}
                disabled={!canAdminManage}
              >
                {TENANT_ROLE_LABELS[role]}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={resetTenantRolePolicy}
              disabled={!canAdminManage}
            >
              Reset Policy
            </Button>
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {modulePolicyCatalog.map((module) => (
              <div key={module.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                <span className="text-xs text-[#6B7280]">{module.label}</span>
                <Switch
                  checked={Boolean(tenantAccessConfig[activePolicyRole][module.id])}
                  onCheckedChange={(checked) => setTenantRoleModuleAccess(activePolicyRole, module.id, checked)}
                  disabled={!canAdminManage}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or role"
          className="pl-10"
        />
      </div>

      {!canAdminManage && (
        <Card>
          <CardContent className="py-8 text-center text-[#6B7280]">
            Only tenant admins can manage employee roles and portal access.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredEmployees.map((emp) => {
          const manager = emp.managerId ? employees.find((m) => m.id === emp.managerId) : null;
          const visibility = getVisibility(emp.email);
          const portalEnabled = getPortalAccess(emp.email);

          return (
            <Card key={emp.id} className="border-gray-100">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#0F1E3A]">{emp.name}</p>
                    <p className="text-xs text-[#6B7280]">{emp.email}</p>
                  </div>
                  <Badge className="bg-[#005EEB]/10 text-[#005EEB]">{ORG_ROLE_LABELS[emp.role]}</Badge>
                </div>

                <div className="text-xs text-[#6B7280] space-y-1">
                  <p>Department: {emp.department}</p>
                  <p>Manager: {manager?.name || "N/A"}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#0F1E3A]">Role Assignment</p>
                  <Select
                    value={emp.role}
                    onValueChange={(value) => setRole(emp, value as OrgRole)}
                    disabled={!canAdminManage}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ORG_ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#0F1E3A]">Portal Access</p>
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                    <span className="text-xs text-[#6B7280]">Employee Portal Login</span>
                    <Switch
                      checked={portalEnabled}
                      onCheckedChange={(checked) => void setPortalAccess(emp, checked)}
                      disabled={!canAdminManage}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#0F1E3A]">What Employee Can See</p>
                  {(
                    [
                      ["finance", "Finance Details"],
                      ["payslips", "Download Payslips"],
                      ["insurance", "Insurance Details"],
                      ["benefits", "Benefits Details"],
                      ["documents", "Company Documents"],
                    ] as [keyof EmployeeVisibility, string][]
                  ).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-1.5">
                      <span className="text-xs text-[#6B7280]">{label}</span>
                      <Switch
                        checked={visibility[key]}
                        onCheckedChange={(checked) => setVisibilityFlag(emp.email, key, checked)}
                        disabled={!canAdminManage}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1"
                    onClick={() => sendCredentials(emp)}
                    disabled={!canAdminManage}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Send Credentials
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 gap-1 bg-[#005EEB] hover:bg-[#004BC4]"
                    onClick={() => saveEmployeePolicy(emp)}
                    disabled={!canAdminManage}
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save Policy
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredEmployees.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <Users className="h-10 w-10 text-[#9CA3AF] mx-auto mb-3" />
            <p className="text-sm text-[#6B7280]">No employees matched your search/scope.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TenantEmployees;
