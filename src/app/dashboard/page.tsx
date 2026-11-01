import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses, categories, wallets } from "@/db/schema";
import { Logo } from "@/components/Logo";
import { StatusChip, ZoneChip } from "@/components/Badges";
import { ensureSettled, getPlacementsForBusinesses } from "@/lib/auction";
import { requireUserOrRedirect } from "@/lib/guards";
import { formatINR } from "@/lib/money";
import { statsTotalsFor } from "@/lib/stats";
import { currentWeek } from "@/lib/week";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const user = await requireUserOrRedirect("/dashboard");
  await ensureSettled();
  const rows = await db
    .select({ business: businesses, categoryName: categories.name, wallet: wallets })
    .from(businesses)
    .innerJoin(categories, eq(categories.id, businesses.categoryId))
    .leftJoin(wallets, eq(wallets.businessId, businesses.id))
    .where(eq(businesses.ownerId, user.id))
    .orderBy(desc(businesses.createdAt));
  const ids = rows.map((r) => r.business.id);
  const [placed, totals] = await Promise.all([getPlacementsForBusinesses(ids, currentWeek()), statsTotalsFor(ids)]);
  const placeBy = new Map(placed.map((p) => [p.businessId, p]));

  return (
    <div className="wrap flex flex-col gap-6 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Hi {user.name.split(" ")[0]}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Your businesses</h1>
        </div>
        <Link href="/dashboard/new" className="btn-primary">+ Add a business</Link>
      </div>

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <p className="font-display text-xl font-bold">List your first startup</p>
          <p className="max-w-md text-muted">It takes two minutes. Once it&apos;s approved, people can find it, upvote it, and you can bid for sponsored spots.</p>
          <Link href="/dashboard/new" className="btn-primary">List your startup</Link>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map(({ business: b, categoryName, wallet }) => {
            const p = placeBy.get(b.id);
            const t = totals.get(b.id);
            return (
              <li key={b.id}>
                <Link href={`/dashboard/${b.id}`} className="card flex min-w-0 flex-col gap-4 p-5 transition hover:border-ink/40">
                  <div className="flex items-start gap-3">
                    <Logo name={b.name} url={b.logoUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-display text-lg font-semibold">{b.name}</span>
                        <StatusChip status={b.status} />
                        {p && <ZoneChip position={p.position} />}
                      </div>
                      <p className="truncate text-sm text-muted">{categoryName} · {b.tagline}</p>
                    </div>
                  </div>
                  <dl className="grid grid-cols-4 gap-2 text-sm">
                    {[
                      ["Votes", b.voteCount.toLocaleString("en-IN")],
                      ["Views", (t?.views ?? 0).toLocaleString("en-IN")],
                      ["Clicks", (t?.clicks ?? 0).toLocaleString("en-IN")],
                      ["Wallet", formatINR(wallet?.availablePaise ?? 0)],
                    ].map(([k, v]) => (
                      <div key={k} className="min-w-0">
                        <dt className="eyebrow">{k}</dt>
                        <dd className="truncate font-mono font-semibold tabular-nums">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
