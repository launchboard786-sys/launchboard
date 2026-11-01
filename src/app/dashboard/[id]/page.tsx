import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bids, placements } from "@/db/schema";
import { StatusChip, ZoneChip } from "@/components/Badges";
import { BidPanel } from "@/components/BidPanel";
import { Notice as AnimatedNotice } from "@/components/Notice";
import { Crown } from "@/components/Crown";
import { Logo } from "@/components/Logo";
import { StatsChart } from "@/components/StatsChart";
import { CountUp } from "@/components/motion/CountUp";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { ListingFeeForm, TopupForm } from "@/components/WalletPanel";
import { ensureSettled, getAuctionBoard } from "@/lib/auction";
import { config, enabledProviders } from "@/lib/config";
import { orNotFound, requireUserOrRedirect } from "@/lib/guards";
import { getOwnedBusiness } from "@/lib/listings";
import { formatINR } from "@/lib/money";
import { zonePrices } from "@/lib/rules";
import { statsForBusiness } from "@/lib/stats";
import { getLedger, getWallet } from "@/lib/wallet";
import { biddingWeek, currentWeek, formatWeek } from "@/lib/week";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Manage listing" };
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; payment?: string }> };

const LEDGER_LABEL: Record<string, string> = {
  TOPUP: "Top-up",
  BID_HOLD: "Bid held",
  BID_CHARGE: "Bid charged",
  BID_RELEASE: "Bid released",
  REFUND: "Refund",
};

