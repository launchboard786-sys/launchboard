import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { forbidden } from "@/lib/errors";
import { parseJson, route } from "@/lib/http";
import { getPaymentForUser, markPaymentPaid } from "@/lib/payments";

const schema = z.object({ paymentId: z.string().min(1) });

/** Simulated gateway for local development and demos. Disabled unless PAYMENTS_MOCK=true. */
export const POST = route(async (req) => {
  if (!config.paymentsMock) throw forbidden("Test payments are disabled.");
  const user = await requireUser();
  const { paymentId } = await parseJson(req, schema);
  const { payment } = await getPaymentForUser(paymentId, user.id);
  if (payment.provider !== "MOCK" || !payment.providerOrderId) throw forbidden();
  const result = await markPaymentPaid({
    provider: "MOCK",
    providerOrderId: payment.providerOrderId,
    providerPaymentId: `mockpay_${Date.now()}`,
    amountPaise: payment.amountPaise,
  });
  return NextResponse.json({ status: result.status, businessId: payment.businessId, purpose: payment.purpose });
});
