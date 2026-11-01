import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { parseJson, route } from "@/lib/http";
import { getPaymentForUser, markPaymentPaid, razorpay } from "@/lib/payments";

const schema = z.object({
  paymentId: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

/** Called by our checkout page right after Razorpay's success callback. The webhook is the backup. */
export const POST = route(async (req) => {
  const user = await requireUser();
  const input = await parseJson(req, schema);
  const { payment } = await getPaymentForUser(input.paymentId, user.id);
  if (payment.providerOrderId !== input.razorpay_order_id) throw new AppError(400, "ORDER_MISMATCH", "Order doesn't match this payment.");
  if (!razorpay.verifyCheckoutSignature(input.razorpay_order_id, input.razorpay_payment_id, input.razorpay_signature)) {
    throw new AppError(400, "BAD_SIGNATURE", "We couldn't verify this payment. If money was taken, it will be credited automatically within a few minutes.");
  }
  // The signature proves this payment belongs to our order; the order's amount was fixed by us.
  const result = await markPaymentPaid({
    provider: "RAZORPAY",
    providerOrderId: input.razorpay_order_id,
    providerPaymentId: input.razorpay_payment_id,
    amountPaise: payment.amountPaise,
  });
  return NextResponse.json({ status: result.status });
});
