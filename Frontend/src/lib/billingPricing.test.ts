import { describe, expect, it } from "vitest";
import { buildPlanQuote, getPlanPriceByCycle, pickPlanForEmployees } from "@/lib/billingPricing";

describe("billingPricing", () => {
  it("applies annual discount from monthly unit price", () => {
    expect(getPlanPriceByCycle(349, "annual")).toBeCloseTo(279.2, 1);
  });

  it("selects startup plan for <= 50 employees", () => {
    const plan = pickPlanForEmployees("india", 42);
    expect(plan.id).toBe("startup");
  });

  it("selects growth plan for 50-300 employees", () => {
    const plan = pickPlanForEmployees("india", 120);
    expect(plan.id).toBe("growth");
  });

  it("builds quote with expected annual total", () => {
    const quote = buildPlanQuote("india", 100, "monthly");
    expect(quote.plan.id).toBe("growth");
    expect(quote.monthlyTotal).toBe(34900);
    expect(quote.annualTotal).toBe(418800);
  });
});
