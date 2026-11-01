import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses, payments, type Payment } from "@/db/schema";
import { config, enabledProviders } from "../config";
import { AppError, badRequest, forbidden, notFound } from "../errors";
import { formatINR } from "../money";
import { credit } from "../wallet";
import * as razorpay from "./razorpay";
import * as stripe from "./stripe";

export type Provider = "RAZORPAY" | "STRIPE" | "MOCK";
export type Purpose = "WALLET_TOPUP" | "LISTING_FEE";

export type CheckoutResponse =
  | { provider: "RAZORPAY"; paymentId: string; orderId: string; keyId: string; amountPaise: number; currency: string; name: string; description: string }
  | { provider: "STRIPE"; paymentId: string; url: string }
  | { provider: "MOCK"; paymentId: string; url: string };

export async function createCheckout(params: {
  userId: string;
  userEmail: string;
  businessId: string;
  purpose: Purpose;
  provider: Provider;
  amountPaise?: number;
}): Promise<CheckoutResponse> {
  if (!enabledProviders().includes(params.provider)) {
    throw badRequest("That payment method isn't available right now.");
  }
  const [biz] = await db.select().from(businesses).where(eq(businesses.id, params.businessId));
  if (!biz) throw notFound("Business not found.");
  if (biz.ownerId !== params.userId) throw forbidden();

  let amountPaise: number;
  let description: string;
  if (params.purpose === "LISTING_FEE") {
    if (biz.status !== "PENDING_PAYMENT") throw badRequest("This listing doesn't need a listing fee.");
    amountPaise = config.listingFeePaise; // never trust a client amount for fees
    description = `Listing fee for ${biz.name}`;
  } else {
    if (biz.status !== "APPROVED" && biz.status !== "PENDING_REVIEW") {
      throw badRequest("You can add funds once your listing is submitted for review.");
    }
    amountPaise = params.amountPaise ?? 0;
    if (!Number.isInteger(amountPaise) || amountPaise < config.minTopupPaise || amountPaise > config.maxTopupPaise) {
      throw badRequest(`Top-ups must be between ${formatINR(config.minTopupPaise)} and ${formatINR(config.maxTopupPaise)}.`);
    }
    description = `Ad wallet top-up for ${biz.name}`;
  }

  const [payment] = await db
    .insert(payments)
    .values({ businessId: biz.id, provider: params.provider, purpose: params.purpose, amountPaise, currency: config.currency })
    .returning();
  if (!payment) throw new Error("Failed to create payment");

  try {
    if (params.provider === "RAZORPAY") {
      const order = await razorpay.createOrder({ amountPaise, currency: config.currency, receipt: payment.id });
      await db.update(payments).set({ providerOrderId: order.id }).where(eq(payments.id, payment.id));
      return {
        provider: "RAZORPAY",
        paymentId: payment.id,
        orderId: order.id,
        keyId: config.razorpay.keyId,
        amountPaise,
        currency: config.currency,
        name: config.appName,
        description,
      };
    }
    if (params.provider === "STRIPE") {
      const session = await stripe.createCheckoutSession({
        paymentId: payment.id,
        amountPaise,
        currency: config.currency,
        description,
        customerEmail: params.userEmail,
        businessId: biz.id,
      });
      await db.update(payments).set({ providerOrderId: session.id }).where(eq(payments.id, payment.id));
      return { provider: "STRIPE", paymentId: payment.id, url: session.url };
    }
    await db.update(payments).set({ providerOrderId: `mock_${payment.id}` }).where(eq(payments.id, payment.id));
    return { provider: "MOCK", paymentId: payment.id, url: `/pay/mock/${payment.id}` };
  } catch (e) {
    await db.update(payments).set({ status: "FAILED" }).where(eq(payments.id, payment.id));
    if (e instanceof AppError) throw e;
    console.error("[payments] provider error", e);
    throw new AppError(502, "PROVIDER_ERROR", "The payment provider couldn't start checkout. Please try again.");
  }
}

export type MarkPaidResult = { status: "credited" | "already_paid"; payment: Payment };

/**
 * The single entry point where money becomes real. Idempotent: the status flip
 * CREATED → PAID happens at most once, and its effects run in the same transaction.
 */
export async function markPaymentPaid(params: {
  provider: Provider;
  providerOrderId: string;
  providerPaymentId: string;
  amountPaise: number;
}): Promise<MarkPaidResult> {
  return db.transaction(async (tx) => {
    const [p] = await tx
      .select()
      .from(payments)
      .where(and(eq(payments.providerOrderId, params.providerOrderId), eq(payments.provider, params.provider)))
      .for("update");
    if (!p) throw notFound("Payment not found.");
    if (p.status === "PAID") return { status: "already_paid", payment: p };
    if (p.amountPaise !== params.amountPaise) {
      console.error("[payments] amount mismatch", { id: p.id, expected: p.amountPaise, got: params.amountPaise });
      throw new AppError(400, "AMOUNT_MISMATCH", "The paid amount doesn't match the order.");
    }

    const [updated] = await tx
      .update(payments)
      .set({ status: "PAID", providerPaymentId: params.providerPaymentId, paidAt: new Date() })
      .where(and(eq(payments.id, p.id), eq(payments.status, p.status)))
      .returning();
    if (!updated) return { status: "already_paid", payment: p };

    if (p.purpose === "WALLET_TOPUP") {
      await credit(tx, p.businessId, p.amountPaise, p.id, `Top-up via ${p.provider === "MOCK" ? "test payment" : p.provider === "RAZORPAY" ? "Razorpay" : "Stripe"}`);
    } else {
      await tx
        .update(businesses)
        .set({ status: "PENDING_REVIEW", updatedAt: new Date() })
        .where(and(eq(businesses.id, p.businessId), eq(businesses.status, "PENDING_PAYMENT")));
    }
    return { status: "credited", payment: updated };
  });
}

export async function getPaymentForUser(paymentId: string, userId: string) {
  const [row] = await db
    .select({ payment: payments, business: businesses })
    .from(payments)
    .innerJoin(businesses, eq(businesses.id, payments.businessId))
    .where(eq(payments.id, paymentId));
  if (!row) throw notFound("Payment not found.");
  if (row.business.ownerId !== userId) throw forbidden();
  return row;
}

export { razorpay, stripe };
