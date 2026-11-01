import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses, categories, wallets } from "@/db/schema";
import { Logo } from "@/components/Logo";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Magnetic } from "@/components/motion/Magnetic";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";
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
    <div className="wrap flex flex-col gap-10 pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader size="md" kicker={`Hi ${user.name.split(" ")[0]}`} title="Your businesses" />
        <Magnetic><Link prefetch={false} href="/dashboard/new" className="btn-primary rounded-full px-5 py-2.5">+ Add a business</Link></Magnetic>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="List your first startup" body="It takes two minutes. Once it's approved, people can find it, upvote it, and you can bid for the throne." href="/dashboard/new" cta="List your startup" />
      ) : (
        <Stagger as="ul" className="grid gap-4 md:grid-cols-2">
          {rows.map(({ business: b, categoryName, wallet }) => {
            const p = placeBy.get(b.id);
            const t = totals.get(b.id);
            return (
              <StaggerItem as="li" key={b.id} className="min-w-0">
                <Link prefetch={false} href={`/dashboard/${b.id}`} className="tap-card card group flex min-w-0 flex-col gap-5 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-ink/25 hover:shadow-[0_24px_48px_-24px_rgb(var(--shadow)/0.35)]">
                  <div className="flex items-start gap-3">
                    <Logo name={b.name} url={b.logoUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-lg font-semibold tracking-tight">{b.name}</span>
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
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </div>
  );
}
