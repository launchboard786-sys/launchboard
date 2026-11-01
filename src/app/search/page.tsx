import type { Metadata } from "next";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { businesses, categories, placements } from "@/db/schema";
import { BusinessRow } from "@/components/BusinessRow";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Stagger } from "@/components/motion/Reveal";
import { Pagination, SortTabs } from "@/components/Nav";
import { ensureSettled } from "@/lib/auction";
import { getCurrentUser } from "@/lib/auth";
import { recordSponsoredImpressions } from "@/lib/impressions";
import { listOrganic, votedSet, type OrganicSort } from "@/lib/listings";
import { currentWeek } from "@/lib/week";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Search" };
type Props = { searchParams: Promise<{ q?: string; sort?: string; page?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const sort: OrganicSort = sp.sort === "top" || sp.sort === "new" ? sp.sort : q ? "top" : "trending";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  await ensureSettled();

  // Up to two sponsored matches (best positions this week), shown first and labelled.
  const sponsoredMatches =
    q && page === 1
      ? await db
          .select({ business: businesses, position: placements.position, categoryName: categories.name })
          .from(placements)
          .innerJoin(businesses, eq(businesses.id, placements.businessId))
          .innerJoin(categories, eq(categories.id, businesses.categoryId))
          .where(
            and(
              eq(placements.weekStart, currentWeek()),
              eq(businesses.status, "APPROVED"),
              or(ilike(businesses.name, `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`), ilike(businesses.tagline, `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`)),
            ),
          )
          .orderBy(asc(placements.position))
          .limit(2)
      : [];

  const [user, results] = await Promise.all([getCurrentUser(), listOrganic({ sort, page, q: q || undefined })]);
  const sponsoredIds = new Set(sponsoredMatches.map((m) => m.business.id));
  const organic = results.items.filter((i) => !sponsoredIds.has(i.business.id));
  const voted = await votedSet(user?.id, [...sponsoredIds, ...organic.map((i) => i.business.id)]);
  await recordSponsoredImpressions([...sponsoredIds]);

  return (
    <div className="wrap flex max-w-4xl flex-col gap-8 pt-12">
      <PageHeader size="md" kicker="Explore" title={q ? `Results for “${q}”` : "Every business, ranked"} />
      <form className="flex items-center gap-1.5 rounded-2xl border border-line bg-surface p-1.5 shadow-[0_12px_32px_-20px_rgb(var(--shadow)/0.3)] transition-shadow focus-within:shadow-[0_0_0_4px_rgb(var(--ink)/0.06),0_12px_32px_-20px_rgb(var(--shadow)/0.3)]" action="/search" role="search">
        <label htmlFor="sq" className="sr-only">Search</label>
        <svg className="ml-3 shrink-0 text-muted" width="17" height="17" viewBox="0 0 16 16" aria-hidden><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="m11 11 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        <input id="sq" name="q" defaultValue={q} className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-[15px] outline-none placeholder:text-muted/70" placeholder="Search by name, idea or city" autoFocus={!q} />
        <button className="btn-primary rounded-xl px-5 py-2.5">Search</button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          <span className="font-semibold text-ink tabular-nums">{results.total.toLocaleString("en-IN")}</span> {results.total === 1 ? "business" : "businesses"}
        </p>
        <SortTabs base="/search" current={sort} extra={q ? { q } : {}} />
      </div>
      {sponsoredMatches.length + organic.length === 0 ? (
        <EmptyState title="No matches" body="Try a broader word, a city, or browse the categories instead." href="/" cta="Browse categories" />
      ) : (
        <Stagger as="ol" className="ruled" key={`${q}-${sort}-${page}`}>
          {sponsoredMatches.map((m) => (
            <BusinessRow key={`s-${m.business.id}`} business={m.business} categoryName={m.categoryName} voted={voted.has(m.business.id)} sponsoredPosition={m.position} />
          ))}
          {organic.map((i) => (
            <BusinessRow key={i.business.id} business={i.business} categoryName={i.categoryName} voted={voted.has(i.business.id)} />
          ))}
        </Stagger>
      )}
      <Pagination base="/search" page={results.page} pageCount={results.pageCount} params={{ sort, ...(q ? { q } : {}) }} />
    </div>
  );
}
