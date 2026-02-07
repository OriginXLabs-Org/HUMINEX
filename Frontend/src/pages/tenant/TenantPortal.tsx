import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { TenantLayout } from "@/components/tenant/TenantLayout";
import TenantDashboard from "./TenantDashboard";
import TenantWorkforce from "./TenantWorkforce";
import TenantPayroll from "./TenantPayroll";
import TenantRecruitment from "./TenantRecruitment";
import TenantAttendance from "./TenantAttendance";
import TenantCompliance from "./TenantCompliance";
import TenantFinance from "./TenantFinance";
import TenantBGV from "./TenantBGV";
import TenantInsurance from "./TenantInsurance";
import TenantProjects from "./TenantProjects";
import TenantDocuments from "./TenantDocuments";
import TenantAnnouncements from "./TenantAnnouncements";
import TenantPerformance from "./TenantPerformance";
import TenantOpZenix from "./TenantOpZenix";
import TenantProximaAI from "./TenantProximaAI";
import TenantSettings from "./TenantSettings";
import TenantEMS from "./TenantEMS";
import TenantIdentityAccess from "./TenantIdentityAccess";
import TenantRiskGovernance from "./TenantRiskGovernance";
import TenantRequests from "./TenantRequests";
import TenantNotifications from "./TenantNotifications";
import TenantManagedOps from "./TenantManagedOps";
import TenantEmployees from "./TenantEmployees";
import TenantOpenHumanStudio from "./TenantOpenHumanStudio";
import TenantOpenHumanCandidatePreview from "./TenantOpenHumanCandidatePreview";
import TenantIntegrations from "./settings/TenantIntegrations";
import TenantAPIKeys from "./settings/TenantAPIKeys";
import TenantBilling from "./settings/TenantBilling";
import TenantDataExport from "./settings/TenantDataExport";
import TenantCustomDomain from "./settings/TenantCustomDomain";
import TenantWidgetAccess from "./settings/TenantWidgetAccess";
import TenantSidebarAccess from "./settings/TenantSidebarAccess";
import { useTenantRole } from "@/hooks/useTenantRole";
import {
  canAccessTenantModule,
  readTenantAccessConfig,
  TENANT_ACCESS_UPDATED_EVENT,
  TenantAccessConfig,
  TenantModuleId,
} from "@/lib/tenantRbac";
import { Loader2 } from "lucide-react";

// Placeholder for remaining pages
const PlaceholderPage: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="space-y-6 animate-fade-in">
    <div>
      <h1 className="text-2xl font-bold text-[#0F1E3A]">{title}</h1>
      <p className="text-sm text-[#6B7280] mt-1">{description}</p>
    </div>
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
      <div className="w-16 h-16 rounded-full bg-[#F7F9FC] mx-auto mb-4 flex items-center justify-center">
        <svg className="w-8 h-8 text-[#6B7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-[#0F1E3A] mb-2">Coming Soon</h3>
      <p className="text-[#6B7280] max-w-md mx-auto">This module is under development.</p>
    </div>
  </div>
);

/**
 * TenantPortal - Tenant Super-Admin Portal
 * 
 * Route: /tenant/*
 * 
 * This is the Tenant Organization Admin Panel - visible ONLY to the client's 
 * internal Super Admin / Admin roles. This is where a company configures 
 * their entire HUMINEX workspace.
 * 
 * Used for:
 * - Org structure setup
 * - HR, Payroll, Finance, Compliance, BGV settings
 * - Roles & permissions for their team
 * - API keys & Integrations
 * - Custom domain & Company-level configurations
 */
