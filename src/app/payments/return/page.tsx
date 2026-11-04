import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { requireUserOrRedirect } from "@/lib/guards";
import { markPaymentPaid, stripe } from "@/lib/payments";

export const dynamic = "force-dynamic";

/**
 * Stripe sends the customer here after checkout. We confirm with Stripe directly
 * (never trusting the URL) so the wallet updates even if the webhook is delayed.
 */
export default async function PaymentReturn({ searchParams }: { searchParams: Promise<{ provider?: string; session_id?: string }> }) {
  const sp = await searchParams;
  const user = await requireUserOrRedirect("/dashboard");
  if (sp.provider !== "stripe" || !sp.session_id) redirect("/dashboard");

  const [p] = await db.select().from(payments).where(eq(payments.providerOrderId, sp.session_id));
  if (!p) redirect("/dashboard");
  let outcome = "pending";
  try {
    const session = await stripe.retrieveSession(sp.session_id);
    if (session.payment_status === "paid" && session.amount_total != null) {
      await markPaymentPaid({
        provider: "STRIPE",
        providerOrderId: session.id,
        providerPaymentId: typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? session.id),
        amountMinor: session.amount_total,
        currency: session.currency ?? undefined,
      });
      outcome = "success";
    }
  } catch (e) {
    console.error("[stripe return]", user.id, e);
  }
  redirect(`/dashboard/${p.businessId}?payment=${outcome}`);
}
