import Link from "next/link";
import { BusinessRow } from "@/components/BusinessRow";
import { WeekBoard } from "@/components/WeekBoard";
import { ensureSettled, getFeaturedAcrossCategories } from "@/lib/auction";
import { getCurrentUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { categoryCounts, listCategories, listingsUsedCount, listOrganic, votedSet } from "@/lib/listings";
import { recordSponsoredImpressions } from "@/lib/impressions";
import { currentWeek } from "@/lib/week";

export const dynamic = "force-dynamic";

export default async function Home() {
  await ensureSettled();
  const week = currentWeek();
  const [user, cats, counts, featuredRaw, trending, fresh, used] = await Promise.all([
    getCurrentUser(),
    listCategories(),
    categoryCounts(),
    getFeaturedAcrossCategories(week, 3),
    listOrganic({ sort: "trending", pageSize: 10 }),
    listOrganic({ sort: "new", pageSize: 6 }),
    listingsUsedCount(),
  ]);
  const featured = featuredRaw;
  await recordSponsoredImpressions(featured.map((f) => f.business.id));
  const voted = await votedSet(user?.id, [...trending.items, ...fresh.items].map((i) => i.business.id));
  const freeLeft = Math.max(0, config.freeListingLimit - used);
  const totalLive = [...counts.values()].reduce((a, b) => a + b, 0);

  return (
    <div className="wrap flex flex-col gap-14 pt-10 sm:pt-14">
      <section className="grid items-end gap-8 md:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-5">
          <p className="text-sm text-muted">{totalLive.toLocaleString("en-IN")} businesses listed · updated every Monday</p>
          <h1 className="font-display text-[clamp(2.4rem,6.2vw,4.4rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
            See what&apos;s launching before everyone else.
          </h1>
          <p className="max-w-xl text-lg text-muted">
            New startups and businesses, ranked by the people who use them. Upvote what you like, and find the next thing first.
          </p>
          <form action="/search" className="flex max-w-xl gap-2">
            <label htmlFor="home-q" className="sr-only">Search</label>
            <input id="home-q" name="q" className="input px-4 py-3" placeholder="Try “fintech”, “AI tutor” or “Bangalore”" />
            <button className="btn-primary px-5">Search</button>
          </form>
        </div>
        <div className="flex flex-col gap-4 border-l border-line pl-6 md:py-2">
          <p className="text-sm font-medium text-muted">For founders</p>
          <p className="font-display text-2xl font-bold leading-tight tracking-tight">
            {freeLeft > 0 ? (
              <>
                <span className="tabular-nums">{freeLeft.toLocaleString("en-IN")}</span> of {config.freeListingLimit.toLocaleString("en-IN")} free listing spots left
              </>
            ) : (
              <>Get your startup in front of the people looking for it</>
            )}
          </p>
          <div className="h-1 overflow-hidden rounded-full bg-line" aria-hidden>
            <div className="h-full rounded-full bg-ink" style={{ width: `${Math.min(100, (used / config.freeListingLimit) * 100)}%` }} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/new" className="btn-primary">List your startup</Link>
            <Link href="/advertise" className="btn-ghost">How sponsored spots work</Link>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section aria-labelledby="featured-h" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 id="featured-h" className="font-display text-2xl font-semibold tracking-tight">Featured this week</h2>
              <p className="mt-1 text-sm text-muted">The top three <span className="chip bg-sponsor-soft text-sponsor">Sponsored</span> spots in each category, won in this week&apos;s auction.</p>
            </div>
            <Link href="/advertise" className="text-sm font-medium underline decoration-line underline-offset-4 hover:decoration-ink">How it works</Link>
          </div>
          <WeekBoard rows={featured} />
        </section>
      )}

      <section aria-labelledby="cats-h" className="flex flex-col gap-4">
        <h2 id="cats-h" className="font-display text-2xl font-semibold tracking-tight">Browse by category</h2>
        <div className="grid grid-cols-1 border-t border-line sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((c) => (
            <Link key={c.id} href={`/c/${c.slug}`} className="group flex min-w-0 items-baseline justify-between gap-4 border-b border-line py-3.5 sm:pr-6">
              <span className="min-w-0">
                <span className="block font-semibold group-hover:underline group-hover:underline-offset-4">{c.name}</span>
                <span className="block truncate text-sm text-muted">{c.description}</span>
              </span>
              <span className="shrink-0 text-sm tabular-nums text-muted">{(counts.get(c.id) ?? 0).toLocaleString("en-IN")}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <section aria-labelledby="trend-h" className="flex min-w-0 flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <h2 id="trend-h" className="font-display text-2xl font-semibold tracking-tight">Trending now</h2>
            <Link href="/search?sort=trending" className="text-sm text-muted hover:text-ink">See all →</Link>
          </div>
          {trending.items.length === 0 ? (
            <EmptyState />
          ) : (
            <ol className="ruled">
              {trending.items.map((i, idx) => (
                <BusinessRow key={i.business.id} business={i.business} categoryName={i.categoryName} voted={voted.has(i.business.id)} rank={idx + 1} />
              ))}
            </ol>
          )}
        </section>
        <section aria-labelledby="new-h" className="flex min-w-0 flex-col gap-4">
          <h2 id="new-h" className="font-display text-2xl font-semibold tracking-tight">Just launched</h2>
          <ul className="ruled">
            {fresh.items.map((i) => (
              <BusinessRow key={i.business.id} business={i.business} categoryName={i.categoryName} voted={voted.has(i.business.id)} />
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card p-8 text-center">
      <p className="font-display text-lg font-semibold">No businesses yet</p>
      <p className="mt-1 text-muted">Be the first to list your startup. It&apos;s free.</p>
      <Link href="/dashboard/new" className="btn-primary mt-4">List your startup</Link>
    </div>
  );
}
