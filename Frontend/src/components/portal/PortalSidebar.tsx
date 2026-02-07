import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useClientTier } from "@/hooks/useClientTier";
import { useEmployeeRole, isModuleAccessibleByRole, EmployeeRole } from "@/hooks/useEmployeeRole";
import { useSidebarAccessSync } from "@/hooks/useWidgetAccessSync";
import { TierUpgradePrompt, getRequiredTierForModule } from "@/components/portal/TierUpgradePrompt";
import huminexLogo from "@/assets/huminex-mark.svg";
import { 
  LayoutDashboard, FolderKanban, FileText, Receipt, HeadphonesIcon, Calendar,
  Brain, Settings, Users, Star, BookOpen, Server, Crown, Lock, Sparkles
} from "lucide-react";

const allSidebarItems = [
  { id: "dashboard", name: "Dashboard", href: "/portal", icon: LayoutDashboard, section: "Overview" },
  { id: "projects", name: "Projects", href: "/portal/projects", icon: FolderKanban, section: "Work" },
  { id: "files", name: "Files", href: "/portal/files", icon: FileText, section: "Work" },
  { id: "invoices", name: "Invoices", href: "/portal/invoices", icon: Receipt, section: "Billing" },
  { id: "tickets", name: "Tickets", href: "/portal/tickets", icon: HeadphonesIcon, section: "Support" },
  { id: "meetings", name: "Meetings", href: "/portal/meetings", icon: Calendar, section: "Support" },
  { id: "ai-dashboard", name: "AI Dashboard", href: "/portal/ai", icon: Brain, section: "AI & Monitoring" },
  { id: "msp-monitoring", name: "MSP Monitoring", href: "/portal/msp", icon: Server, section: "AI & Monitoring" },
  { id: "team", name: "Team", href: "/portal/team", icon: Users, section: "More" },
  { id: "feedback", name: "Feedback", href: "/portal/feedback", icon: Star, section: "More" },
  { id: "resources", name: "Resources", href: "/portal/resources", icon: BookOpen, section: "More" },
  { id: "settings", name: "Settings", href: "/portal/settings", icon: Settings, section: "Account" },
];

const staffSectionLabels: Record<string, string> = {
  Overview: "Home",
  Work: "Work",
  Billing: "Time & Pay",
  Support: "Connect",
  "AI & Monitoring": "Insights",
  More: "More",
  Account: "Account",
};

const roleLabels: Record<EmployeeRole, string> = {
  staff: "Staff",
  hr: "HR",
  manager: "Manager",
  finance: "Finance",
  admin: "Admin"
};

const roleColors: Record<EmployeeRole, string> = {
  staff: "bg-gray-500/10 text-gray-600",
  hr: "bg-pink-500/10 text-pink-600",
  manager: "bg-blue-500/10 text-blue-600",
  finance: "bg-green-500/10 text-green-600",
  admin: "bg-purple-500/10 text-purple-600"
};

const tierColors: Record<string, string> = {
  basic: "bg-gray-500/10 text-gray-600",
  standard: "bg-blue-500/10 text-blue-600",
  advanced: "bg-purple-500/10 text-purple-600",
  enterprise: "bg-amber-500/10 text-amber-600",
};

interface PortalSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  employeeVisibility: {
    finance: boolean;
    payslips: boolean;
    insurance: boolean;
    benefits: boolean;
    documents: boolean;
  };
}

