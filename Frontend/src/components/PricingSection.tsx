import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Zap, Star, Building2, Globe, IndianRupee, TrendingUp, Shield, Clock } from "lucide-react";
import { PricingTierCard } from "./pricing/PricingTierCard";
import { PricingCalculator } from "./pricing/PricingCalculator";
import { PricingFAQ } from "./pricing/PricingFAQ";
import { PricingComparisonModal } from "./PricingComparisonModal";
import { useClickstream } from "@/hooks/useClickstream";
import { BILLING_DEFAULTS, PRICING_PLANS, REGION_SYMBOL, getPlanPriceByCycle } from "@/lib/billingPricing";

const planFeatures: Record<string, string[]> = {
  startup: [
    "Employee and org management",
    "Payroll processing",
    "Payslips and salary reports",
    "Leave and attendance",
    "Statutory compliance (basic)",
    "Email support",
  ],
  growth: [
    "Everything in Startup",
    "Advanced payroll rules",
    "Multi-location payroll",
    "Approval workflows",
    "Audit logs",
    "API access",
    "Priority support",
  ],
  enterprise: [
    "All Growth features",
    "Enterprise SSO (Entra ID)",
    "Custom workflows and policies",
    "SLA (99.9%)",
    "Dedicated onboarding and support",
    "Compliance customization",
    "OpenHuman and AI capabilities bundled",
  ],
};

const cardIconByPlan: Record<string, typeof Zap> = {
  startup: Zap,
  growth: Star,
  enterprise: Building2,
};

const cardGradientByPlan: Record<string, string> = {
  startup: "from-blue-500 to-cyan-500",
  growth: "from-primary to-accent",
  enterprise: "from-emerald-500 to-teal-500",
};

export const PricingSection = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [region, setRegion] = useState<"india" | "global">("india");
  const [selectedPlanName, setSelectedPlanName] = useState<string | null>(null);
  const { trackEvent } = useClickstream();

  const pricing = PRICING_PLANS[region];
  const currency = REGION_SYMBOL[region];

  const viewPlans = useMemo(
    () =>
      pricing.map((plan) => {
        const displayPrice =
          plan.monthlyPerEmployee !== null
            ? getPlanPriceByCycle(plan.monthlyPerEmployee, isAnnual ? "annual" : "monthly")
            : null;

        return {
          ...plan,
          displayPrice,
        };
      }),
    [pricing, isAnnual],
  );

  const handlePlanSelect = (planName: string, price: number) => {
    setSelectedPlanName(planName);
    trackEvent("plan_selected", { planName, price, region, isAnnual });
  };

  return (
    <section id="pricing" className="py-24 bg-background relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Transparent Pricing
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-foreground mb-6">
            Workday-level Power.{" "}
            <span className="text-gradient">Startup-friendly Pricing.</span>
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto">
            Replace 12 tools with one AI-native platform. No hidden fees. No surprises.
            Scale your workforce management with confidence.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          <Button
            variant={region === "india" ? "default" : "outline"}
            onClick={() => setRegion("india")}
            className={`h-12 px-6 rounded-full font-semibold transition-all ${
              region === "india"
                ? "bg-gradient-to-r from-orange-500 to-green-600 text-white shadow-lg"
                : "hover:border-primary"
            }`}
          >
            <IndianRupee className="w-4 h-4 mr-2" />
            India (₹)
          </Button>
          <Button
            variant={region === "global" ? "default" : "outline"}
            onClick={() => setRegion("global")}
            className={`h-12 px-6 rounded-full font-semibold transition-all ${
              region === "global"
                ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg"
                : "hover:border-primary"
            }`}
          >
            <Globe className="w-4 h-4 mr-2" />
            Global ($)
          </Button>
        </div>

        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm font-medium ${!isAnnual ? "text-foreground" : "text-muted-foreground"}`}>
            Monthly
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="relative w-20 h-10 rounded-full bg-secondary border-2 border-border transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 hover:border-primary/50"
            role="switch"
            aria-checked={isAnnual}
          >
            <div
              className={`absolute top-1 w-7 h-7 rounded-full bg-gradient-to-r from-primary to-accent shadow-lg transition-transform duration-300 ${
                isAnnual ? "translate-x-11" : "translate-x-1"
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${isAnnual ? "text-foreground" : "text-muted-foreground"}`}>
            Annual
            <span className="ml-2 px-3 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold">
              Save {BILLING_DEFAULTS.annualDiscountPercent}%
            </span>
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 mb-12">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4 text-primary" />
            No setup fees
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 text-primary" />
            {BILLING_DEFAULTS.trialDays}-Day Free Trial
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="w-4 h-4 text-primary" />
            No hidden fees
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto mb-20">
          {viewPlans.map((plan) => (
            <PricingTierCard
              key={plan.id}
              name={plan.name}
              description={plan.description}
              price={plan.id === "enterprise" ? null : plan.displayPrice}
              priceUnitLabel="/employee/month"
              customPriceLabel={plan.startingLabel ?? "Custom Pricing"}
              employeeLimit={
                plan.minEmployees && plan.maxEmployees
                  ? `${plan.minEmployees}-${plan.maxEmployees} employees`
                  : "300+ employees"
              }
              icon={cardIconByPlan[plan.id]}
              popular={plan.id === "growth"}
              features={planFeatures[plan.id]}
              cta={plan.id === "enterprise" ? "Contact Sales" : "Start Free Trial"}
              ctaLink={plan.id === "enterprise" ? "/contact" : "/get-quote"}
              gradient={cardGradientByPlan[plan.id]}
              isAnnual={isAnnual}
              currency={currency}
              onSelect={handlePlanSelect}
              isSelected={selectedPlanName === plan.name}
            />
          ))}
        </div>

        <div className="text-center mb-16">
          <p className="text-muted-foreground mb-4">
            Compare total cost with legacy HR platforms
          </p>
          <PricingComparisonModal />
        </div>

        <div className="mb-20">
          <PricingCalculator region={region} isAnnual={isAnnual} />
        </div>

        <div className="mb-16 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
          <p className="text-sm text-foreground font-medium">
            OpenHuman and advanced AI modules are bundled for Enterprise plans.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Standalone AI credit packaging is available via sales engagement.
          </p>
        </div>

        <div className="mb-16">
          <PricingFAQ />
        </div>
      </div>
    </section>
  );
};

