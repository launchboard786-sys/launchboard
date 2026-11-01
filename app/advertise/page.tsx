import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/lib/config";
import { PageHeader } from "@/components/PageHeader";
import { AuctionTimeline, ZonePodium } from "@/components/ZonePodium";
import { Magnetic } from "@/components/motion/Magnetic";
import { Reveal } from "@/components/motion/Reveal";
import { listCategories } from "@/lib/listings";
import { formatINR } from "@/lib/money";
import { biddingWeek, formatWeek } from "@/lib/week";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Advertise" };

export default async function AdvertisePage() {
  const cats = await listCategories();
  return (
    <div className="wrap flex max-w-5xl flex-col gap-16 pt-10 sm:gap-24 sm:pt-12">
      <PageHeader
        kicker={<span className="flex items-center gap-2"><span className="live-dot" /> Now bidding for {formatWeek(biddingWeek())}</span>}
        title="Bid for the throne in your category."
        description="Every week, each category has 100 sponsored positions. The highest bids win the best spots. Listing stays free, and the organic ranking is decided only by votes."
      >
        <div className="mt-2 flex flex-wrap gap-3">
          <Magnetic><Link prefetch={false} href="/dashboard" className="btn-primary rounded-full px-6 py-3">Go to your dashboard</Link></Magnetic>
          <Link prefetch={false} href="/dashboard/new" className="btn-ghost rounded-full px-6 py-3">List your startup first</Link>
        </div>
      </PageHeader>

      <section aria-labelledby="zones-h" className="flex flex-col gap-10">
        <Reveal>
          <p className="kicker">Three zones</p>
          <h2 id="zones-h" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">The higher you bid, the closer to the crown.</h2>
        </Reveal>
        <ZonePodium />
      </section>

      <section aria-labelledby="how-h" className="flex flex-col gap-10">
        <Reveal>
          <p className="kicker">The weekly auction</p>
          <h2 id="how-h" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">How the weekly auction works</h2>
        </Reveal>
        <AuctionTimeline
          steps={[
            ["Add funds to your ad wallet", "Pay by UPI, card or netbanking (Razorpay) or by international card (Stripe)."],
            ["Place a bid for next week", `Bids start at your category's minimum and go up in steps of ${formatINR(config.bidStepPaise)}. You'll see live what it takes to reach each zone.`],
            ["Raise it if you're outbid", "Bids can be raised any time before the week starts. They can't be lowered or withdrawn, so no one can game the board."],
            ["Monday 00:00 IST: you reign", "The top 100 bids win positions in order and pay their bid. Every other bid goes straight back to your wallet."],
          ]}
        />
        <Reveal className="rounded-[16px] border border-line bg-raised p-5 text-sm text-muted">
          Ties go to whoever bid that amount first. Your dashboard shows impressions, clicks and click-through rate for every day you&apos;re sponsored.
        </Reveal>
      </section>

      <Reveal as="section" className="flex flex-col gap-5">
        <h2 className="text-3xl font-semibold tracking-tight">Minimum bids by category</h2>
        <div className="ruled overflow-x-auto" tabIndex={0} role="region" aria-label="Minimum bids by category">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-raised">
              <tr><th className="kicker px-4 py-3 font-medium sm:px-5">Category</th><th className="kicker px-4 py-3 text-right font-medium sm:px-5">Min. weekly bid</th></tr>
            </thead>
            <tbody>
              {cats.map((c) => (
                <tr key={c.id} className="border-b border-line transition-colors last:border-0 hover:bg-raised">
                  <td className="px-4 py-3.5 sm:px-5"><Link prefetch={false} href={`/c/${c.slug}`} className="inline-block py-1 font-medium hover:underline hover:underline-offset-4">{c.name}</Link></td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right font-mono tabular-nums sm:px-5">{formatINR(c.reservePaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
    </div>
  );
}
