import type { Metadata } from "next";
import Link from "next/link";
import { ReviewButtons, RefundForm, SettleButton } from "@/components/AdminActions";
import { adminOverview, pendingListings, recentPayments, recentSettlements } from "@/lib/admin";
import { requireAdminOrRedirect } from "@/lib/guards";
import { formatINR } from "@/lib/money";
import { formatWeek } from "@/lib/week";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireAdminOrRedirect();
  const [o, pending, pays, settles] = await Promise.all([adminOverview(), pendingListings(), recentPayments(15), recentSettlements(8)]);
  return (
    <div className="wrap flex flex-col gap-8 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Admin</h1>
        <Link href="/admin/categories" className="btn-ghost">Manage categories</Link>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {[
          ["Ad revenue", formatINR(o.adRevenuePaise)],
          ["Listing fees", formatINR(o.listingFeesPaise)],
          ["Wallet top-ups", formatINR(o.topupsPaise)],
          ["Live listings", String(o.byStatus.APPROVED ?? 0)],
          ["Awaiting review", String(o.byStatus.PENDING_REVIEW ?? 0)],
          ["Users", String(o.users)],
        ].map(([k, v]) => (
          <div key={k} className="card min-w-0 p-4">
            <p className="eyebrow truncate">{k}</p>
            <p className="mt-1 truncate font-display text-2xl font-bold tabular-nums">{v}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-bold">Review queue ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="card p-6 text-muted">All caught up.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pending.map(({ business: b, categoryName, ownerEmail }) => (
              <li key={b.id} className="card grid gap-4 p-5 md:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <Link href={`/b/${b.slug}`} className="font-display text-lg font-semibold hover:text-accent">{b.name}</Link>
                    <span className="text-sm text-muted">{categoryName} · {b.location} · {ownerEmail}</span>
                  </div>
                  <p className="mt-1 text-sm">{b.tagline}</p>
                  <p className="mt-2 line-clamp-3 text-sm text-muted">{b.description}</p>
                  <a className="mt-2 inline-block break-all font-mono text-xs text-accent" href={b.websiteUrl} target="_blank" rel="noopener noreferrer nofollow">{b.websiteUrl}</a>
                </div>
                <ReviewButtons businessId={b.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card flex flex-col gap-3 p-6">
        <h2 className="font-display text-xl font-bold">Weekly auctions</h2>
        <p className="text-sm text-muted">Settlement runs automatically (hourly cron + on first visit after Monday 00:00 IST). Use this if you need to run it by hand.</p>
        <SettleButton />
        {settles.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-muted"><tr><th className="py-2 font-medium">Week</th><th className="py-2 text-right font-medium">Placed</th><th className="py-2 text-right font-medium">Released</th><th className="py-2 text-right font-medium">Revenue</th></tr></thead>
              <tbody>
                {settles.map((s) => (
                  <tr key={s.weekStart.toISOString()} className="border-t border-line">
                    <td className="py-2">{formatWeek(s.weekStart)}</td>
                    <td className="py-2 text-right font-mono">{s.winners}</td>
                    <td className="py-2 text-right font-mono">{s.losers}</td>
                    <td className="py-2 text-right font-mono">{formatINR(s.revenuePaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card flex flex-col gap-3 p-6">
        <h2 className="font-display text-xl font-bold">Recent payments</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="text-muted"><tr><th className="py-2 font-medium">When</th><th className="py-2 font-medium">Business</th><th className="py-2 font-medium">Purpose</th><th className="py-2 font-medium">Provider</th><th className="py-2 font-medium">Status</th><th className="py-2 text-right font-medium">Amount</th></tr></thead>
            <tbody>
              {pays.map(({ payment: p, businessName }) => (
                <tr key={p.id} className="border-t border-line">
                  <td className="py-2 font-mono text-xs text-muted">{p.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="py-2">{businessName}</td>
                  <td className="py-2">{p.purpose === "LISTING_FEE" ? "Listing fee" : "Top-up"}</td>
                  <td className="py-2">{p.provider}</td>
                  <td className={`py-2 ${p.status === "PAID" ? "text-good" : p.status === "FAILED" ? "text-bad" : "text-muted"}`}>{p.status}</td>
                  <td className="py-2 text-right font-mono">{formatINR(p.amountPaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card flex flex-col gap-3 p-6">
        <h2 className="font-display text-xl font-bold">Record a wallet refund</h2>
        <p className="text-sm text-muted">Takes money out of a business&apos;s available balance (not held bids). Then issue the refund in Razorpay or Stripe.</p>
        <RefundForm />
      </section>
    </div>
  );
}
