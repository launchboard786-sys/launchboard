import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { businesses, categories, placements } from "@/db/schema";
import { BusinessRow } from "@/components/BusinessRow";
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
    <div className="wrap flex max-w-4xl flex-col gap-6 pt-10">
      <form className="flex gap-2" action="/search">
        <label htmlFor="sq" className="sr-only">Search</label>
        <input id="sq" name="q" defaultValue={q} className="input px-4 py-3" placeholder="Search by name, idea or city" autoFocus={!q} />
        <button className="btn-primary px-6">Search</button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">
          {q ? <>Results for “{q}”</> : "All businesses"}{" "}
          <span className="font-mono text-base font-medium text-muted">({results.total.toLocaleString("en-IN")})</span>
        </h1>
        <SortTabs base="/search" current={sort} extra={q ? { q } : {}} />
      </div>
      {sponsoredMatches.length + organic.length === 0 ? (
        <div className="card p-8 text-center text-muted">
          No matches. Try a broader word, or <Link className="font-semibold text-accent" href="/">browse categories</Link>.
        </div>
      ) : (
        <ol className="ruled">
          {sponsoredMatches.map((m) => (
            <BusinessRow key={`s-${m.business.id}`} business={m.business} categoryName={m.categoryName} voted={voted.has(m.business.id)} sponsoredPosition={m.position} />
          ))}
          {organic.map((i) => (
            <BusinessRow key={i.business.id} business={i.business} categoryName={i.categoryName} voted={voted.has(i.business.id)} />
          ))}
        </ol>
      )}
      <Pagination base="/search" page={results.page} pageCount={results.pageCount} params={{ sort, ...(q ? { q } : {}) }} />
    </div>
  );
}
