import { expect, test } from "@playwright/test";

test.describe("HUMINEX UI smoke", () => {
  test("home page and pricing section render", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /HUMINEX/i }).first()).toBeVisible();
    await expect(page.getByText(/Transparent Pricing/i).first()).toBeVisible();
  });

  test("pricing page shows startup growth enterprise plans", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: /One Workforce OS\. Simple, Transparent Pricing\./i })).toBeVisible();
    await expect(page.getByText(/Startup/i).first()).toBeVisible();
    await expect(page.getByText(/Growth/i).first()).toBeVisible();
    await expect(page.getByText(/Enterprise/i).first()).toBeVisible();
  });

  test("employee and employer portal login buttons use Huminex copy", async ({ page }) => {
    await page.goto("/portal/login");
    await expect(page.getByRole("button", { name: /Continue with Huminex/i })).toBeVisible();

    await page.goto("/tenant/login");
    await expect(page.getByRole("button", { name: /Continue with Huminex/i })).toBeVisible();
  });
});