export const PortalSidebar = ({
  sidebarOpen,
  setSidebarOpen,
  sidebarCollapsed,
  employeeVisibility,
}: PortalSidebarProps) => {
  const location = useLocation();
  const { tier, isModuleAllowed } = useClientTier();
  const { role: employeeRole } = useEmployeeRole();
  const { isModuleEnabled, lastUpdate } = useSidebarAccessSync(employeeRole);
  const [openSections, setOpenSections] = useState<string[]>(["Overview", "Work", "Billing", "Support", "More", "Account"]);
  const isSimpleEmployeeView = employeeRole === "staff";
  const canViewPlanControls = employeeRole === "admin";

  const isActive = (path: string) => {
    if (path === "/portal") return location.pathname === "/portal";
    return location.pathname.startsWith(path);
  };

  // Group items by section, checking tier, role, and tenant admin access with real-time sync
  const applyVisibilityPolicy = (itemId: string) => {
    if (itemId === "files") return employeeVisibility.documents;
    if (itemId === "invoices") return employeeVisibility.finance;
    if (itemId === "resources") return employeeVisibility.benefits && employeeVisibility.insurance;
    return true;
  };

  const rawSections = allSidebarItems.reduce((acc, item) => {
    const section = acc.find(s => s.title === item.section);
    const isTierAllowed = isModuleAllowed(item.name);
    const isRoleAllowed = isModuleAccessibleByRole(item.name, employeeRole);
    const isTenantEnabled = isModuleEnabled(item.id);
    const isVisibleByPolicy = applyVisibilityPolicy(item.id);
    const itemWithAccess = { ...item, isTierAllowed, isRoleAllowed, isTenantEnabled, isVisibleByPolicy };
    
    if (section) {
      section.items.push(itemWithAccess);
    } else {
      acc.push({ title: item.section, items: [itemWithAccess] });
    }
    return acc;
  }, [] as { title: string; items: (typeof allSidebarItems[0] & { isTierAllowed: boolean; isRoleAllowed: boolean; isTenantEnabled: boolean; isVisibleByPolicy: boolean })[] }[]);

  const sidebarSections = rawSections
    .map((section) => {
      if (!isSimpleEmployeeView) return section;
      // For staff view, keep only truly accessible items and hide lock noise.
      return {
        ...section,
        displayTitle: staffSectionLabels[section.title] || section.title,
        items: section.items.filter(
          (item) => item.isTenantEnabled && item.isRoleAllowed && item.isTierAllowed && item.isVisibleByPolicy
        ),
      };
    })
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.isVisibleByPolicy),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside className={cn(
      "fixed top-0 left-0 h-full bg-card border-r border-border/60 z-50",
      "transform transition-all duration-300",
      sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      sidebarCollapsed ? "w-64 lg:w-20" : "w-64"
    )}>
      <div className="flex flex-col h-full">
        {/* Logo & Plan Info */}
        <div className="p-4 border-b border-border/60">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={huminexLogo} alt="HUMINEX" className="h-9 w-9" />
            <div className={cn("min-w-0", sidebarCollapsed && "lg:hidden")}>
              <span className="text-foreground font-heading font-bold text-sm block">HUMINEX</span>
              <span className="text-primary font-heading font-semibold text-xs">
                {isSimpleEmployeeView ? "Employee Workspace" : "HUMINEX Portal"}
              </span>
            </div>
          </Link>
          <div className={cn("mt-3 flex flex-col gap-1.5", sidebarCollapsed && "lg:hidden")}>
            {canViewPlanControls && (
              <div className="flex items-center gap-2">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                <Badge className={cn("text-xs capitalize", tierColors[tier])}>
                  {tier} Plan
                </Badge>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-primary" />
            <Badge className={cn("text-xs", roleColors[employeeRole])}>
              {roleLabels[employeeRole]} Access
            </Badge>
          </div>
          {canViewPlanControls && (
            <Link 
              to="/portal/plans" 
              className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">Compare Plans</span>
            </Link>
          )}
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <nav className={cn("space-y-4", isSimpleEmployeeView ? "p-2.5" : "p-3")}>
            {sidebarSections.map((section) => (
              <Collapsible
                key={section.title}
                open={openSections.includes(section.title)}
                onOpenChange={(isOpen) =>
                  setOpenSections((prev) =>
                    isOpen ? [...new Set([...prev, section.title])] : prev.filter((s) => s !== section.title)
                  )
                }
              >
                <CollapsibleTrigger className={cn(
                  "w-full py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 rounded-md hover:bg-muted/40 text-left",
                  isSimpleEmployeeView ? "px-2.5" : "px-3",
                  sidebarCollapsed && "lg:hidden"
                )}>
                  {(section as any).displayTitle || section.title}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    if (!item.isTenantEnabled && !isSimpleEmployeeView) {
                      return (
                        <div
                          key={item.name}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl text-muted-foreground/40 cursor-not-allowed"
                          title={`${item.name} has been disabled by your organization admin`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className={cn("text-sm font-medium flex-1", sidebarCollapsed && "lg:hidden")}>{item.name}</span>
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                      );
                    }

                    if (!item.isRoleAllowed && !isSimpleEmployeeView) {
                      return (
                        <div
                          key={item.name}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl text-muted-foreground/50 cursor-not-allowed"
                          title={`${item.name} requires higher role access`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className={cn("text-sm font-medium flex-1", sidebarCollapsed && "lg:hidden")}>{item.name}</span>
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                      );
                    }

                    if (!item.isTierAllowed && !isSimpleEmployeeView) {
                      return (
                        <TierUpgradePrompt
                          key={item.name}
                          moduleName={item.name}
                          currentTier={tier}
                          requiredTier={getRequiredTierForModule(item.name)}
                          icon={Icon}
                        />
                      );
                    }

                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={cn(
                          "flex items-center rounded-xl transition-all duration-200 group",
                          isSimpleEmployeeView ? "gap-2.5 px-2.5 py-2.5" : "gap-3 px-3 py-2",
                          sidebarCollapsed && "lg:justify-center lg:px-2.5",
                          active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <Icon className={cn(isSimpleEmployeeView ? "w-[17px] h-[17px]" : "w-4 h-4", active ? "text-primary" : "group-hover:text-foreground")} />
                        <span className={cn(isSimpleEmployeeView ? "text-[13px] font-medium" : "text-sm font-medium", sidebarCollapsed && "lg:hidden")}>{item.name}</span>
                      </Link>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            ))}

          </nav>
        </ScrollArea>
      </div>
    </aside>
  );
};
