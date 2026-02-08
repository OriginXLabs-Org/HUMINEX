import { useState, useEffect } from "react";
import { huminexApi } from "@/integrations/api/client";
import { useAuth } from "./useAuth";

export const useUserRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const localBypassEnabled =
    import.meta.env.DEV === true &&
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname) &&
    String(import.meta.env.VITE_ENABLE_LOCAL_INTERNAL_ADMIN_BYPASS ?? "true").toLowerCase() !== "false";

  useEffect(() => {
    const checkAdminRole = async () => {
      if (authLoading) {
        return;
      }

      setLoading(true);

      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      if (
        localBypassEnabled &&
        (
          String(user.email || "").toLowerCase() === "originxlabs@gmail.com" ||
          Boolean((user.user_metadata as Record<string, unknown> | undefined)?.local_bypass)
        )
      ) {
        setIsAdmin(true);
        setLoading(false);
        return;
      }

      try {
        const me = await huminexApi.me();
        const role = (me.role || "").toLowerCase();
        setIsAdmin(role === "admin" || role === "super_admin" || role === "director");
      } catch (err) {
        // Fallback to token/session role when profile endpoint is temporarily unavailable.
        const roleFromSession = String((user.user_metadata as Record<string, unknown> | undefined)?.role ?? "").toLowerCase();
        const roleFromStorage = String(localStorage.getItem("huminex_tenant_role") ?? "").toLowerCase();
        const fallbackRole = roleFromSession || roleFromStorage;
        setIsAdmin(fallbackRole === "admin" || fallbackRole === "super_admin" || fallbackRole === "director");
      } finally {
        setLoading(false);
      }
    };

    checkAdminRole();
  }, [user, authLoading, localBypassEnabled]);

  return { isAdmin, loading };
};
