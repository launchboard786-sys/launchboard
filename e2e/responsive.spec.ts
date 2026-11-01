import { expect, test } from "@playwright/test";

for (const path of ["/", "/c/fintech", "/b/saarthi-ai", "/search?q=ai", "/advertise", "/login"]) {
  test(`no sideways scroll on phones: ${path}`, async ({ page }) => {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
