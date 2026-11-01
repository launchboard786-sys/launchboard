import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, OperatorBlock } from "@/components/LegalPage";
import { config } from "@/lib/config";
import { business } from "@/lib/legal";

export const metadata: Metadata = { title: "Delivery Policy", description: `How ${config.appName}'s online services are delivered.` };

export default function Page() {
  const b = business.brand;
  return (
    <LegalPage
      path="/delivery"
      title="Delivery Policy"
      intro={<p>
        {b} sells online services only. <strong>Nothing is shipped</strong>, and there are no delivery charges. Everything you pay for is delivered
        on the {b} website and shown in your dashboard.
      </p>}
      sections={[
        { id: "topups", title: "Wallet top-ups", body: <p>
          Your wallet is credited as soon as the payment is confirmed, usually within seconds. If a confirmed payment hasn&apos;t appeared in your wallet
          within 30 minutes, contact us with the payment reference.
        </p> },
        { id: "listing", title: "Listings and the listing fee", body: <p>
          After you submit a listing (and pay the fee, if one applies), we review it, usually within one working day. Once approved it is published on
          {" "}{b} straight away and you get a confirmation on your dashboard.
        </p> },
        { id: "sponsored", title: "Sponsored positions", body: <p>
          Sponsored positions won in a weekly auction are shown in your category for that week, from Monday 00:00 to Sunday 23:59 India Standard Time.
          See the <Link prefetch={false} href="/terms#sponsored">Terms</Link> for how auctions work.
        </p> },
        { id: "problems", title: "If something doesn't arrive", body: <>
          <p>Contact us and we&apos;ll fix it or refund you under our <Link prefetch={false} href="/refunds">Refund Policy</Link>.</p>
          <OperatorBlock />
        </> },
      ]}
    />
  );
}
