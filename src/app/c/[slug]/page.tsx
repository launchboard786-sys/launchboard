import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { BusinessRow } from "@/components/BusinessRow";
import { FeaturedCard } from "@/components/FeaturedCard";
import { Pagination, SortTabs } from "@/components/Nav";
import { ensureSettled, getPlacements } from "@/lib/auction";
import { getCurrentUser } from "@/lib/auth";
import { recordSponsoredImpressions } from "@/lib/impressions";
import { listOrganic, votedSet, type OrganicSort } from "@/lib/listings";
import { interleave, sponsoredSliceForPage } from "@/lib/rules";
import { currentWeek } from "@/lib/week";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ sort?: string; page?: string }> };

async function getCategory(slug: string) {
  const [c] = await db.select().from(categories).where(eq(categories.slug, slug));
  return c ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCategory((await params).slug);
  return c ? { title: `${c.name} startups`, description: c.description } : {};
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const cat = await getCategory(slug);
  if (!cat) notFound();
  await ensureSettled();

  const sort: OrganicSort = sp.sort === "top" || sp.sort === "new" ? sp.sort : "trending";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const week = currentWeek();
  const slice = sponsoredSliceForPage(page);

  const [user, organic, top10, inline] = await Promise.all([
    getCurrentUser(),
    listOrganic({ categoryId: cat.id, sort, page }),
    page === 1 ? getPlacements(cat.id, week, 1, 10) : Promise.resolve([]),
    slice ? getPlacements(cat.id, week, slice.first, slice.last) : Promise.resolve([]),
  ]);

  const feed = interleave(
    organic.items.map((i) => ({ ...i, id: i.business.id })),
    inline.map((p) => ({ item: { business: p.business, categoryName: cat.name, categorySlug: cat.slug, id: p.business.id }, position: p.position })),
  );
  const voted = await votedSet(user?.id, feed.map((f) => f.item.id));
  await recordSponsoredImpressions([...top10.map((p) => p.business.id), ...inline.map((p) => p.business.id)]);

  return (
    <div className="wrap flex flex-col gap-8 pt-10">
      <header className="flex flex-col gap-3">
        <nav className="text-sm text-muted"><Link href="/" className="hover:text-ink">Home</Link> / {cat.name}</nav>
        <h1 className="font-display text-[clamp(2.2rem,5vw,3.4rem)] font-semibold leading-none tracking-[-0.03em]">{cat.name}</h1>
        <p className="max-w-2xl text-lg text-muted">{cat.description}</p>
      </header>

      {top10.length > 0 && (
        <section aria-labelledby="top10-h" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="top10-h" className="font-display text-xl font-semibold tracking-tight">Featured: Top 10 this week</h2>
            <Link href="/advertise" className="text-sm text-muted hover:text-ink">Get featured →</Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {top10.map((p) => <FeaturedCard key={p.business.id} business={p.business} position={p.position} />)}
          </div>
        </section>
      )}

      <section aria-labelledby="list-h" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="list-h" className="font-display text-xl font-semibold tracking-tight">
            All {cat.name} <span className="text-base font-medium tabular-nums text-muted">({organic.total.toLocaleString("en-IN")})</span>
          </h2>
          <SortTabs base={`/c/${cat.slug}`} current={sort} />
        </div>
        {feed.length === 0 ? (
          <div className="card p-8 text-center text-muted">Nothing listed here yet. <Link href="/dashboard/new" className="font-semibold text-accent">Be the first.</Link></div>
        ) : (
          <ol className="ruled">
            {feed.map((f, i) => (
              <BusinessRow
                key={`${f.kind}-${f.item.id}`}
                business={f.item.business}
                voted={voted.has(f.item.id)}
                sponsoredPosition={f.kind === "sponsored" ? f.position : undefined}
                rank={f.kind === "organic" ? (page - 1) * 20 + feed.slice(0, i + 1).filter((x) => x.kind === "organic").length : undefined}
              />
            ))}
          </ol>
        )}
        <Pagination base={`/c/${cat.slug}`} page={organic.page} pageCount={organic.pageCount} params={{ sort }} />
      </section>
    </div>
  );
}
