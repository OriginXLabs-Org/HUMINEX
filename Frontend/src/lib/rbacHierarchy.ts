export type OrgRole =
  | "founder"
  | "ceo"
  | "cto"
  | "cfo"
  | "vp"
  | "director"
  | "senior_manager"
  | "manager"
  | "lead"
  | "senior_employee"
  | "employee"
  | "junior_employee"
  | "intern";

export interface OrgEmployee {
  id: string;
  name: string;
  email: string;
  role: OrgRole;
  department: string;
  managerId: string | null;
}

export const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  founder: "Founder",
  ceo: "CEO",
  cto: "CTO",
  cfo: "CFO",
  vp: "VP",
  director: "Director",
  senior_manager: "Senior Manager",
  manager: "Manager",
  lead: "Lead",
  senior_employee: "Senior Employee",
  employee: "Employee",
  junior_employee: "Junior Employee",
  intern: "Intern",
};

const ROLE_RANK: Record<OrgRole, number> = {
  founder: 130,
  ceo: 120,
  cto: 118,
  cfo: 116,
  vp: 110,
  director: 100,
  senior_manager: 90,
  manager: 80,
  lead: 70,
  senior_employee: 60,
  employee: 50,
  junior_employee: 40,
  intern: 30,
};

const PROMOTION_CHAIN: OrgRole[] = [
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

export const HUMINEX_ORG: OrgEmployee[] = [
  {
    id: "emp-100",
    name: "Abhishek Panda",
    email: "founder@gethuminex.com",
    role: "founder",
    department: "Executive",
    managerId: null,
  },
  {
    id: "emp-101",
    name: "Ishita Rao",
    email: "ceo@gethuminex.com",
    role: "ceo",
    department: "Executive",
    managerId: "emp-100",
  },
  {
    id: "emp-102",
    name: "Rohan Mehta",
    email: "cto@gethuminex.com",
    role: "cto",
    department: "Technology",
    managerId: "emp-101",
  },
  {
    id: "emp-103",
    name: "Naina Verma",
    email: "cfo@gethuminex.com",
    role: "cfo",
    department: "Finance",
    managerId: "emp-101",
  },
  {
    id: "emp-104",
    name: "Vikram Das",
    email: "vp.hr@gethuminex.com",
    role: "vp",
    department: "People Operations",
    managerId: "emp-101",
  },
  {
    id: "emp-105",
    name: "Ritu Sharma",
    email: "director.engineering@gethuminex.com",
    role: "director",
    department: "Engineering",
    managerId: "emp-102",
  },
  {
    id: "emp-106",
    name: "Aman Patel",
    email: "manager.platform@gethuminex.com",
    role: "manager",
    department: "Engineering",
    managerId: "emp-105",
  },
  {
    id: "emp-107",
    name: "Kiran Sen",
    email: "lead.frontend@gethuminex.com",
    role: "lead",
    department: "Engineering",
    managerId: "emp-106",
  },
  {
    id: "emp-108",
    name: "Priya Nair",
    email: "employee@gethuminex.com",
    role: "employee",
    department: "Engineering",
    managerId: "emp-107",
  },
  {
    id: "emp-109",
    name: "Arjun Roy",
    email: "junior@gethuminex.com",
    role: "junior_employee",
    department: "Engineering",
    managerId: "emp-107",
  },
];

const EMPLOYEE_PROJECTS: Record<string, string[]> = {
  "emp-100": ["Strategic Workforce Transformation", "HUMINEX Global Rollout"],
  "emp-101": ["Enterprise Growth Program", "Customer Success Transformation"],
  "emp-102": ["Platform Reliability Program", "Agentic Interview Architecture"],
  "emp-103": ["Payroll Automation Revamp", "Finance Compliance Engine"],
  "emp-104": ["Org Capability Uplift", "Leadership Hiring Sprint"],
  "emp-105": ["Engineering Productivity v2", "Core HRMS Modernization"],
  "emp-106": ["Attendance Intelligence", "Workflow Engine Hardening"],
  "emp-107": ["Employee Portal UX Refresh", "Hierarchy Experience"],
  "emp-108": ["Self-Service Task Stream", "Profile & Settings Enhancements"],
  "emp-109": ["Dashboard QA Coverage", "Internal Tools Support"],
};

export const getOrgEmployee = (employeeId: string, org = HUMINEX_ORG): OrgEmployee | null =>
  org.find((e) => e.id === employeeId) ?? null;

export const getByEmail = (email?: string | null, org = HUMINEX_ORG): OrgEmployee | null => {
  if (!email) return null;
  return org.find((e) => e.email.toLowerCase() === email.toLowerCase()) ?? null;
};

export const getManagerChain = (employeeId: string, org = HUMINEX_ORG): OrgEmployee[] => {
  const chain: OrgEmployee[] = [];
  let current = getOrgEmployee(employeeId, org);
  const safety = new Set<string>();

  while (current?.managerId) {
    if (safety.has(current.managerId)) break;
    safety.add(current.managerId);
    const manager = getOrgEmployee(current.managerId, org);
    if (!manager) break;
    chain.push(manager);
    current = manager;
  }

  return chain;
};

export const getDirectReports = (managerId: string, org = HUMINEX_ORG): OrgEmployee[] =>
  org.filter((e) => e.managerId === managerId);

export const getEmployeeProjects = (employeeId: string): string[] => {
  return EMPLOYEE_PROJECTS[employeeId] || [];
};

export const getAllReports = (managerId: string, org = HUMINEX_ORG): OrgEmployee[] => {
  const all: OrgEmployee[] = [];
  const queue = getDirectReports(managerId, org);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    all.push(current);
    queue.push(...getDirectReports(current.id, org));
  }

  return all;
};

