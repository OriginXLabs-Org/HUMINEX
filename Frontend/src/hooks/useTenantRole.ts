import { useState, useEffect } from "react";
import { huminexApi } from "@/integrations/api/client";
import { useAuth } from "./useAuth";

export type TenantRole =
  | "super_admin"
  | "admin"
  | "director"
  | "hr"
  | "finance"
  | "technical_manager"
  | "manager"
  | "employee";

export const useTenantRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<TenantRole | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isTenantAdmin, setIsTenantAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTenantRole = async () => {
      if (!user) {
        setRole(null);
        setIsSuperAdmin(false);
        setIsTenantAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const me = await huminexApi.me();
        const apiRole = (me.role || "").toLowerCase();
        const mappedRole: TenantRole =
          apiRole === "super_admin" ? "super_admin" :
          apiRole === "admin" ? "admin" :
          apiRole === "director" ? "director" :
          apiRole === "hr" ? "hr" :
          apiRole === "finance" ? "finance" :
          apiRole === "technical_manager" ? "technical_manager" :
          apiRole === "manager" ? "manager" :
          "employee";

        setRole(mappedRole);
        setIsSuperAdmin(mappedRole === "super_admin");
        setIsTenantAdmin(mappedRole === "super_admin" || mappedRole === "admin");
      } catch (err) {
        console.error("Error checking tenant role:", err);
        setRole(null);
        setIsSuperAdmin(false);
        setIsTenantAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkTenantRole();
  }, [user]);

  return { role, isSuperAdmin, isTenantAdmin, loading };
};
