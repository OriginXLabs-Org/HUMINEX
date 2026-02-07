import SEOLandingTemplate from "./seo/SEOLandingTemplate";

export default function EnterpriseHRMS() {
  return (
    <SEOLandingTemplate
      title="Enterprise HRMS | HUMINEX Workforce Operating System"
      description="HUMINEX enterprise HRMS combines payroll, HR, compliance, recruitment, and finance in one AI-powered workforce operating system."
      keywords="enterprise HRMS, workforce operating system, enterprise payroll software, enterprise HR platform, all in one HRMS"
      canonicalPath="/enterprise-hrms"
      h1="HUMINEX Enterprise HRMS Built to Compete with Legacy Platforms"
      intro="Move beyond fragmented tools with one enterprise-grade workforce operating system for payroll, HR, finance, compliance, and hiring."
      points={[
        "One platform for payroll, HR, finance, and compliance operations.",
        "Role-based access, structured governance, and scalable architecture.",
        "Operational intelligence for faster decisions and lower process latency.",
        "Competitive alternative for teams evaluating Workday, ADP, and similar suites.",
      ]}
      useCases={[
        "Enterprise groups consolidating multiple tools into one secure system.",
        "Operations leaders standardizing workflows across departments.",
        "Founders and CXOs looking for startup speed with enterprise controls.",
      ]}
    />
  );
}
