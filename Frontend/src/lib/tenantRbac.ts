import { TenantRole } from "@/hooks/useTenantRole";

export const TENANT_ROLE_ACCESS_KEY = "huminex_tenant_role_access";
export const TENANT_ACCESS_UPDATED_EVENT = "huminex-tenant-access-updated";

export type TenantModuleId =
  | "dashboard"
  | "workforce"
  | "employees"
  | "attendance"
  | "documents"
  | "announcements"
  | "payroll"
  | "finance"
  | "insurance"
  | "recruitment"
  | "bgv"
  | "performance"
  | "projects"
  | "ems"
  | "requests"
  | "notifications"
  | "compliance"
  | "risk"
  | "identity"
  | "intelligence"
  | "openhuman-studio"
  | "automations"
  | "managed-ops"
  | "settings"
  | "settings-integrations"
  | "settings-api-keys"
  | "settings-billing"
  | "settings-export"
  | "settings-domain"
  | "settings-widgets"
  | "settings-sidebar";

export const TENANT_ROLE_LABELS: Record<TenantRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  director: "Director",
  hr: "HR",
  finance: "Finance",
  technical_manager: "Technical Manager",
  manager: "Manager",
  employee: "Employee",
};

export const TENANT_NON_ADMIN_ROLES: TenantRole[] = [
  "director",
  "hr",
  "finance",
  "technical_manager",
  "manager",
  "employee",
];

export type TenantAccessConfig = Record<TenantRole, Record<TenantModuleId, boolean>>;

const ALL_MODULES: TenantModuleId[] = [
  "dashboard",
  "workforce",
  "employees",
  "attendance",
  "documents",
  "announcements",
  "payroll",
  "finance",
  "insurance",
  "recruitment",
  "bgv",
  "performance",
  "projects",
  "ems",
  "requests",
  "notifications",
  "compliance",
  "risk",
  "identity",
  "intelligence",
  "openhuman-studio",
  "automations",
  "managed-ops",
  "settings",
  "settings-integrations",
  "settings-api-keys",
  "settings-billing",
  "settings-export",
  "settings-domain",
  "settings-widgets",
  "settings-sidebar",
];

const allEnabled = (): Record<TenantModuleId, boolean> =>
  ALL_MODULES.reduce((acc, moduleId) => {
    acc[moduleId] = true;
    return acc;
  }, {} as Record<TenantModuleId, boolean>);

const moduleSet = (...allowed: TenantModuleId[]): Record<TenantModuleId, boolean> => {
  const result = ALL_MODULES.reduce((acc, moduleId) => {
    acc[moduleId] = false;
    return acc;
  }, {} as Record<TenantModuleId, boolean>);

  allowed.forEach((moduleId) => {
    result[moduleId] = true;
  });

  return result;
};

export const getDefaultTenantAccessConfig = (): TenantAccessConfig => ({
  super_admin: allEnabled(),
  admin: allEnabled(),
  director: moduleSet(
    "dashboard",
    "workforce",
    "attendance",
    "documents",
    "announcements",
    "payroll",
    "finance",
    "insurance",
    "recruitment",
    "bgv",
    "performance",
    "projects",
    "requests",
    "notifications",
    "compliance",
    "risk",
    "identity",
    "intelligence",
    "openhuman-studio"
  ),
  hr: moduleSet(
    "dashboard",
    "workforce",
    "employees",
    "attendance",
    "documents",
    "announcements",
    "recruitment",
    "bgv",
    "performance",
    "projects",
    "requests",
    "notifications",
    "openhuman-studio"
  ),
  finance: moduleSet(
    "dashboard",
    "workforce",
    "employees",
    "documents",
    "payroll",
    "finance",
    "insurance",
    "projects",
    "requests",
    "notifications"
  ),
  technical_manager: moduleSet(
    "dashboard",
    "workforce",
    "employees",
    "attendance",
    "documents",
    "projects",
    "requests",
    "notifications",
    "intelligence",
    "openhuman-studio",
    "managed-ops"
  ),
  manager: moduleSet(
    "dashboard",
    "workforce",
    "employees",
    "attendance",
    "documents",
    "projects",
    "requests",
    "notifications",
    "performance"
  ),
  employee: moduleSet("dashboard", "documents", "requests", "notifications"),
});

export const readTenantAccessConfig = (): TenantAccessConfig => {
  const defaults = getDefaultTenantAccessConfig();
  try {
    const raw = localStorage.getItem(TENANT_ROLE_ACCESS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<TenantAccessConfig>;
    return {
      ...defaults,
      ...parsed,
      super_admin: defaults.super_admin,
      admin: defaults.admin,
    };
  } catch {
    return defaults;
  }
};

export const saveTenantAccessConfig = (config: TenantAccessConfig) => {
  localStorage.setItem(TENANT_ROLE_ACCESS_KEY, JSON.stringify(config));
  window.dispatchEvent(new Event(TENANT_ACCESS_UPDATED_EVENT));
};

export const canAccessTenantModule = (
  role: TenantRole | null | undefined,
  moduleId: TenantModuleId,
  config: TenantAccessConfig
) => {
  if (!role) return false;
  if (role === "super_admin" || role === "admin") return true;
  return Boolean(config[role]?.[moduleId]);
};

export const resolveTenantModuleByPath = (path: string): TenantModuleId => {
  if (path.startsWith("/tenant/workforce")) return "workforce";
  if (path.startsWith("/tenant/employees")) return "employees";
  if (path.startsWith("/tenant/attendance")) return "attendance";
  if (path.startsWith("/tenant/documents")) return "documents";
  if (path.startsWith("/tenant/announcements")) return "announcements";
  if (path.startsWith("/tenant/payroll")) return "payroll";
  if (path.startsWith("/tenant/finance")) return "finance";
  if (path.startsWith("/tenant/insurance")) return "insurance";
  if (path.startsWith("/tenant/recruitment")) return "recruitment";
  if (path.startsWith("/tenant/bgv")) return "bgv";
  if (path.startsWith("/tenant/performance")) return "performance";
  if (path.startsWith("/tenant/projects")) return "projects";
  if (path.startsWith("/tenant/ems")) return "ems";
  if (path.startsWith("/tenant/requests")) return "requests";
  if (path.startsWith("/tenant/notifications")) return "notifications";
  if (path.startsWith("/tenant/compliance")) return "compliance";
  if (path.startsWith("/tenant/risk")) return "risk";
  if (path.startsWith("/tenant/identity")) return "identity";
  if (path.startsWith("/tenant/intelligence")) return "intelligence";
  if (path.startsWith("/tenant/openhuman-studio")) return "openhuman-studio";
  if (path.startsWith("/tenant/automations")) return "automations";
  if (path.startsWith("/tenant/managed-ops")) return "managed-ops";
  if (path.startsWith("/tenant/settings/integrations")) return "settings-integrations";
  if (path.startsWith("/tenant/settings/api-keys")) return "settings-api-keys";
  if (path.startsWith("/tenant/settings/billing")) return "settings-billing";
  if (path.startsWith("/tenant/settings/export")) return "settings-export";
  if (path.startsWith("/tenant/settings/domain")) return "settings-domain";
  if (path.startsWith("/tenant/settings/widgets")) return "settings-widgets";
  if (path.startsWith("/tenant/settings/sidebar")) return "settings-sidebar";
  if (path.startsWith("/tenant/settings")) return "settings";
  return "dashboard";
};
