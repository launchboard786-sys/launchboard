import { expect, test } from "@playwright/test";
import { login, signup } from "./helpers";

test("cross-site POSTs are rejected (CSRF)", async ({ request }) => {
  const r = await request.post("/api/votes", { data: { businessId: "x" }, headers: { Origin: "https://evil.example" } });
  expect(r.status()).toBe(403);
});

test("API needs a session", async ({ request }) => {
  expect((await request.post("/api/bids", { data: { businessId: "x", amountRupees: 1000 } })).status()).toBe(401);
  expect((await request.post("/api/admin/settle")).status()).toBe(401);
});

test("non-admins can't use admin APIs or pages", async ({ page }) => {
  await signup(page, "E2E Normal");
  const r = await page.request.post("/api/admin/settle");
  expect(r.status()).toBe(403);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("owners can't open someone else's dashboard", async ({ page }) => {
  // Find a business id owned by the demo founder…
  await login(page, "founder@launchboard.dev", "founder12345");
  await page.getByRole("link", { name: /Saarthi AI/ }).click();
  await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]{36}$/);
  const foreign = new URL(page.url()).pathname;
  await page.getByRole("button", { name: "Log out" }).click();
  // …then try it as a different user.
  await signup(page, "E2E Snoop");
  expect((await page.goto(foreign))?.status()).toBe(404);
  const bid = await page.request.post("/api/bids", { data: { businessId: foreign.split("/").pop(), amountRupees: 2000 } });
  expect(bid.status()).toBe(403);
});

test("mock payments can't be completed by another user", async ({ page }) => {
  await signup(page, "E2E Other");
  const r = await page.request.post("/api/payments/mock/complete", { data: { paymentId: "does-not-exist" } });
  expect(r.status()).toBe(404);
});

test("webhooks reject bad signatures; cron needs its secret", async ({ request }) => {
  expect((await request.post("/api/webhooks/razorpay", { data: { event: "order.paid" }, headers: { "x-razorpay-signature": "nope" } })).status()).toBe(400);
  expect((await request.get("/api/cron/settle")).status()).toBe(401);
  expect((await request.get("/api/cron/settle", { headers: { Authorization: "Bearer dev-cron-secret" } })).status()).toBe(200);
});

test("login error is generic and doesn't reveal whether the email exists", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("nobody-here@test.dev");
  await page.getByLabel("Password").fill("wrongpass");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.locator("p[role=alert]")).toHaveText("Email or password is incorrect.");
});
