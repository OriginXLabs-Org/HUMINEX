import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useTenantRole } from "@/hooks/useTenantRole";
import {
  ORG_ROLE_LABELS,
  canViewEmployeeProfile,
  getAllReports,
  getManagerChain,
  mapTenantRoleToOrgRole,
  type OrgEmployee,
  type OrgRole,
} from "@/lib/rbacHierarchy";
import { Search, Users } from "lucide-react";
import { huminexApi } from "@/integrations/api/client";

type EmployeeVisibility = {
  finance: boolean;
  payslips: boolean;
  insurance: boolean;
  benefits: boolean;
  documents: boolean;
};

type EmployeeAccessState = {
  isEnabled: boolean;
  allowedWidgets: string[];
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

const sanitizeWidgets = (widgets: string[]) =>
  Array.from(new Set(widgets.map((w) => w.trim().toLowerCase()).filter((w) => w.length > 0)));

const widgetsToVisibility = (widgets: string[]): EmployeeVisibility => {
  const widgetSet = new Set(widgets.map((w) => w.toLowerCase()));
  return {
    finance: widgetSet.has("finance"),
    payslips: widgetSet.has("payslips"),
    insurance: widgetSet.has("insurance"),
    benefits: widgetSet.has("benefits"),
    documents: widgetSet.has("documents"),
  };
};

const visibilityToWidgets = (visibility: EmployeeVisibility): string[] => {
  const widgets: string[] = [];
  if (visibility.finance) widgets.push("finance");
  if (visibility.payslips) widgets.push("payslips");
  if (visibility.insurance) widgets.push("insurance");
  if (visibility.benefits) widgets.push("benefits");
  if (visibility.documents) widgets.push("documents");
  return sanitizeWidgets(widgets);
};

const TenantEmployees = () => {
  const { role: tenantRole } = useTenantRole();
  const [employees, setEmployees] = useState<OrgEmployee[]>([]);
  const [accessMap, setAccessMap] = useState<Record<string, EmployeeAccessState>>({});
  const [search, setSearch] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const actor = useMemo(() => {
    if (employees.length === 0) return null;
    const mappedRole = mapTenantRoleToOrgRole(tenantRole);
    return employees.find((e) => e.role === mappedRole) ?? employees[0];
  }, [tenantRole, employees]);

  const visibleEmployees = useMemo(() => {
    if (!actor) return [];
    if (["founder", "ceo", "cto", "cfo", "vp", "director"].includes(actor.role)) return employees;
    return [actor, ...getAllReports(actor.id, employees)];
  }, [actor, employees]);

  const filteredEmployees = useMemo(() => {
    if (!actor) return [];
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
    if (!actor) return "N/A";
    const chain = getManagerChain(actor.id, employees);
    return chain.length ? chain.map((m) => m.name).join(" -> ") : "Top-level";
  }, [actor, employees]);

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
          managerId: item.managerEmployeeId ?? managerMap.get(item.employeeId) ?? null,
        }));

        const mappedAccess: Record<string, EmployeeAccessState> = {};
        page.page.items.forEach((item) => {
          mappedAccess[item.employeeId] = {
            isEnabled: item.isPortalAccessEnabled,
            allowedWidgets: sanitizeWidgets(item.allowedWidgets || []),
          };
        });

        if (mounted) {
          setEmployees(mappedEmployees);
          setAccessMap(mappedAccess);
        }
      } catch (error) {
        console.error("Failed to load employees from API:", error);
        if (mounted) {
          setEmployees([]);
          setAccessMap({});
        }
        toast.error("Failed to load employee directory from HUMINEX API.");
      } finally {
        if (mounted) setIsSyncing(false);
      }
    };

    fetchEmployees();
    return () => {
      mounted = false;
    };
  }, []);

  const getPortalAccess = (employeeId: string) => {
    return accessMap[employeeId]?.isEnabled ?? true;
  };

  const getVisibility = (employeeId: string): EmployeeVisibility => {
    const allowedWidgets = accessMap[employeeId]?.allowedWidgets ?? [];
    const visibility = widgetsToVisibility(allowedWidgets);

    if (allowedWidgets.length === 0) {
      return DEFAULT_EMPLOYEE_VISIBILITY;
    }

    return visibility;
  };

  const setRole = async (target: OrgEmployee, role: OrgRole) => {
    if (!canAdminManage) return;

    try {
      const updated = await huminexApi.updateEmployeeRole(target.id, role);
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === target.id
            ? {
                ...e,
                role: mapApiRoleToOrgRole(updated.role),
              }
            : e
        )
      );
      toast.success(`Role updated for ${target.name}`);
    } catch (error) {
      console.error("Failed to update employee role:", error);
      toast.error(`Role update failed for ${target.name}`);
    }
  };

  const persistPortalSettings = async (employee: OrgEmployee, isEnabled: boolean, allowedWidgets: string[]) => {
    if (!canAdminManage) return;

    const sanitized = sanitizeWidgets(allowedWidgets);

    try {
      await huminexApi.updatePortalAccess(employee.id, isEnabled, sanitized);
      setAccessMap((prev) => ({
        ...prev,
        [employee.id]: {
          isEnabled,
          allowedWidgets: sanitized,
        },
      }));
    } catch (error) {
      console.error("Failed to update portal access in API:", error);
      toast.error(`Portal access update failed for ${employee.name}`);
      throw error;
    }
  };

  const setPortalAccess = async (employee: OrgEmployee, enabled: boolean) => {
    const currentWidgets = accessMap[employee.id]?.allowedWidgets ?? visibilityToWidgets(DEFAULT_EMPLOYEE_VISIBILITY);
    await persistPortalSettings(employee, enabled, currentWidgets);
    toast.success(`Portal access ${enabled ? "enabled" : "disabled"} for ${employee.name}`);
  };

  const setVisibilityFlag = async (employee: OrgEmployee, field: keyof EmployeeVisibility, enabled: boolean) => {
    if (!canAdminManage) return;

    const currentVisibility = getVisibility(employee.id);
    const updatedVisibility = { ...currentVisibility, [field]: enabled };
    const updatedWidgets = visibilityToWidgets(updatedVisibility);

    await persistPortalSettings(employee, getPortalAccess(employee.id), updatedWidgets);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1E3A]">Employee Access Administration</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Admin-only controls for role assignment, login access, and employee portal visibility.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {actor ? <Badge className="bg-[#005EEB]/10 text-[#005EEB]">Signed in as {ORG_ROLE_LABELS[actor.role]}</Badge> : null}
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
          <p>Source: {isSyncing ? "Syncing with HUMINEX API..." : "HUMINEX API"}</p>
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
          const visibility = getVisibility(emp.id);
          const portalEnabled = getPortalAccess(emp.id);

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
                    onValueChange={(value) => void setRole(emp, value as OrgRole)}
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
                        onCheckedChange={(checked) => void setVisibilityFlag(emp, key, checked)}
                        disabled={!canAdminManage}
                      />
                    </div>
                  ))}
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
