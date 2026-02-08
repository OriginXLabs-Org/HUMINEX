import { useState, useEffect } from "react";
import { huminexApi } from "@/integrations/api/client";
import { useAuth } from "./useAuth";

export const useUserRole = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const localBypassEnabled =
    import.meta.env.DEV === true &&
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname) &&
    String(import.meta.env.VITE_ENABLE_LOCAL_INTERNAL_ADMIN_BYPASS ?? "true").toLowerCase() !== "false";

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      if (
        localBypassEnabled &&
        String(user.email || "").toLowerCase() === "originxlabs@gmail.com"
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
        console.error("Error checking admin role:", err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminRole();
  }, [user, localBypassEnabled]);

  return { isAdmin, loading };
};
