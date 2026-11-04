import { NextResponse, type NextRequest } from "next/server";
import { AppError } from "@/lib/errors";
import { markPaymentPaid, razorpay } from "@/lib/payments";

/** Razorpay webhook (configure event: order.paid). Signature checked against the raw body. */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("x-razorpay-signature") ?? "";
  if (!razorpay.verifyWebhookSignature(raw, sig)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }
  let event: {
    event?: string;
    payload?: { order?: { entity?: { id?: string; amount_paid?: number; currency?: string } }; payment?: { entity?: { id?: string } } };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (event.event !== "order.paid") return NextResponse.json({ ignored: true });
  const orderId = event.payload?.order?.entity?.id;
  const amount = event.payload?.order?.entity?.amount_paid;
  const paymentId = event.payload?.payment?.entity?.id;
  if (!orderId || !paymentId || typeof amount !== "number") return NextResponse.json({ error: "missing fields" }, { status: 400 });
  try {
    const r = await markPaymentPaid({ provider: "RAZORPAY", providerOrderId: orderId, providerPaymentId: paymentId, amountMinor: amount, currency: event.payload?.order?.entity?.currency });
    return NextResponse.json({ status: r.status });
  } catch (e) {
    // 404 = not our order (e.g. another app on the same account): acknowledge so Razorpay stops retrying.
    if (e instanceof AppError && e.status === 404) return NextResponse.json({ ignored: true });
    console.error("[webhook:razorpay]", e);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
