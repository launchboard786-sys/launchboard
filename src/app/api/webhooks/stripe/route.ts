import { NextResponse, type NextRequest } from "next/server";
import { AppError } from "@/lib/errors";
import { markPaymentPaid, stripe } from "@/lib/payments";

/** Stripe webhook (events: checkout.session.completed, checkout.session.async_payment_succeeded). */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";
  let event;
  try {
    event = stripe.constructWebhookEvent(raw, sig);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return NextResponse.json({ ignored: true });
  }
  const session = event.data.object;
  if (session.payment_status !== "paid") return NextResponse.json({ pending: true });
  try {
    const r = await markPaymentPaid({
      provider: "STRIPE",
      providerOrderId: session.id,
      providerPaymentId: typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? session.id),
      amountPaise: session.amount_total ?? -1,
    });
    return NextResponse.json({ status: r.status });
  } catch (e) {
    if (e instanceof AppError && e.status === 404) return NextResponse.json({ ignored: true });
    console.error("[webhook:stripe]", e);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
