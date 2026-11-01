import Link from "next/link";
import { BusinessRow } from "@/components/BusinessRow";
import { EmptyState } from "@/components/EmptyState";
import { Hero, type Throne } from "@/components/home/Hero";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { WeekBoard } from "@/components/WeekBoard";
import { ensureSettled, getFeaturedAcrossCategories } from "@/lib/auction";
import { getCurrentUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { categoryCounts, listCategories, listingsUsedCount, listOrganic, votedSet } from "@/lib/listings";
import { recordSponsoredImpressions } from "@/lib/impressions";
import { currentWeek, formatWeek } from "@/lib/week";

export const dynamic = "force-dynamic";

export default async function Home() {
  await ensureSettled();
  const week = currentWeek();
  const [user, cats, counts, featured, trending, fresh, top, used] = await Promise.all([
    getCurrentUser(),
    listCategories(),
    categoryCounts(),
    getFeaturedAcrossCategories(week, 5),
    listOrganic({ sort: "trending", pageSize: 10 }),
    listOrganic({ sort: "new", pageSize: 6 }),
    listOrganic({ sort: "top", pageSize: 60 }),
    listingsUsedCount(),
  ]);
  await recordSponsoredImpressions(featured.filter((f) => f.position <= 3).map((f) => f.business.id));
  const voted = await votedSet(user?.id, [...trending.items, ...fresh.items].map((i) => i.business.id));
  const freeLeft = Math.max(0, config.freeListingLimit - used);
  const totalLive = [...counts.values()].reduce((a, b) => a + b, 0);

  // The hero "throne": sponsored top 5 per category; before any auction has run, the most-voted per category.
  const thrones: Throne[] = [];
  const bySlug = new Map<string, Throne>();
  if (featured.length) {
    for (const f of featured) {
      const t = bySlug.get(f.categorySlug) ?? { category: { name: f.categoryName, slug: f.categorySlug }, rows: [], sponsored: true };
      t.rows.push({ position: f.position, name: f.business.name, slug: f.business.slug, tagline: f.business.tagline, logoUrl: f.business.logoUrl, votes: f.business.voteCount });
      bySlug.set(f.categorySlug, t);
    }
  } else {
    for (const i of top.items) {
      const t = bySlug.get(i.categorySlug) ?? { category: { name: i.categoryName, slug: i.categorySlug }, rows: [], sponsored: false };
      if (t.rows.length < 5) t.rows.push({ position: t.rows.length + 1, name: i.business.name, slug: i.business.slug, tagline: i.business.tagline, logoUrl: i.business.logoUrl, votes: i.business.voteCount });
      bySlug.set(i.categorySlug, t);
    }
  }
  for (const c of cats) {
    const t = bySlug.get(c.slug);
    if (t && t.rows.length) thrones.push({ ...t, rows: t.rows.sort((a, b) => a.position - b.position).slice(0, 5) });
  }

  return (
    <>
      <Hero
        weekLabel={formatWeek(week)}
        totalLive={totalLive}
        categories={cats.length}
        freeLeft={freeLeft}
        freeLimit={config.freeListingLimit}
        thrones={thrones.slice(0, 6)}
      />

      <div className="wrap flex flex-col gap-16 pt-14 sm:gap-24 sm:pt-20">
        {featured.length > 0 && (
          <section aria-labelledby="featured-h" className="flex flex-col gap-6">
            <Reveal className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="kicker">Won at auction</p>
                <h2 id="featured-h" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Featured this week</h2>
                <p className="mt-2 max-w-xl text-muted">
                  The top three <span className="chip bg-sponsor-soft text-sponsor">Sponsored</span> spots in each category. Always labelled, never mixed into the organic ranking.
                </p>
              </div>
              <Link prefetch={false} href="/advertise" className="text-sm font-medium underline decoration-line underline-offset-4 transition-colors hover:decoration-ink">How the auction works</Link>
            </Reveal>
            <WeekBoard rows={featured} />
          </section>
        )}

        <section aria-labelledby="how-h" className="relative">
          <Reveal>
            <p className="kicker">How {config.appName} works</p>
            <h2 id="how-h" className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Three steps from unknown to unmissable.</h2>
          </Reveal>
          <Stagger as="ol" className="mt-10 grid gap-px overflow-hidden rounded-[18px] border border-line bg-line md:grid-cols-3">
            {[
              { n: "01", t: "Rise", d: "List your startup for free. People discover it, upvote it, and push it up the organic ranking.", tone: "text-accent" },
              { n: "02", t: "Bid", d: "Want more eyes? Bid for a sponsored spot in your category for next week. Raise it any time before Monday.", tone: "text-ink" },
              { n: "03", t: "Reign", d: "Monday 00:00 IST the auction closes. The highest bid takes the throne for the whole week.", tone: "text-sponsor" },
            ].map((s) => (
              <StaggerItem as="li" key={s.t} className="group relative flex flex-col gap-3 bg-surface p-7 transition-colors duration-500 hover:bg-raised">
                <span className="font-mono text-xs text-muted">{s.n}</span>
                <span className={`text-4xl font-semibold tracking-[-0.04em] transition-transform duration-500 ease-out group-hover:translate-x-1 ${s.tone}`}>{s.t}</span>
                <p className="text-[15px] leading-relaxed text-muted">{s.d}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <section aria-labelledby="cats-h" className="flex flex-col gap-6">
          <Reveal>
            <p className="kicker">{cats.length} arenas</p>
            <h2 id="cats-h" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Browse by category</h2>
          </Reveal>
          <Stagger className="grid grid-cols-1 border-t border-line sm:grid-cols-2 lg:grid-cols-3">
            {cats.map((c) => (
              <StaggerItem key={c.id}>
                <Link prefetch={false} href={`/c/${c.slug}`} className="group relative flex min-w-0 items-center justify-between gap-4 border-b border-line py-4 sm:pr-6">
                  <span className="min-w-0">
                    <span className="block font-semibold transition-transform duration-300 ease-out group-hover:translate-x-1">{c.name}</span>
                    <span className="block truncate text-sm text-muted transition-transform delay-[30ms] duration-300 ease-out group-hover:translate-x-1">{c.description}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-sm tabular-nums text-muted">
                    {(counts.get(c.id) ?? 0).toLocaleString("en-IN")}
                    <svg className="-translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" width="14" height="14" viewBox="0 0 16 16" aria-hidden>
                      <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span aria-hidden className="absolute bottom-[-1px] left-0 h-px w-0 bg-ink transition-[width] duration-500 ease-out group-hover:w-full" />
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr]">
          <section aria-labelledby="trend-h" className="flex min-w-0 flex-col gap-5">
            <Reveal className="flex items-end justify-between">
              <div>
                <p className="kicker flex items-center gap-2"><span className="live-dot" /> Organic · by votes</p>
                <h2 id="trend-h" className="mt-2 text-3xl font-semibold tracking-tight">Trending now</h2>
              </div>
              <Link prefetch={false} href="/search?sort=trending" className="text-sm text-muted transition-colors hover:text-ink">See all →</Link>
            </Reveal>
            {trending.items.length === 0 ? (
              <EmptyState title="The arena is empty" body="Be among the first businesses here. Early listings get the most attention." href="/dashboard/new" cta="List your startup" />
            ) : (
              <Stagger as="ol" className="ruled">
                {trending.items.map((i, idx) => (
                  <BusinessRow key={i.business.id} business={i.business} categoryName={i.categoryName} voted={voted.has(i.business.id)} rank={idx + 1} />
                ))}
              </Stagger>
            )}
          </section>
          <section aria-labelledby="new-h" className="flex min-w-0 flex-col gap-5">
            <Reveal>
              <p className="kicker">Fresh</p>
              <h2 id="new-h" className="mt-2 text-3xl font-semibold tracking-tight">Just launched</h2>
            </Reveal>
            {fresh.items.length === 0 ? (
              <EmptyState title="Nothing yet" body="New listings appear here the moment they're approved." />
            ) : (
              <Stagger as="ul" className="ruled">
                {fresh.items.map((i) => (
                  <BusinessRow key={i.business.id} business={i.business} categoryName={i.categoryName} voted={voted.has(i.business.id)} />
                ))}
              </Stagger>
            )}
          </section>
        </div>

        <Reveal as="section" className="grain relative overflow-hidden rounded-[24px] bg-[rgb(var(--obsidian))] px-6 py-14 text-center text-white sm:px-12">
          <div aria-hidden className="absolute left-1/2 top-0 h-64 w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[80px]" style={{ background: "radial-gradient(closest-side, rgb(var(--gold-hi) / 0.45), transparent)" }} />
          <div className="relative z-[2] mx-auto flex max-w-xl flex-col items-center gap-5">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">Your startup deserves the throne.</h2>
            <p className="text-white/60">
              {freeLeft > 0
                ? `${freeLeft.toLocaleString("en-IN")} of ${config.freeListingLimit.toLocaleString("en-IN")} free listing spots left. Take one before they're gone.`
                : "Get in front of the people looking for what you've built."}
            </p>
            <Link prefetch={false} href="/dashboard/new" className="btn-gold rounded-full px-6 py-3 text-base">Claim your spot</Link>
          </div>
        </Reveal>
      </div>
    </>
  );
}
