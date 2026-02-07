import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useEmployeeRole } from "@/hooks/useEmployeeRole";
import { platformClient as platform } from "@/integrations/platform/client";
import {
  HUMINEX_ORG,
  ORG_ROLE_LABELS,
  canViewEmployeeProfile,
  canViewFinancialReport,
  getAllReports,
  getByEmail,
  getManagerChain,
  mapEmployeePortalRoleToOrgRole,
} from "@/lib/rbacHierarchy";
import { Users, Mail, ShieldAlert, UserCheck } from "lucide-react";

export const PortalTeam = () => {
  const { user } = useAuth();
  const { role } = useEmployeeRole();

  const currentEmployee = useMemo(() => {
    const matched = getByEmail(user?.email, HUMINEX_ORG);
    if (matched) return matched;
    const fallbackRole = mapEmployeePortalRoleToOrgRole(role);
    return HUMINEX_ORG.find((e) => e.role === fallbackRole) || HUMINEX_ORG[HUMINEX_ORG.length - 1];
  }, [user?.email, role]);

  const managerChain = useMemo(
    () => getManagerChain(currentEmployee.id, HUMINEX_ORG),
    [currentEmployee.id]
  );

  const visibleEmployees = useMemo(() => {
    if (["manager", "admin", "hr"].includes(role)) {
      return [currentEmployee, ...getAllReports(currentEmployee.id, HUMINEX_ORG)];
    }
    return [currentEmployee];
  }, [currentEmployee, role]);

  const handleFinancialAccess = async (targetId: string) => {
    const target = HUMINEX_ORG.find((e) => e.id === targetId);
    if (!target) return;

    if (canViewFinancialReport(currentEmployee, target, HUMINEX_ORG)) {
      toast.success(`Financial report access granted for ${target.name}.`);
      return;
    }

    try {
      await platform.from("admin_notifications").insert({
        title: "DANGER: Unauthorized Financial Access Attempt",
        message: `${currentEmployee.email} attempted to access financial details of ${target.email}.`,
        type: "security_alert",
        target_admin_id: null,
      });
    } catch (error) {
      console.error("Could not write danger alert notification", error);
    }

    toast.error("Danger alert sent to admin. Financial report access denied.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Organization Visibility</h1>
        <p className="text-muted-foreground">
          Role-based employee visibility with hierarchy chain and financial-access controls.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            <span className="font-medium">Logged in as</span>
          </div>
          <div className="text-sm text-muted-foreground">{currentEmployee.name}</div>
          <Badge className="w-fit">{ORG_ROLE_LABELS[currentEmployee.role]}</Badge>
          <div className="text-sm text-muted-foreground">
            Manager chain: {managerChain.length ? managerChain.map((m) => m.name).join(" -> ") : "Top level"}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleEmployees
          .filter((member) => canViewEmployeeProfile(currentEmployee, member, HUMINEX_ORG))
          .map((member) => (
            <Card key={member.id} className="hover:border-primary/30 transition-all">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg">
                    {member.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{member.name}</h3>
                    <Badge className="bg-primary/10 text-primary">{ORG_ROLE_LABELS[member.role]}</Badge>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{member.email}</span>
                  </div>
                </div>
                {member.id !== currentEmployee.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => handleFinancialAccess(member.id)}
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Request Financial Report Access
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
      </div>

      {!["manager", "admin", "hr"].includes(role) && (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              You can view only your own profile. Team data is restricted by RBAC policy.
            </p>
          </CardContent>
        </Card>
      )}
      {["manager", "admin", "hr"].includes(role) && visibleEmployees.length <= 1 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No direct reports assigned yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
};
