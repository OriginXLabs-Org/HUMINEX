import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useClientTier } from "@/hooks/useClientTier";
import { useEmployeeRole } from "@/hooks/useEmployeeRole";
import { platformClient as platform } from "@/integrations/platform/client";
import { PortalSidebar } from "@/components/portal/PortalSidebar";
import { PortalHeader } from "@/components/portal/PortalHeader";
import { PortalDashboard } from "@/components/portal/PortalDashboard";
import { PortalProjects } from "@/components/portal/PortalProjects";
import { PortalFiles } from "@/components/portal/PortalFiles";
import { PortalInvoices } from "@/components/portal/PortalInvoices";
import { PortalTickets } from "@/components/portal/PortalTickets";
import { PortalMeetings } from "@/components/portal/PortalMeetings";
import { PortalTeam } from "@/components/portal/PortalTeam";
import { PortalSettings } from "@/components/portal/PortalSettings";
import { PortalAIDashboard } from "@/components/portal/PortalAIDashboard";
import { PortalFeedback } from "@/components/portal/PortalFeedback";
import { PortalResources } from "@/components/portal/PortalResources";
import { PortalMSPMonitoring } from "@/components/portal/PortalMSPMonitoring";
import TierComparison from "@/pages/portal/TierComparison";
import { cn } from "@/lib/utils";

export default function Portal() {
  const defaultVisibility = {
    finance: true,
    payslips: true,
    insurance: true,
    benefits: true,
    documents: true,
  };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, loading, signOut } = useAuth();
  const { loading: tierLoading } = useClientTier();
  const { loading: roleLoading } = useEmployeeRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [employeeVisibility, setEmployeeVisibility] = useState(defaultVisibility);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/portal/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    const accessRaw = localStorage.getItem("huminex_employee_portal_access");
    if (!accessRaw) return;
    try {
      const accessMap = JSON.parse(accessRaw) as Record<string, boolean>;
      const emailToCheck = (profile?.email || user.email || "").toLowerCase();
      if (emailToCheck && accessMap[emailToCheck] === false) {
        navigate("/portal/login", { replace: true });
      }
    } catch (error) {
      console.error("Invalid employee portal access config", error);
    }
  }, [navigate, profile?.email, user]);

  useEffect(() => {
    if (!user) return;
    const emailToCheck = (profile?.email || user.email || "").toLowerCase();
    if (!emailToCheck) return;
    try {
      const visibilityRaw = localStorage.getItem("huminex_employee_visibility");
      if (!visibilityRaw) {
        setEmployeeVisibility(defaultVisibility);
        return;
      }
      const visibilityMap = JSON.parse(visibilityRaw) as Record<string, typeof defaultVisibility>;
      setEmployeeVisibility(visibilityMap[emailToCheck] || defaultVisibility);
    } catch (error) {
      console.error("Invalid employee visibility config", error);
      setEmployeeVisibility(defaultVisibility);
    }
  }, [profile?.email, user]);

  useEffect(() => {
    if (user?.id.startsWith("dev-")) {
      const savedDemoProfile = localStorage.getItem("huminex_dev_employee_profile");
      if (savedDemoProfile) {
        try {
          setProfile(JSON.parse(savedDemoProfile));
        } catch (error) {
          console.error("Invalid dev employee profile in localStorage", error);
        }
      } else {
        setProfile({
          full_name: "Kiran Sen",
          email: "lead.frontend@gethuminex.com",
          designation: "Senior Engineer",
          department: "Engineering",
        });
      }
      return;
    }

    if (user && !user.id.startsWith("dev-")) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await platform
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    setProfile(data);
  };

  if (loading || tierLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const renderContent = () => {
    const path = location.pathname;
    
    if (path === "/portal" || path === "/portal/") {
      return (
        <PortalDashboard
          userId={user?.id}
          profile={profile}
          userEmail={user?.email || undefined}
          employeeVisibility={employeeVisibility}
        />
      );
    }
    if (path.startsWith("/portal/projects")) return <PortalProjects userId={user?.id} />;
    if (path.startsWith("/portal/files")) return <PortalFiles userId={user?.id} />;
    if (path.startsWith("/portal/invoices")) return <PortalInvoices userId={user?.id} />;
    if (path.startsWith("/portal/tickets")) return <PortalTickets userId={user?.id} />;
    if (path.startsWith("/portal/meetings")) return <PortalMeetings userId={user?.id} />;
    if (path.startsWith("/portal/team")) return <PortalTeam />;
    if (path.startsWith("/portal/settings")) return <PortalSettings userId={user?.id} profile={profile} />;
    if (path.startsWith("/portal/ai")) return <PortalAIDashboard userId={user?.id} />;
    if (path.startsWith("/portal/msp")) return <PortalMSPMonitoring />;
    if (path.startsWith("/portal/feedback")) return <PortalFeedback userId={user?.id} />;
    if (path.startsWith("/portal/resources")) return <PortalResources />;
    if (path.startsWith("/portal/plans")) return <TierComparison />;
    
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-heading font-bold mb-2">Coming Soon</h2>
        <p className="text-muted-foreground">This section is under development</p>
      </div>
    );
  };

  return (
    <div className="h-screen bg-background overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <PortalSidebar 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        sidebarCollapsed={sidebarCollapsed}
        employeeVisibility={employeeVisibility}
      />

      {/* Main Content */}
      <div
        className={cn(
          "h-screen transition-all duration-300",
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        )}
      >
        <div className="h-full overflow-y-auto">
          <PortalHeader
            setSidebarOpen={setSidebarOpen}
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            userId={user?.id}
            user={user}
            profile={profile}
            signOut={signOut}
          />
          <main className="p-4 lg:p-6">
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
}
