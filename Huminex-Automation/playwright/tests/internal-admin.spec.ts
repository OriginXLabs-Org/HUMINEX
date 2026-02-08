import { expect, test } from "@playwright/test";

test.describe("HUMINEX internal admin", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("redirects /admin to /admin/login when no session", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByText(/Danger: Internal Use Only/i)).toBeVisible();
  });

  test("localhost bypass login opens internal admin dashboard", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByRole("button", { name: /Continue with Huminex/i })).toBeVisible();

    await page.getByRole("button", { name: /Continue with Huminex/i }).click();

    await expect(page).toHaveURL(/\/admin(\/)?$/);
    await expect(page.getByRole("heading", { name: /Admin Dashboard/i })).toBeVisible();
    await expect(page.getByText(/Employer Admins/i)).toBeVisible();
  });
});
