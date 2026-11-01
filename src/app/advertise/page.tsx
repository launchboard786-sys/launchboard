import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/lib/config";
import { listCategories } from "@/lib/listings";
import { formatINR } from "@/lib/money";
import { biddingWeek, formatWeek } from "@/lib/week";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Advertise" };

export default async function AdvertisePage() {
  const cats = await listCategories();
  const zones = [
    { z: "Top 10", pos: "Positions 1–10", where: "Featured cards at the top of your category page, plus the homepage for the top 3." },
    { z: "Top 50", pos: "Positions 11–50", where: "Labelled Sponsored rows inside the category list, one after every four organic rows." },
    { z: "Top 100", pos: "Positions 51–100", where: "Sponsored rows further down the list. The entry-level paid spot." },
  ];
  return (
    <div className="wrap flex max-w-4xl flex-col gap-12 pt-10">
      <header className="flex flex-col gap-4">
        <p className="eyebrow">For businesses</p>
        <h1 className="font-display text-[clamp(2rem,5vw,3.2rem)] font-semibold tracking-tight leading-[1.05] tracking-tight">Bid for the top spots in your category</h1>
        <p className="max-w-2xl text-lg text-muted">
          Every week, each category has 100 sponsored positions. The highest bids get the best spots. Listing stays free, and the organic
          ranking is decided only by votes.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard" className="btn-primary">Go to your dashboard</Link>
          <span className="self-center font-mono text-sm text-muted">Now bidding for: {formatWeek(biddingWeek())}</span>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        {zones.map((z, i) => (
          <div key={z.z} className="card flex flex-col gap-2 p-5">
            <span className="font-display text-3xl font-semibold tracking-tight text-sponsor">{z.z}</span>
            <span className="font-mono text-xs text-muted">{z.pos}</span>
            <div className="h-1.5 rounded-full bg-line"><div className="h-full rounded-full bg-sponsor" style={{ width: `${[100, 58, 28][i]}%` }} /></div>
            <p className="text-sm text-muted">{z.where}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-bold">How the weekly auction works</h2>
        <ol className="grid gap-3 sm:grid-cols-2">
          {[
            ["Add funds to your ad wallet", "Pay by UPI, card or netbanking (Razorpay) or by international card (Stripe)."],
            ["Place a bid for next week", `Bids start at your category's minimum and go up in steps of ${formatINR(config.bidStepPaise)}. You'll see live what it takes to reach each zone.`],
            ["Raise it if you're outbid", "Bids can be raised any time before the week starts. They can't be lowered or withdrawn, so no one can game the board."],
            ["Monday 00:00 IST: auction closes", "The top 100 bids win positions in order and pay their bid. Every other bid goes straight back to your wallet."],
          ].map(([t, d], i) => (
            <li key={t} className="card flex gap-4 p-5">
              <span className="font-display text-2xl font-semibold tracking-tight text-accent">{i + 1}</span>
              <div>
                <h3 className="font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-muted">{d}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-sm text-muted">
          Ties go to whoever bid that amount first. Your dashboard shows impressions, clicks and click-through rate for every day you&apos;re sponsored.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-bold">Minimum bids by category</h2>
        <div className="overflow-x-auto rounded-[10px] border border-line">
          <table className="w-full min-w-[420px] bg-surface text-left text-sm">
            <thead className="border-b border-line">
              <tr><th className="p-3 font-semibold">Category</th><th className="p-3 text-right font-semibold">Minimum weekly bid</th></tr>
            </thead>
            <tbody>
              {cats.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <td className="p-3"><Link href={`/c/${c.slug}`} className="hover:text-accent">{c.name}</Link></td>
                  <td className="p-3 text-right font-mono tabular-nums">{formatINR(c.reservePaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
