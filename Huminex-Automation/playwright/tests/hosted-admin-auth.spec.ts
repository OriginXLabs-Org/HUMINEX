import { expect, test } from "@playwright/test";

const runHostedSmoke = String(process.env.HUMINEX_RUN_HOSTED_AUTH_SMOKE ?? "false").toLowerCase() === "true";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "";
const isHostedTarget = /https:\/\/(www\.)?gethuminex\.com/i.test(baseURL);

test.describe("Hosted admin auth smoke", () => {
  test.skip(!runHostedSmoke || !isHostedTarget, "Set HUMINEX_RUN_HOSTED_AUTH_SMOKE=true and PLAYWRIGHT_BASE_URL=https://www.gethuminex.com");

  test("admin login initiates redirect flow without opening a popup", async ({ page, context }) => {
    await page.goto("/admin/login");

    let popupOpened = false;
    context.on("page", () => {
      popupOpened = true;
    });

    await page.getByRole("button", { name: /Continue with Huminex/i }).click();

    // In hosted production mode, admin auth should use full-page redirect rather than popup.
    await page.waitForURL(/login\.microsoftonline\.com/i, { timeout: 20000 });
    expect(popupOpened).toBeFalsy();
  });
});
