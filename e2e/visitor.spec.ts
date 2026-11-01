import { expect, test } from "@playwright/test";

test("home shows featured sponsored cards, categories and trending", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /launching/i })).toBeVisible();
  const featured = page.getByRole("region", { name: "Featured this week" });
  await expect(featured.getByText("Sponsored").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Browse by category" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Trending now" })).toBeVisible();
});

test("category page labels every paid placement and keeps organic ranks", async ({ page }) => {
  await page.goto("/c/ai");
  await expect(page.getByRole("heading", { name: "AI & Machine Learning", level: 1 })).toBeVisible();
  const top10 = page.getByRole("region", { name: /Top 10 this week/ });
  await expect(top10).toBeVisible();
  await expect(top10.getByText("01", { exact: true })).toBeVisible();
  // Every featured card carries a Sponsored label.
  const cards = top10.locator("a[href^='/b/']");
  const n = await cards.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) await expect(cards.nth(i).getByText("Sponsored")).toBeVisible();
  await page.getByRole("link", { name: "Top voted" }).click();
  await expect(page).toHaveURL(/sort=top/);
});

test("search finds a business and its page links out through the click counter", async ({ page }) => {
  await page.goto("/search?q=coffee");
  await expect(page.getByRole("link", { name: "Brew Brothers" })).toBeVisible();
  await page.getByRole("link", { name: "Brew Brothers" }).first().click();
  await expect(page.getByRole("heading", { name: "Brew Brothers", level: 1 })).toBeVisible();
  const visit = page.getByRole("link", { name: /Visit website/ });
  await expect(visit).toHaveAttribute("href", /^\/go\/brew-brothers/);
});

test("voting needs an account", async ({ page }) => {
  await page.goto("/b/tiffin-tales");
  await page.getByRole("button", { name: "Upvote" }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fb%2Ftiffin-tales/);
});

test("no-results search explains what to do", async ({ page }) => {
  await page.goto("/search?q=zzzzqqqq");
  await expect(page.getByText("No matches")).toBeVisible();
});
