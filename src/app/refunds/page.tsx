import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, OperatorBlock } from "@/components/LegalPage";
import { config } from "@/lib/config";
import { business } from "@/lib/legal";
import { formatINR } from "@/lib/money";
import { formatUSD } from "@/lib/currency";

export const metadata: Metadata = { title: "Refunds & Cancellations", description: `When and how ${config.appName} refunds payments.` };

export default function Page() {
  const b = business.brand;
  return (
    <LegalPage
      path="/refunds"
      title="Refunds & Cancellations"
      intro={<p>
        {b} has no subscriptions and nothing renews automatically. You pay for two things: a one-time listing fee (only after the free listings run out)
        and wallet top-ups used for sponsored bids. Here is exactly when you can get money back.
      </p>}
      sections={[
        { id: "summary", title: "At a glance", body: <table>
          <thead><tr><th>Payment</th><th>Refundable?</th></tr></thead>
          <tbody>
            <tr><td>Listing fee ({formatINR(config.listingFeePaise)} / {formatUSD(config.listingFeeUsdCents)}), listing <strong>rejected</strong> by us</td><td>Yes, in full</td></tr>
            <tr><td>Listing fee, you cancel <strong>before</strong> we review it</td><td>Yes, in full</td></tr>
            <tr><td>Listing fee, listing already <strong>approved</strong></td><td>No. The service has been delivered</td></tr>
            <tr><td>Unused wallet balance (available, not held in a bid)</td><td>Yes, on request</td></tr>
            <tr><td>Bid that <strong>did not win</strong></td><td>Released back to your wallet automatically when the auction closes</td></tr>
            <tr><td>Bid that <strong>won</strong> a sponsored position</td><td>No, except if we fail to show your placement (see below)</td></tr>
            <tr><td>Duplicate payment, or money debited for a failed payment</td><td>Yes, in full</td></tr>
          </tbody>
        </table> },
        { id: "listing-fee", title: "Listing fee", body: <p>
          The listing fee is charged once per listing. If we reject your listing, or you ask us to cancel it before it has been reviewed, we refund the fee in full.
          Once a listing is approved and published, the fee is not refundable, including if you later remove the listing or it is removed for breaking
          our <Link prefetch={false} href="/terms">Terms</Link>.
        </p> },
        { id: "wallet", title: "Wallet balance and bids", body: <ul>
          <li><strong>Unused balance:</strong> you can ask for any available (not held) balance to be refunded at any time. Amounts held for an open bid
            can&apos;t be refunded until the auction closes.</li>
          <li><strong>Losing bids:</strong> when the weekly auction closes, every amount held for a bid that didn&apos;t win is released to your wallet in full,
            automatically. You can then use it again or ask for a refund.</li>
          <li><strong>Winning bids:</strong> a winning bid is charged for the sponsored week and is not refundable. If a placement you paid for isn&apos;t
            shown because of our error, we credit your wallet for the time it was missing, or refund that part on request.</li>
          <li>If we close your account without you having broken our Terms, we refund your full unused balance.</li>
        </ul> },
        { id: "failed", title: "Failed and duplicate payments", body: <p>
          If money left your account but the payment shows as failed, your bank or our payment partner usually reverses it automatically within
          5 to 7 working days. If it doesn&apos;t, or if you were charged twice for the same thing, contact us and we will refund the extra amount in full.
        </p> },
        { id: "how", title: "How to ask for a refund", body: <ol>
          <li>Email <a href={`mailto:${business.email}`}>{business.email}</a> from your account&apos;s email address.</li>
          <li>Tell us the business name, what you want refunded and, if you have it, the payment reference shown on your dashboard.</li>
          <li>We reply within 2 working days and, once approved, start the refund within 7 working days.</li>
        </ol> },
        { id: "timing", title: "When the money arrives", body: <p>
          Refunds go back to the original payment method (card, UPI, net banking or wallet). After we start the refund, banks usually take 5 to 10
          working days to show it, depending on your bank and payment method. We don&apos;t charge any fee for refunds. Refunds are made in the currency you paid. For US-dollar
          top-ups we refund the dollar value of the unused balance at the same rate it was credited, so you get back what you put in;
          your bank&apos;s own exchange fees, if any, are outside our control.
        </p> },
        { id: "contact", title: "Contact", body: <OperatorBlock /> },
      ]}
    />
  );
}
