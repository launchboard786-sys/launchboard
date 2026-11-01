import { expect, test } from "@playwright/test";
import { login, logout, signup } from "./helpers";

test("founder lists → admin approves → founder tops up, bids, raises, can't overspend or lower", async ({ page }) => {
  const name = `Zyon Test ${Date.now()}`;
  const email = await signup(page, "E2E Founder");

  // 1. Create the listing
  await page.goto("/dashboard/new");
  await page.getByLabel("Business name").fill(name);
  await page.getByLabel(/Tagline/).fill("End-to-end tested startup tagline");
  await page.getByLabel("Description").fill("This listing was created by the automated end-to-end test to verify the full flow.");
  await page.getByLabel("Category").selectOption({ label: "Developer Tools" });
  await page.getByLabel("Website").fill("https://zyon.example");
  await page.getByLabel("City").fill("Bangalore");
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByText("Listing submitted")).toBeVisible();
  await expect(page.getByText("Bidding opens once your listing is approved.")).toBeVisible();
  const dashPath = new URL(page.url()).pathname;

  // 2. Not public until approved
  await logout(page);
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  expect((await page.goto(`/b/${slug}`))?.status()).toBe(404);

  // 3. Admin approves it
  await login(page, "admin@launchboard.dev", "admin12345");
  await page.goto("/admin");
  await page.getByRole("listitem").filter({ hasText: name }).getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: name })).toHaveCount(0);
  await logout(page);
  expect((await page.goto(`/b/${slug}`))?.status()).toBe(200);

  // 4. Founder: bidding with an empty wallet gives a clear error
  await login(page, email, "password123");
  await page.goto(dashPath);
  await page.getByLabel("Your bid for the week (₹)").fill("1000");
  await page.getByRole("button", { name: "Place bid" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("wallet balance is too low");

  // 5. Top up ₹2,000 with the test provider
  await page.getByLabel("Amount (₹)").fill("2000");
  await page.getByLabel(/Test payment/).check();
  await page.getByRole("button", { name: "Add ₹2,000" }).click();
  await expect(page).toHaveURL(/\/pay\/mock\//);
  await page.getByRole("button", { name: "Pay now (test)" }).click();
  await expect(page.getByText("Payment received")).toBeVisible();
  await expect(page.getByText("₹2,000").first()).toBeVisible();

  // 6. Bid ₹1,000 → held; shows on the live board as "You"
  await page.getByLabel("Your bid for the week (₹)").fill("1000");
  await page.getByRole("button", { name: "Place bid" }).click();
  await expect(page.getByText(/Your bid: ₹1,000/)).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "You" })).toContainText("₹1,000");
  await expect(page.getByRole("cell", { name: "Bid held" })).toBeVisible();

  // 7. Lowering is refused
  await page.getByLabel("Your bid for the week (₹)").fill("900");
  await expect(page.getByRole("button", { name: "Raise bid" })).toBeDisabled();

  // 8. Raise to ₹1,500 → only ₹500 more held
  await page.getByLabel("Your bid for the week (₹)").fill("1500");
  await expect(page.getByText(/Holds ₹500 from your wallet/)).toBeVisible();
  await page.getByRole("button", { name: "Raise bid" }).click();
  await expect(page.getByText(/Your bid: ₹1,500/)).toBeVisible();

  // 9. Raise beyond the balance → refused, nothing changes
  await page.getByLabel("Your bid for the week (₹)").fill("5000");
  await page.getByRole("button", { name: "Raise bid" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("wallet balance is too low");
  await page.reload();
  await expect(page.getByText(/Your bid: ₹1,500/)).toBeVisible();
});

test("signed-in visitor can upvote and un-upvote", async ({ page }) => {
  await signup(page, "E2E Voter");
  await page.goto("/b/kora-living");
  const btn = page.getByRole("button", { name: "Upvote" });
  const before = Number(await btn.innerText());
  await btn.click();
  const on = page.getByRole("button", { name: "Remove upvote" });
  await expect(on).toHaveText(String(before + 1));
  await page.reload();
  await expect(page.getByRole("button", { name: "Remove upvote" })).toHaveText(String(before + 1));
  await page.getByRole("button", { name: "Remove upvote" }).click();
  await expect(page.getByRole("button", { name: "Upvote" })).toHaveText(String(before));
});

test("demo founder dashboard shows placement, stats, auction board and wallet history", async ({ page }) => {
  await login(page, "founder@launchboard.dev", "founder12345");
  await page.getByRole("link", { name: /Saarthi AI/ }).click();
  await expect(page.getByRole("heading", { name: "Sponsored spot auction" })).toBeVisible();
  await expect(page.getByText(/Live board/)).toBeVisible();
  await expect(page.getByRole("img", { name: /Views and clicks/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Wallet history" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Top-up" }).first()).toBeVisible();
});
