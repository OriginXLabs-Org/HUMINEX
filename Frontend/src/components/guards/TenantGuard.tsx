import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { TenantRole, useTenantRole } from "@/hooks/useTenantRole";
import { Loader2 } from "lucide-react";

interface TenantGuardProps {
  children: React.ReactNode;
  requiredRole?: TenantRole;
}

/**
 * TenantGuard - Route guard for Tenant Super-Admin Portal (/tenant/*)
 * 
 * Ensures only users with appropriate tenant admin roles can access the tenant portal.
 * - Super Admins have full access to all tenant configurations
 * - Regular employees should be redirected to /portal instead
 */
export const TenantGuard: React.FC<TenantGuardProps> = ({ 
  children, 
  requiredRole = "employee" 
}) => {
  const { user, loading: authLoading } = useAuth();
  const { role, isSuperAdmin, isTenantAdmin, loading: roleLoading } = useTenantRole();
  const location = useLocation();

  // Show loading state while checking auth and roles
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#005EEB]" />
          <p className="text-sm text-[#6B7280]">Verifying access...</p>
        </div>
      </div>
    );
  }

  // If not logged in, redirect to tenant login
  if (!user) {
    return <Navigate to="/tenant/login" state={{ from: location }} replace />;
  }

  // Check role requirements
  const hasAccess = (() => {
    if (requiredRole === "super_admin") return isSuperAdmin;
    if (requiredRole === "admin") return isTenantAdmin;
    return Boolean(role);
  })();

  // If user doesn't have the required role, redirect appropriately
  if (!hasAccess) {
    // Regular employees should go to the portal
    return <Navigate to="/portal" replace />;
  }

  return <>{children}</>;
};

export default TenantGuard;