const TenantPortal: React.FC = () => {
  const { role, loading: roleLoading } = useTenantRole();
  const [accessConfig, setAccessConfig] = React.useState<TenantAccessConfig>(() => readTenantAccessConfig());

  React.useEffect(() => {
    const refreshAccess = () => setAccessConfig(readTenantAccessConfig());
    window.addEventListener("storage", refreshAccess);
    window.addEventListener(TENANT_ACCESS_UPDATED_EVENT, refreshAccess);
    return () => {
      window.removeEventListener("storage", refreshAccess);
      window.removeEventListener(TENANT_ACCESS_UPDATED_EVENT, refreshAccess);
    };
  }, []);

  const routeWithAccess = (moduleId: TenantModuleId, element: React.ReactElement) =>
    canAccessTenantModule(role, moduleId, accessConfig) ? element : <Navigate to="/tenant/dashboard" replace />;

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center">
        <div className="flex items-center gap-2 text-[#6B7280]">
          <Loader2 className="w-5 h-5 animate-spin text-[#005EEB]" />
          <span className="text-sm">Loading employer workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<TenantLayout />}>
        <Route index element={routeWithAccess("dashboard", <Navigate to="/tenant/dashboard" replace />)} />
        <Route path="dashboard" element={routeWithAccess("dashboard", <TenantDashboard />)} />
        
        {/* Workforce Management */}
        <Route path="workforce" element={routeWithAccess("workforce", <TenantWorkforce />)} />
        <Route path="employees" element={routeWithAccess("employees", <TenantEmployees />)} />
        <Route path="attendance" element={routeWithAccess("attendance", <TenantAttendance />)} />
        <Route path="documents" element={routeWithAccess("documents", <TenantDocuments />)} />
        <Route path="announcements" element={routeWithAccess("announcements", <TenantAnnouncements />)} />
        
        {/* Payroll & Finance */}
        <Route path="payroll" element={routeWithAccess("payroll", <TenantPayroll />)} />
        <Route path="finance" element={routeWithAccess("finance", <TenantFinance />)} />
        <Route path="insurance" element={routeWithAccess("insurance", <TenantInsurance />)} />
        
        {/* Talent & Hiring */}
        <Route path="recruitment" element={routeWithAccess("recruitment", <TenantRecruitment />)} />
        <Route path="bgv" element={routeWithAccess("bgv", <TenantBGV />)} />
        <Route path="performance" element={routeWithAccess("performance", <TenantPerformance />)} />
        
        {/* Operations */}
        <Route path="projects" element={routeWithAccess("projects", <TenantProjects />)} />
        <Route path="ems" element={routeWithAccess("ems", <TenantEMS />)} />
        <Route path="requests" element={routeWithAccess("requests", <TenantRequests />)} />
        <Route path="notifications" element={routeWithAccess("notifications", <TenantNotifications />)} />
        
        {/* Compliance & Risk */}
        <Route path="compliance" element={routeWithAccess("compliance", <TenantCompliance />)} />
        <Route path="risk" element={routeWithAccess("risk", <TenantRiskGovernance />)} />
        <Route path="identity" element={routeWithAccess("identity", <TenantIdentityAccess />)} />
        
        {/* Intelligence & Automation */}
        <Route path="intelligence" element={routeWithAccess("intelligence", <TenantProximaAI />)} />
        <Route path="openhuman-studio" element={routeWithAccess("openhuman-studio", <TenantOpenHumanStudio />)} />
        <Route path="openhuman-candidate-preview" element={routeWithAccess("openhuman-studio", <TenantOpenHumanCandidatePreview />)} />
        <Route path="automations" element={routeWithAccess("automations", <TenantOpZenix />)} />
        <Route path="managed-ops" element={routeWithAccess("managed-ops", <TenantManagedOps />)} />
        
        {/* Settings */}
        <Route path="settings" element={routeWithAccess("settings", <TenantSettings />)} />
        <Route path="settings/integrations" element={routeWithAccess("settings-integrations", <TenantIntegrations />)} />
        <Route path="settings/api-keys" element={routeWithAccess("settings-api-keys", <TenantAPIKeys />)} />
        <Route path="settings/billing" element={routeWithAccess("settings-billing", <TenantBilling />)} />
        <Route path="settings/export" element={routeWithAccess("settings-export", <TenantDataExport />)} />
        <Route path="settings/domain" element={routeWithAccess("settings-domain", <TenantCustomDomain />)} />
        <Route path="settings/widgets" element={routeWithAccess("settings-widgets", <TenantWidgetAccess />)} />
        <Route path="settings/sidebar" element={routeWithAccess("settings-sidebar", <TenantSidebarAccess />)} />
        
        <Route path="onboarding" element={<PlaceholderPage title="Onboarding" description="Complete your organization setup" />} />
        <Route path="*" element={<PlaceholderPage title="Page Not Found" description="The page you're looking for doesn't exist" />} />
      </Route>
    </Routes>
  );
};

export default TenantPortal;
