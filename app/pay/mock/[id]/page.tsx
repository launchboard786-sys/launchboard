import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MockPayButton } from "@/components/MockPayButton";
import { config } from "@/lib/config";
import { orNotFound, requireUserOrRedirect } from "@/lib/guards";
import { formatINR } from "@/lib/money";
import { getPaymentForUser } from "@/lib/payments";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Test payment" };

export default async function MockPay({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserOrRedirect(`/pay/mock/${id}`);
  if (!config.paymentsMock) notFound();
  const { payment, business } = await orNotFound(getPaymentForUser(id, user.id));
  return (
    <div className="wrap flex max-w-md flex-col gap-5 pt-16">
      <p className="chip self-start border-warn/40 text-warn">Test mode: no real money</p>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Confirm payment</h1>
      <div className="card flex flex-col gap-3 p-6">
        <div className="flex justify-between"><span className="text-muted">For</span><span className="font-semibold">{business.name}</span></div>
        <div className="flex justify-between"><span className="text-muted">Purpose</span><span>{payment.purpose === "LISTING_FEE" ? "Listing fee" : "Ad wallet top-up"}</span></div>
        <div className="flex justify-between border-t border-line pt-3"><span className="text-muted">Amount</span><span className="font-display text-2xl font-bold">{formatINR(payment.amountPaise)}</span></div>
        {payment.status === "PAID" ? (
          <p className="rounded-lg bg-good/10 p-3 text-sm text-good">Already paid.</p>
        ) : (
          <MockPayButton paymentId={payment.id} businessId={business.id} />
        )}
      </div>
      <p className="text-sm text-muted">This page stands in for Razorpay or Stripe while PAYMENTS_MOCK=true. Turn it off in production.</p>
    </div>
  );
}
