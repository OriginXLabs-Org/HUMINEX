export type PricingRegion = "india" | "global";
export type BillingCycle = "monthly" | "annual";

export interface PlanDefinition {
  id: "startup" | "growth" | "enterprise";
  name: string;
  description: string;
  monthlyPerEmployee: number | null;
  minEmployees?: number;
  maxEmployees?: number;
  startingLabel?: string;
}

export const BILLING_DEFAULTS = {
  trialDays: 30,
  annualDiscountPercent: 20,
  aiCreditsPriceInr: 500,
  aiCreditsUnits: 50,
  aiInterviewCreditCost: 1,
  aiResumeScreeningCreditCost: 0.5,
  aiInterviewDirectPriceInr: 129,
} as const;

export const REGION_CURRENCY: Record<PricingRegion, "INR" | "USD"> = {
  india: "INR",
  global: "USD",
};

export const REGION_SYMBOL: Record<PricingRegion, string> = {
  india: "₹",
  global: "$",
};

export const PRICING_PLANS: Record<PricingRegion, PlanDefinition[]> = {
  india: [
    {
      id: "startup",
      name: "Startup",
      description: "For early teams getting started",
      monthlyPerEmployee: 199,
      minEmployees: 5,
      maxEmployees: 50,
    },
    {
      id: "growth",
      name: "Growth",
      description: "For scaling teams",
      monthlyPerEmployee: 349,
      minEmployees: 50,
      maxEmployees: 300,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "For large and regulated organizations",
      monthlyPerEmployee: 499,
      startingLabel: "Custom pricing (annual contract)",
    },
  ],
  global: [
    {
      id: "startup",
      name: "Startup",
      description: "For early teams getting started",
      monthlyPerEmployee: 3,
      minEmployees: 5,
      maxEmployees: 50,
    },
    {
      id: "growth",
      name: "Growth",
      description: "For scaling teams",
      monthlyPerEmployee: 5,
      minEmployees: 50,
      maxEmployees: 300,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "For large and regulated organizations",
      monthlyPerEmployee: 8,
      startingLabel: "Custom pricing (annual contract)",
    },
  ],
};

export interface PlanQuote {
  plan: PlanDefinition;
  perEmployeePrice: number | null;
  monthlyTotal: number;
  annualTotal: number;
}

export const getPlanPriceByCycle = (
  monthlyPerEmployee: number,
  cycle: BillingCycle,
): number => {
  if (cycle === "annual") {
    return Number(
      (monthlyPerEmployee * (1 - BILLING_DEFAULTS.annualDiscountPercent / 100)).toFixed(2),
    );
  }
  return monthlyPerEmployee;
};

export const pickPlanForEmployees = (
  region: PricingRegion,
  employees: number,
): PlanDefinition => {
  const plans = PRICING_PLANS[region];
  if (employees <= 50) return plans[0];
  if (employees <= 300) return plans[1];
  return plans[2];
};

export const buildPlanQuote = (
  region: PricingRegion,
  employees: number,
  cycle: BillingCycle,
): PlanQuote => {
  const plan = pickPlanForEmployees(region, employees);
  const fallbackPrice = plan.monthlyPerEmployee ?? 0;
  const perEmployeePrice = plan.monthlyPerEmployee
    ? getPlanPriceByCycle(plan.monthlyPerEmployee, cycle)
    : null;

  const monthlyTotal = Math.round(
    employees * (perEmployeePrice ?? fallbackPrice),
  );
  const annualTotal = Math.round(monthlyTotal * 12);

  return {
    plan,
    perEmployeePrice,
    monthlyTotal,
    annualTotal,
  };
};