export default async function ManageBusiness({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUserOrRedirect(`/dashboard/${id}`);
  await ensureSettled();
  const { business: b, category } = await orNotFound(getOwnedBusiness(user.id, id));
  const nowWeek = currentWeek();
  const nextWeek = biddingWeek();

  const [wallet, ledger, stats, board, [placement], [myBid]] = await Promise.all([
    getWallet(b.id),
    getLedger(b.id, 15),
    statsForBusiness(b.id, 28),
    getAuctionBoard(category.id, nextWeek),
    db.select().from(placements).where(and(eq(placements.businessId, b.id), eq(placements.weekStart, nowWeek))),
    db.select().from(bids).where(and(eq(bids.businessId, b.id), eq(bids.weekStart, nextWeek))),
  ]);
  const others = board.filter((r) => r.businessId !== b.id);
  const mine = board.find((r) => r.businessId === b.id);
  const providers = enabledProviders();
  const t = stats.totals;

  return (
    <div className="wrap flex flex-col gap-8 pt-10">
      <Notice saved={sp.saved} payment={sp.payment} />
      <header className="flex flex-wrap items-start gap-4">
        <Logo name={b.name} url={b.logoUrl} size={56} />
        <div className="min-w-0 flex-1 basis-56">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[clamp(1.9rem,4vw,2.6rem)] font-semibold leading-none tracking-[-0.035em]">{b.name}</h1>
            <StatusChip status={b.status} />
          </div>
          <p className="text-muted">{category.name} · {b.tagline}</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Link href={`/b/${b.slug}`} className="btn-ghost">View page</Link>
          <Link href={`/dashboard/${b.id}/edit`} className="btn-ghost">Edit</Link>
        </div>
      </header>

      {b.status === "PENDING_REVIEW" && (
        <Banner tone="warn" title="In review">We&apos;re checking your listing. It goes live once approved, usually within a day. You can add funds now so you&apos;re ready to bid.</Banner>
      )}
      {b.status === "REJECTED" && (
        <Banner tone="bad" title="Not approved">{b.rejectionReason ?? "This listing wasn't approved."}</Banner>
      )}
      {b.status === "PENDING_PAYMENT" && (
        <section className="card grid gap-6 p-6 md:grid-cols-2">
          <div>
            <h2 className="font-display text-xl font-bold">Pay the listing fee</h2>
            <p className="mt-2 text-muted">
              The free listing spots are taken. A one-time fee of <strong className="text-ink">{formatINR(config.listingFeePaise)}</strong> sends your listing to review.
            </p>
          </div>
          <ListingFeeForm businessId={b.id} providers={providers} feeLabel={formatINR(config.listingFeePaise)} />
        </section>
      )}

      <Stagger className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { k: "This week", node: placement ? <span className={placement.position === 1 ? "gold-text" : ""}>#{placement.position}</span> : <span className="text-muted">Not sponsored</span>, gold: !!placement },
          { k: "Upvotes", node: <CountUp value={b.voteCount} /> },
          { k: "Impressions · 28d", node: <CountUp value={t.sponsoredImpressions} /> },
          { k: "Clicks · 28d", node: <CountUp value={t.websiteClicks} /> },
          { k: "Sponsored CTR", node: t.sponsoredImpressions ? <CountUp value={(t.sponsoredClicks / t.sponsoredImpressions) * 100} format="percent" /> : "–" },
        ].map((s, i) => (
          <StaggerItem
            key={s.k}
            className={`card group relative min-w-0 overflow-hidden p-4 transition-transform duration-300 hover:-translate-y-0.5 ${i === 4 ? "col-span-2 md:col-span-1" : ""} ${s.gold ? "border-sponsor/30" : ""}`}
          >
            {s.gold && <span aria-hidden className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gold-hi/25 blur-2xl" />}
            <p className="eyebrow relative truncate">{s.k}</p>
            <p className="relative mt-1.5 truncate text-[1.7rem] font-semibold tracking-tight tabular-nums">{s.node}</p>
          </StaggerItem>
        ))}
      </Stagger>

      {placement && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <ZoneChip position={placement.position} /> You hold position #{placement.position} in {category.name} for {formatWeek(nowWeek)}, paid {formatINR(placement.amountPaise)}.
        </p>
      )}

      <Reveal as="section" className="card relative overflow-hidden p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gold-hi/20 blur-3xl" />
        <div className="relative mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-sponsor-soft text-sponsor"><Crown size={20} /></span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Sponsored spot auction</h2>
            <p className="text-sm text-muted">Win a Top 10, Top 50 or Top 100 spot in {category.name} for next week.</p>
          </div>
        </div>
        {b.status === "APPROVED" ? (
          <BidPanel
            businessId={b.id}
            weekLabel={formatWeek(nextWeek)}
            closesAt={nextWeek.toISOString()}
            reservePaise={category.reservePaise}
            stepPaise={config.bidStepPaise}
            availablePaise={wallet.availablePaise}
            myBidPaise={myBid?.amountPaise ?? null}
            myPosition={mine?.position ?? null}
            zones={zonePrices(others, category.reservePaise)}
            board={board.slice(0, 120).map((r) => ({ id: r.id, position: r.position, amountPaise: r.amountPaise, isYou: r.businessId === b.id }))}
            totalBidders={board.length}
          />
        ) : (
          <p className="text-muted">Bidding opens once your listing is approved.</p>
        )}
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="card min-w-0 p-6">
          <h2 className="font-display text-xl font-bold">Last 28 days</h2>
          <div className="mt-4"><StatsChart series={stats.series} /></div>
        </section>
        <section className="card flex min-w-0 flex-col gap-4 p-6">
          <div>
            <h2 className="font-display text-xl font-bold">Ad wallet</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div><p className="eyebrow">Available</p><p className="mt-1 text-[1.9rem] font-semibold tracking-tight"><CountUp value={wallet.availablePaise / 100} format="inr" /></p></div>
              <div><p className="eyebrow">Held in bids</p><p className="mt-1 text-[1.9rem] font-semibold tracking-tight text-muted"><CountUp value={wallet.heldPaise / 100} format="inr" /></p></div>
            </div>
          </div>
          {b.status === "APPROVED" || b.status === "PENDING_REVIEW" ? (
            <TopupForm businessId={b.id} providers={providers} minRupees={config.minTopupPaise / 100} />
          ) : null}
        </section>
      </div>

      <section className="card min-w-0 p-6">
        <h2 className="font-display text-xl font-bold">Wallet history</h2>
        {ledger.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No transactions yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-muted">
                <tr><th className="py-2 font-medium">When</th><th className="py-2 font-medium">Type</th><th className="py-2 font-medium">Details</th><th className="py-2 text-right font-medium">Available</th><th className="py-2 text-right font-medium">Held</th></tr>
              </thead>
              <tbody>
                {ledger.map((l) => (
                  <tr key={l.id} className="border-t border-line">
                    <td className="py-2 font-mono text-xs text-muted">{l.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="py-2">{LEDGER_LABEL[l.type] ?? l.type}</td>
                    <td className="py-2 text-muted">{l.note}</td>
                    <td className={`py-2 text-right font-mono tabular-nums ${l.availableDelta > 0 ? "text-good" : l.availableDelta < 0 ? "text-ink" : "text-muted"}`}>{l.availableDelta ? (l.availableDelta > 0 ? "+" : "−") + formatINR(Math.abs(l.availableDelta)) : "–"}</td>
                    <td className="py-2 text-right font-mono tabular-nums text-muted">{l.heldDelta ? (l.heldDelta > 0 ? "+" : "−") + formatINR(Math.abs(l.heldDelta)) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Banner({ tone, title, children }: { tone: "warn" | "bad"; title: string; children: React.ReactNode }) {
  const cls = tone === "warn" ? "border-warn/40 bg-warn/10" : "border-bad/40 bg-bad/10";
  return (
    <div className={`rounded-[10px] border p-4 ${cls}`}>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm">{children}</p>
    </div>
  );
}

function Notice({ saved, payment }: { saved?: string; payment?: string }) {
  const msg =
    saved === "new" ? "Listing submitted. We'll review it shortly." :
    saved === "review" ? "Saved. Because the name or website changed, the listing is back in review." :
    saved === "1" ? "Changes saved." :
    payment === "success" ? "Payment received. Thank you!" :
    payment === "pending" ? "Payment is processing. It will appear here as soon as the provider confirms it." :
    payment === "cancelled" ? "Payment cancelled. No money was taken." : null;
  return <AnimatedNotice message={msg} />;
}
