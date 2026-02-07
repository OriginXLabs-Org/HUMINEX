import { useState, useEffect } from "react";
import { huminexApi } from "@/integrations/api/client";
import { useAuth } from "./useAuth";

export type EmployeeRole = "staff" | "hr" | "manager" | "finance" | "admin";

interface EmployeeRoleResult {
  role: EmployeeRole;
  isHR: boolean;
  isManager: boolean;
  isFinance: boolean;
  isAdmin: boolean;
  loading: boolean;
}

/**
 * Role-based module visibility for Employee Portal
 * - staff: Basic modules (Dashboard, Projects, Files, Meetings, Feedback, Resources, Settings)
 * - hr: Staff modules + Team, Tickets
 * - manager: Staff modules + Team, Projects (full), AI Dashboard
 * - finance: Staff modules + Invoices, MSP Monitoring
 * - admin: All modules
 */
export const useEmployeeRole = (): EmployeeRoleResult => {
  const { user } = useAuth();
  const [role, setRole] = useState<EmployeeRole>("staff");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      if (!user) {
        setRole("staff");
        setLoading(false);
        return;
      }

      try {
        const me = await huminexApi.me();
        const tenantRole = (me.role || "").toLowerCase();
        if (tenantRole === "super_admin" || tenantRole === "admin" || tenantRole === "director") {
          setRole("admin");
        } else if (tenantRole === "hr") {
          setRole("hr");
        } else if (tenantRole === "manager" || tenantRole === "technical_manager") {
          setRole("manager");
        } else if (tenantRole === "finance") {
          setRole("finance");
        } else {
          setRole("staff");
        }
      } catch (err) {
        console.error("Error checking employee role:", err);
        setRole("staff");
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [user]);

  return {
    role,
    isHR: role === "hr" || role === "admin",
    isManager: role === "manager" || role === "admin",
    isFinance: role === "finance" || role === "admin",
    isAdmin: role === "admin",
    loading
  };
};

/**
 * Module access by role
 */
export const moduleAccessByRole: Record<string, EmployeeRole[]> = {
  "Dashboard": ["staff", "hr", "manager", "finance", "admin"],
  "Projects": ["staff", "hr", "manager", "finance", "admin"],
  "Files": ["staff", "hr", "manager", "finance", "admin"],
  "Invoices": ["staff", "hr", "manager", "finance", "admin"],
  "Tickets": ["hr", "manager", "admin"],
  "Meetings": ["staff", "hr", "manager", "finance", "admin"],
  "AI Dashboard": ["manager", "admin"],
  "MSP Monitoring": ["finance", "admin"],
  "Team": ["hr", "manager", "admin"],
  "Feedback": ["staff", "hr", "manager", "finance", "admin"],
  "Resources": ["staff", "hr", "manager", "finance", "admin"],
  "Settings": ["staff", "hr", "manager", "finance", "admin"],
};

export const isModuleAccessibleByRole = (moduleName: string, role: EmployeeRole): boolean => {
  const allowedRoles = moduleAccessByRole[moduleName];
  return allowedRoles ? allowedRoles.includes(role) : false;
};
