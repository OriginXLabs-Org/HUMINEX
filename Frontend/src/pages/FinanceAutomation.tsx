import SEOLandingTemplate from "./seo/SEOLandingTemplate";

export default function FinanceAutomation() {
  return (
    <SEOLandingTemplate
      title="Finance Automation | HUMINEX Finance Operations Platform"
      description="HUMINEX finance automation platform connects payroll, invoices, expense workflows, and approvals to deliver faster and more accurate finance operations."
      keywords="finance automation, finance operations software, expense management, invoice automation, enterprise finance platform, payroll finance integration"
      canonicalPath="/finance-automation"
      h1="HUMINEX Finance Automation for Modern Teams"
      intro="Automate core finance workflows with real-time visibility across payroll, invoicing, approvals, and operational spending."
      points={[
        "Unified payroll and finance operations with connected data workflows.",
        "Automated invoice and approval journeys with clear accountability.",
        "Faster reporting and better cash-flow visibility for business leaders.",
        "Enterprise-ready controls without slowing down startup execution.",
      ]}
      useCases={[
        "Finance teams reducing delays in approvals and reporting cycles.",
        "COOs and CFOs improving operational control with real-time metrics.",
        "Companies scaling finance processes without adding tool sprawl.",
      ]}
    />
  );
}
