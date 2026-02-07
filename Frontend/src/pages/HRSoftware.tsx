import SEOLandingTemplate from "./seo/SEOLandingTemplate";

export default function HRSoftware() {
  return (
    <SEOLandingTemplate
      title="HR Software | HUMINEX Human Resource Management System"
      description="HUMINEX HR software unifies employee lifecycle, attendance, leave, onboarding, performance, and HR operations in one platform."
      keywords="HR software, human resource management system, HRMS, employee management software, hire to retire software, HR platform"
      canonicalPath="/hr-software"
      h1="HUMINEX HR Software From Hire to Retire"
      intro="Manage the complete employee lifecycle with one system for onboarding, workforce data, attendance, policies, engagement, and HR automation."
      points={[
        "Centralized employee records with role-based access and audit logs.",
        "Attendance, leave, and policy workflows integrated into HR operations.",
        "Streamlined onboarding and lifecycle transitions with automation.",
        "Designed for both startup agility and enterprise governance.",
      ]}
      useCases={[
        "HR teams reducing repetitive admin work through workflow automation.",
        "People ops leaders improving employee experience and process consistency.",
        "Organizations replacing disconnected HR tools with one platform.",
      ]}
    />
  );
}