export const canViewEmployeeProfile = (
  viewer: OrgEmployee,
  target: OrgEmployee,
  org = HUMINEX_ORG
): boolean => {
  if (viewer.id === target.id) return true;
  if (ROLE_RANK[viewer.role] >= ROLE_RANK.director) return true;
  const reports = getAllReports(viewer.id, org);
  return reports.some((e) => e.id === target.id);
};

export const canViewFinancialReport = (
  viewer: OrgEmployee,
  target: OrgEmployee,
  org = HUMINEX_ORG
): boolean => {
  if (viewer.id === target.id) return true;
  if (["founder", "ceo", "cfo"].includes(viewer.role)) return true;
  if (viewer.role === "manager" || viewer.role === "senior_manager" || viewer.role === "director") {
    return getAllReports(viewer.id, org).some((e) => e.id === target.id);
  }
  return false;
};

export const canPromote = (actor: OrgEmployee, target: OrgEmployee): boolean => {
  if (target.role === "ceo" || target.role === "founder") return false;
  if (["founder", "ceo", "cto", "cfo"].includes(actor.role)) return true;
  if (actor.role === "director" && ["intern", "junior_employee", "employee", "senior_employee", "lead", "manager"].includes(target.role)) {
    return true;
  }
  if (actor.role === "manager" && ["intern", "junior_employee", "employee"].includes(target.role)) {
    return true;
  }
  return false;
};

export const nextRoleForPromotion = (role: OrgRole): OrgRole | null => {
  const idx = PROMOTION_CHAIN.indexOf(role);
  if (idx === -1 || idx === PROMOTION_CHAIN.length - 1) return null;
  return PROMOTION_CHAIN[idx + 1];
};

export const mapEmployeePortalRoleToOrgRole = (
  role: "staff" | "hr" | "manager" | "finance" | "admin"
): OrgRole => {
  if (role === "admin") return "director";
  if (role === "manager") return "manager";
  if (role === "finance") return "cfo";
  if (role === "hr") return "vp";
  return "employee";
};

export const mapTenantRoleToOrgRole = (
  role: "super_admin" | "admin" | "manager" | "employee" | null
): OrgRole => {
  if (role === "super_admin") return "founder";
  if (role === "admin") return "ceo";
  if (role === "manager") return "manager";
  return "employee";
};
