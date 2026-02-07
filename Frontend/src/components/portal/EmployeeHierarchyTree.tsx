import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  HUMINEX_ORG,
  ORG_ROLE_LABELS,
  getByEmail,
  getDirectReports,
  getEmployeeProjects,
  getManagerChain,
  mapEmployeePortalRoleToOrgRole,
  type OrgEmployee,
  type OrgRole,
} from "@/lib/rbacHierarchy";
import { ChevronDown, GitBranch, Layers3, User } from "lucide-react";

const roleTone: Record<OrgRole, string> = {
  founder: "bg-indigo-100 text-indigo-700 border-indigo-200",
  ceo: "bg-blue-100 text-blue-700 border-blue-200",
  cto: "bg-cyan-100 text-cyan-700 border-cyan-200",
  cfo: "bg-emerald-100 text-emerald-700 border-emerald-200",
  vp: "bg-violet-100 text-violet-700 border-violet-200",
  director: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
  senior_manager: "bg-sky-100 text-sky-700 border-sky-200",
  manager: "bg-teal-100 text-teal-700 border-teal-200",
  lead: "bg-amber-100 text-amber-700 border-amber-200",
  senior_employee: "bg-orange-100 text-orange-700 border-orange-200",
  employee: "bg-slate-100 text-slate-700 border-slate-200",
  junior_employee: "bg-gray-100 text-gray-700 border-gray-200",
  intern: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

const HierarchyNode = ({ node }: { node: OrgEmployee }) => {
  const children = getDirectReports(node.id, HUMINEX_ORG);
  const [open, setOpen] = useState(true);
  const projects = getEmployeeProjects(node.id);

  return (
    <div className="space-y-2">
      <div className="group relative rounded-xl border border-border/70 bg-card p-3 shadow-sm hover:shadow-md transition-all">
        <button
          type="button"
          className="w-full flex items-start gap-2 text-left"
          onClick={() => setOpen((p) => !p)}
        >
          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
            {node.name
              .split(" ")
              .map((part) => part.charAt(0))
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{node.name}</p>
            <p className="text-xs text-muted-foreground truncate">{node.department}</p>
            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className={cn("text-[10px] border", roleTone[node.role])}>
                {ORG_ROLE_LABELS[node.role]}
              </Badge>
              {children.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {children.length} report{children.length > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>
          {children.length > 0 && (
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform mt-1", open ? "rotate-0" : "-rotate-90")} />
          )}
        </button>

        <div className="hidden group-hover:block absolute z-20 right-0 top-[calc(100%+8px)] w-64 rounded-xl border border-border bg-popover p-3 shadow-xl">
          <p className="text-sm font-semibold text-foreground">{node.name}</p>
          <p className="text-xs text-muted-foreground">{ORG_ROLE_LABELS[node.role]} • {node.department}</p>
          <div className="mt-2 space-y-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Projects</p>
            {projects.length > 0 ? (
              projects.map((project) => (
                <p key={project} className="text-xs text-foreground truncate">• {project}</p>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No active projects listed.</p>
            )}
          </div>
        </div>
      </div>

      {children.length > 0 && open && (
        <div className="ml-4 pl-4 border-l border-border/70 space-y-2">
          {children.map((child) => (
            <HierarchyNode key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
};

interface EmployeeHierarchyTreeProps {
  role: "staff" | "hr" | "manager" | "finance" | "admin";
  profileEmail?: string;
  userEmail?: string;
}

export const EmployeeHierarchyTree = ({ role, profileEmail, userEmail }: EmployeeHierarchyTreeProps) => {
  const currentEmployee = useMemo(() => {
    const fromProfile = getByEmail(profileEmail, HUMINEX_ORG);
    const fromUser = getByEmail(userEmail, HUMINEX_ORG);
    if (fromProfile) return fromProfile;
    if (fromUser) return fromUser;
    const mapped = mapEmployeePortalRoleToOrgRole(role);
    return HUMINEX_ORG.find((e) => e.role === mapped) || HUMINEX_ORG[0];
  }, [profileEmail, role, userEmail]);

  const managerChain = useMemo(
    () => getManagerChain(currentEmployee.id, HUMINEX_ORG),
    [currentEmployee.id]
  );

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" />
          Organization Hierarchy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Your Position</p>
          </div>
          <p className="text-sm text-foreground mt-1">{currentEmployee.name}</p>
          <p className="text-xs text-muted-foreground">
            {ORG_ROLE_LABELS[currentEmployee.role]} • {currentEmployee.department}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Reporting line: {managerChain.length ? managerChain.map((m) => m.name).join(" -> ") : "Top level"}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Layers3 className="h-3.5 w-3.5" />
            Hover a card to view profile and active projects
          </div>
          <HierarchyNode node={currentEmployee} />
        </div>
      </CardContent>
    </Card>
  );
};
