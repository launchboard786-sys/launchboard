import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { BusinessRow } from "@/components/BusinessRow";
import { FeaturedCard } from "@/components/FeaturedCard";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
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
    <div className="wrap flex flex-col gap-12 pt-12">
      <PageHeader
        kicker={<nav aria-label="Breadcrumb"><Link href="/" className="hover:text-ink">Home</Link> <span className="mx-1 opacity-50">/</span> Category</nav>}
        title={cat.name}
        description={<>{cat.description} <span className="text-ink">{organic.total.toLocaleString("en-IN")} listed.</span></>}
      />

      {top10.length > 0 && (
        <section aria-labelledby="top10-h" className="flex flex-col gap-3">
          <Reveal className="flex items-end justify-between gap-3">
            <div>
              <p className="kicker text-sponsor">Won at auction</p>
              <h2 id="top10-h" className="mt-1.5 text-2xl font-semibold tracking-tight">Featured: Top 10 this week</h2>
            </div>
            <Link href="/advertise" className="text-sm text-muted transition-colors hover:text-ink">Get featured →</Link>
          </Reveal>
          <Stagger className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {top10.map((p) => (
              <StaggerItem key={p.business.id} className="h-full">
                <FeaturedCard business={p.business} position={p.position} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      <section aria-labelledby="list-h" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="list-h" className="text-2xl font-semibold tracking-tight">
            All {cat.name} <span className="text-base font-medium tabular-nums text-muted">({organic.total.toLocaleString("en-IN")})</span>
          </h2>
          <SortTabs base={`/c/${cat.slug}`} current={sort} />
        </div>
        {feed.length === 0 ? (
          <EmptyState title={`No ${cat.name} startups yet`} body="Be the first in this category. Early listings get the most attention, and the throne is wide open." href="/dashboard/new" cta="List your startup" />
        ) : (
          <Stagger as="ol" className="ruled" key={`${sort}-${page}`}>
            {feed.map((f, i) => (
              <BusinessRow
                key={`${f.kind}-${f.item.id}`}
                business={f.item.business}
                voted={voted.has(f.item.id)}
                sponsoredPosition={f.kind === "sponsored" ? f.position : undefined}
                rank={f.kind === "organic" ? (page - 1) * 20 + feed.slice(0, i + 1).filter((x) => x.kind === "organic").length : undefined}
              />
            ))}
          </Stagger>
        )}
        <Pagination base={`/c/${cat.slug}`} page={organic.page} pageCount={organic.pageCount} params={{ sort }} />
      </section>
    </div>
  );
}
