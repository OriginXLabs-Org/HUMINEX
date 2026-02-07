import SEOLandingTemplate from "./seo/SEOLandingTemplate";

export default function PayrollSoftware() {
  return (
    <SEOLandingTemplate
      title="Payroll Software | HUMINEX Payroll Automation Platform"
      description="HUMINEX payroll software automates salary processing, statutory compliance, tax workflows, and employee payouts for startups and enterprises."
      keywords="payroll software, payroll automation, payroll management system, payroll for startups, enterprise payroll platform, payroll compliance"
      canonicalPath="/payroll-software"
      h1="HUMINEX Payroll Software for Fast, Accurate, Compliant Payroll"
      intro="Run payroll in minutes with built-in automation for salary structures, deductions, reimbursements, statutory workflows, and finance-ready reporting."
      points={[
        "Automated salary runs with configurable payroll cycles and policies.",
        "Built-in compliance support for payroll governance and audit trails.",
        "Integrated employee data, attendance, leave, and finance controls.",
        "Scales from startup payroll to enterprise multi-entity operations.",
      ]}
      useCases={[
        "High-growth startups replacing spreadsheets and manual payroll errors.",
        "Enterprises standardizing payroll processes across teams and locations.",
        "Finance leaders seeking faster month-end closing and reconciliation.",
      ]}
    />
  );
}
