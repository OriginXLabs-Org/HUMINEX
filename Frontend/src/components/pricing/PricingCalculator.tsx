import { useMemo, useState } from "react";
import { Calculator, Users, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  BILLING_DEFAULTS,
  REGION_CURRENCY,
  REGION_SYMBOL,
  buildPlanQuote,
  type PricingRegion,
} from "@/lib/billingPricing";

interface PricingCalculatorProps {
  region: PricingRegion;
  isAnnual: boolean;
}

export const PricingCalculator = ({ region, isAnnual }: PricingCalculatorProps) => {
  const [employees, setEmployees] = useState<number>(50);

  const quote = useMemo(
    () => buildPlanQuote(region, employees, isAnnual ? "annual" : "monthly"),
    [region, employees, isAnnual],
  );

  const currency = REGION_SYMBOL[region];
  const savingsPerYear = Math.round(
    quote.monthlyTotal * 12 * (BILLING_DEFAULTS.annualDiscountPercent / 100),
  );

  const format = (amount: number) => {
    return new Intl.NumberFormat(region === "india" ? "en-IN" : "en-US", {
      style: "currency",
      currency: REGION_CURRENCY[region],
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-gradient-to-br from-card via-card to-primary/5 rounded-3xl border border-border/50 p-8 lg:p-10 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Calculator className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-heading font-bold text-foreground">Instant Pricing Calculator</h3>
          <p className="text-muted-foreground text-sm">Aligned with HUMINEX pricing plans</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <p className="text-foreground font-medium flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-primary" />
              Number of Employees
            </p>
            <Input
              type="range"
              min="5"
              max="1500"
              value={employees}
              onChange={(e) => setEmployees(Number(e.target.value))}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>5</span>
              <span className="text-lg font-bold text-primary">{employees}</span>
              <span>1500+</span>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/50 p-4 space-y-2">
            <p className="text-sm text-muted-foreground">Billing model</p>
            <p className="text-sm font-medium text-foreground">Primary: per_employee_per_month</p>
            <p className="text-sm font-medium text-foreground">Secondary: AI credits (consumable)</p>
            <p className="text-xs text-muted-foreground">
              Trial: {BILLING_DEFAULTS.trialDays} days • no invoice • limited AI credits
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-6 border border-primary/20">
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground mb-1">Recommended Plan</p>
            <h4 className="text-3xl font-bold text-foreground">{quote.plan.name}</h4>
            {quote.perEmployeePrice !== null && (
              <p className="text-sm text-muted-foreground mt-1">
                {currency}
                {quote.perEmployeePrice.toLocaleString()} / employee / month
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-border/50">
              <span className="text-muted-foreground">Monthly Estimate</span>
              <span className="text-2xl font-bold text-foreground">{format(quote.monthlyTotal)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border/50">
              <span className="text-muted-foreground">Annual Estimate</span>
              <span className="text-lg font-semibold text-foreground">{format(quote.annualTotal)}</span>
            </div>
            <div className="flex justify-between items-center py-3 bg-green-500/10 rounded-lg px-3">
              <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Annual Savings ({BILLING_DEFAULTS.annualDiscountPercent}%)
              </span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                {format(savingsPerYear)}
              </span>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Calculator uses the same pricing logic as the pricing page.
          </p>
        </div>
      </div>
    </div>
  );
};

