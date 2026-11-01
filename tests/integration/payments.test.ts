import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import { closeDb, db } from "@/db";
import { businesses, ledgerEntries, payments } from "@/db/schema";
import { createCheckout, markPaymentPaid, razorpay } from "@/lib/payments";
import { makeBusiness, makeCategory, makeUser, resetDb, walletOf } from "../helpers";

beforeEach(resetDb);
afterAll(closeDb);

async function mockTopup(amountRupees: number) {
  const u = await makeUser();
  const c = await makeCategory();
  const b = await makeBusiness({ ownerId: u.id, categoryId: c.id });
  const co = await createCheckout({ userId: u.id, userEmail: u.email, businessId: b.id, purpose: "WALLET_TOPUP", provider: "MOCK", amountPaise: amountRupees * 100 });
  const [p] = await db.select().from(payments).where(eq(payments.id, co.paymentId));
  return { u, b, p: p! };
}

describe("checkout", () => {
  it("rejects top-ups outside limits and non-owners", async () => {
    const u = await makeUser();
    const other = await makeUser();
    const c = await makeCategory();
    const b = await makeBusiness({ ownerId: u.id, categoryId: c.id });
    await expect(createCheckout({ userId: u.id, userEmail: u.email, businessId: b.id, purpose: "WALLET_TOPUP", provider: "MOCK", amountPaise: 100 })).rejects.toMatchObject({ status: 400 });
    await expect(createCheckout({ userId: other.id, userEmail: other.email, businessId: b.id, purpose: "WALLET_TOPUP", provider: "MOCK", amountPaise: 100_000 })).rejects.toMatchObject({ status: 403 });
  });

  it("listing fee amount comes from config, never the client", async () => {
    const u = await makeUser();
    const c = await makeCategory();
    const b = await makeBusiness({ ownerId: u.id, categoryId: c.id, status: "PENDING_PAYMENT" });
    const co = await createCheckout({ userId: u.id, userEmail: u.email, businessId: b.id, purpose: "LISTING_FEE", provider: "MOCK", amountPaise: 1 });
    const [p] = await db.select().from(payments).where(eq(payments.id, co.paymentId));
    expect(p!.amountPaise).toBe(99_900);
  });

  it("refuses a disabled provider", async () => {
    const u = await makeUser();
    const c = await makeCategory();
    const b = await makeBusiness({ ownerId: u.id, categoryId: c.id });
    await expect(createCheckout({ userId: u.id, userEmail: u.email, businessId: b.id, purpose: "WALLET_TOPUP", provider: "STRIPE", amountPaise: 100_000 })).rejects.toMatchObject({ status: 400 });
  });
});

describe("markPaymentPaid", () => {
  it("credits the wallet once", async () => {
    const { b, p } = await mockTopup(2000);
    const r = await markPaymentPaid({ provider: "MOCK", providerOrderId: p.providerOrderId!, providerPaymentId: "x", amountPaise: p.amountPaise });
    expect(r.status).toBe("credited");
    expect((await walletOf(b.id)).availablePaise).toBe(200_000);
  });

  it("is idempotent under concurrent webhook + callback delivery", async () => {
    const { b, p } = await mockTopup(2000);
    const calls = Array.from({ length: 6 }, () => markPaymentPaid({ provider: "MOCK", providerOrderId: p.providerOrderId!, providerPaymentId: "x", amountPaise: p.amountPaise }));
    const results = await Promise.all(calls);
    expect(results.filter((r) => r.status === "credited")).toHaveLength(1);
    expect((await walletOf(b.id)).availablePaise).toBe(200_000);
    const w = await walletOf(b.id);
    expect(await db.select().from(ledgerEntries).where(eq(ledgerEntries.walletId, w.id))).toHaveLength(1);
  });

  it("rejects an amount mismatch and credits nothing", async () => {
    const { b, p } = await mockTopup(2000);
    await expect(markPaymentPaid({ provider: "MOCK", providerOrderId: p.providerOrderId!, providerPaymentId: "x", amountPaise: 100 })).rejects.toMatchObject({ code: "AMOUNT_MISMATCH" });
    expect((await walletOf(b.id)).availablePaise).toBe(0);
  });

  it("rejects an order id from another provider", async () => {
    const { p } = await mockTopup(2000);
    await expect(markPaymentPaid({ provider: "STRIPE", providerOrderId: p.providerOrderId!, providerPaymentId: "x", amountPaise: p.amountPaise })).rejects.toMatchObject({ status: 404 });
  });

  it("a paid listing fee moves the listing to review", async () => {
    const u = await makeUser();
    const c = await makeCategory();
    const b = await makeBusiness({ ownerId: u.id, categoryId: c.id, status: "PENDING_PAYMENT" });
    const co = await createCheckout({ userId: u.id, userEmail: u.email, businessId: b.id, purpose: "LISTING_FEE", provider: "MOCK" });
    const [p] = await db.select().from(payments).where(eq(payments.id, co.paymentId));
    await markPaymentPaid({ provider: "MOCK", providerOrderId: p!.providerOrderId!, providerPaymentId: "x", amountPaise: p!.amountPaise });
    const [after] = await db.select().from(businesses).where(eq(businesses.id, b.id));
    expect(after!.status).toBe("PENDING_REVIEW");
    expect((await walletOf(b.id)).availablePaise).toBe(0); // fees never go into the wallet
  });
});

describe("razorpay signatures", () => {
  it("verifies checkout signatures and rejects tampering", () => {
    const sig = createHmac("sha256", "rzp_test_secret").update("order_1|pay_1").digest("hex");
    expect(razorpay.verifyCheckoutSignature("order_1", "pay_1", sig)).toBe(true);
    expect(razorpay.verifyCheckoutSignature("order_1", "pay_2", sig)).toBe(false);
    expect(razorpay.verifyCheckoutSignature("order_1", "pay_1", "deadbeef")).toBe(false);
  });
  it("verifies webhook signatures over the raw body", () => {
    const body = JSON.stringify({ event: "order.paid" });
    const sig = createHmac("sha256", "rzp_webhook_secret").update(body).digest("hex");
    expect(razorpay.verifyWebhookSignature(body, sig)).toBe(true);
    expect(razorpay.verifyWebhookSignature(body + " ", sig)).toBe(false);
    expect(razorpay.verifyWebhookSignature(body, "")).toBe(false);
  });
});
