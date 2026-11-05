import type { Metadata } from "next";
import Link from "next/link";
import { BusinessRow } from "@/components/BusinessRow";
import { Crown } from "@/components/Crown";
import { Logo } from "@/components/Logo";
import { PageHeader } from "@/components/PageHeader";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { getCurrentUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { MIN_FAME_VOTES, allTimeTop, categoryChampions, ensureFame, listFameWeeks } from "@/lib/fame";
import { votedSet } from "@/lib/listings";
import { formatWeek } from "@/lib/week";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Hall of Fame",
  description: `Every week's Startup of the Week, the all-time most upvoted startups and the champion of every category on ${config.appName}. Decided by votes, never for sale.`,
  alternates: { canonical: "/hall-of-fame" },
};

const MEDAL = ["", "text-sponsor", "text-[#8a8d93]", "text-[#a0623a]"];
const n = (v: number) => v.toLocaleString("en-IN");

export default async function HallOfFame() {
  await ensureFame();
  const [user, weeks, top, champs] = await Promise.all([getCurrentUser(), listFameWeeks(26), allTimeTop(10), categoryChampions()]);
  const voted = await votedSet(user?.id, top.map((t) => t.business.id));
  const [latest, ...past] = weeks;
  const champ = latest?.podium[0];

  return (
    <div className="wrap flex flex-col gap-16 pt-12 sm:gap-20">
      <PageHeader
        kicker={<span className="flex items-center gap-2 text-sponsor"><Crown size={14} /> Decided by votes · never for sale</span>}
        title="Hall of Fame"
        description="Every Monday, the startup that earned the most upvotes the week before is crowned Startup of the Week. Sponsored bids play no part."
      />

      {/* Startup of the Week */}
      {champ ? (
        <Reveal as="section" aria-labelledby="sotw-h" className="grain relative overflow-hidden rounded-[24px] bg-[rgb(var(--obsidian))] p-6 text-white sm:p-10">
          <div aria-hidden className="absolute -top-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full blur-[90px]" style={{ background: "radial-gradient(closest-side, rgb(var(--gold-hi) / 0.35), transparent)" }} />
          <div className="relative z-[2] flex flex-col gap-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="sotw-h" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-gold-hi"><Crown size={16} /> Startup of the Week</h2>
              <span className="font-mono text-xs text-white/50">{formatWeek(latest.weekStart)}</span>
            </div>
            <Link prefetch={false} href={`/b/${champ.business.slug}`} className="group flex flex-col gap-5 sm:flex-row sm:items-center">
              <span className="inline-flex shrink-0 self-start rounded-[22px] bg-gradient-to-b from-gold-hi/70 to-sponsor/40 p-1.5">
                <Logo name={champ.business.name} url={champ.business.logoUrl} size={84} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[clamp(2rem,5vw,3.4rem)] font-semibold leading-none tracking-[-0.04em] underline-offset-8 group-hover:underline">{champ.business.name}</span>
                <span className="mt-3 block max-w-2xl text-lg leading-snug text-white/70">{champ.business.tagline}</span>
                <span className="mt-3 block text-sm text-white/50">{champ.categoryName} · <strong className="font-semibold text-white">{n(champ.weekVotes)}</strong> upvotes that week</span>
              </span>
            </Link>
            {latest.podium.length > 1 && (
              <ol className="grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-2">
                {latest.podium.slice(1).map((p) => (
                  <li key={p.position}>
                    <Link prefetch={false} href={`/b/${p.business.slug}`} className="flex items-center gap-3 rounded-[14px] p-2 transition-colors hover:bg-white/5">
                      <span className={`w-6 font-mono text-sm font-semibold ${p.position === 2 ? "text-[#c9ccd2]" : "text-[#d19a6b]"}`}>#{p.position}</span>
                      <Logo name={p.business.name} url={p.business.logoUrl} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{p.business.name}</span>
                        <span className="block truncate text-xs text-white/50">{p.categoryName} · {n(p.weekVotes)} upvotes</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Reveal>
      ) : (
        <section className="relative flex flex-col items-center gap-3 overflow-hidden rounded-[24px] border border-dashed border-sponsor/40 bg-sponsor-soft/40 px-6 py-12 text-center">
          <span className="text-sponsor"><Crown size={32} /></span>
          <h2 className="text-xl font-semibold tracking-tight">The first crown is up for grabs</h2>
          <p className="max-w-md text-sm text-muted">
            The startup with the most upvotes this week (at least {MIN_FAME_VOTES}) becomes the first Startup of the Week on Monday. Upvote the ones you believe in.
          </p>
          <Link prefetch={false} href="/search?sort=trending" className="btn-primary mt-2 rounded-full px-5">See what&apos;s trending</Link>
        </section>
      )}

      {/* Past champions */}
      {past.length > 0 && (
        <section aria-labelledby="past-h" className="flex flex-col gap-5">
          <div>
            <p className="kicker">Every week, on record</p>
            <h2 id="past-h" className="mt-2 text-3xl font-semibold tracking-tight">Past champions</h2>
          </div>
          <Stagger as="ol" className="ruled">
            {past.map((w) => {
              const [first, ...rest] = w.podium;
              return (
                <StaggerItem as="li" key={w.weekStart.toISOString()} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-5">
                  <span className="w-44 shrink-0 font-mono text-xs text-muted">{formatWeek(w.weekStart)}</span>
                  {first && (
                    <Link prefetch={false} href={`/b/${first.business.slug}`} className="tap-row flex min-w-0 flex-1 items-center gap-3 rounded-lg">
                      <span className={MEDAL[first.position]}><Crown size={16} /></span>
                      <Logo name={first.business.name} url={first.business.logoUrl} size={36} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{first.business.name}</span>
                        <span className="block truncate text-xs text-muted">{first.categoryName} · {n(first.weekVotes)} upvotes</span>
                      </span>
                    </Link>
                  )}
                  {rest.length > 0 && (
                    <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted sm:max-w-[45%] sm:justify-end">
                      {rest.map((r) => (
                        <Link prefetch={false} key={r.position} href={`/b/${r.business.slug}`} className="hover:text-ink">
                          <span className="font-mono text-xs">#{r.position}</span> {r.business.name}
                        </Link>
                      ))}
                    </span>
                  )}
                </StaggerItem>
              );
            })}
          </Stagger>
        </section>
      )}

      {/* All time */}
      {top.length > 0 && (
        <section aria-labelledby="all-h" className="flex flex-col gap-5">
          <div>
            <p className="kicker">Since day one</p>
            <h2 id="all-h" className="mt-2 text-3xl font-semibold tracking-tight">All-time most upvoted</h2>
          </div>
          <Stagger as="ol" className="ruled">
            {top.map((t, i) => (
              <BusinessRow key={t.business.id} business={t.business} categoryName={t.categoryName} voted={voted.has(t.business.id)} rank={i + 1} />
            ))}
          </Stagger>
        </section>
      )}

      {/* Category champions */}
      {champs.length > 0 && (
        <section aria-labelledby="cat-h" className="flex flex-col gap-5">
          <div>
            <p className="kicker">Right now</p>
            <h2 id="cat-h" className="mt-2 text-3xl font-semibold tracking-tight">Category champions</h2>
          </div>
          <Stagger as="ul" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {champs.map((c) => (
              <StaggerItem as="li" key={c.categorySlug} className="min-w-0">
                <Link prefetch={false} href={`/b/${c.business.slug}`} className="tap-card card flex min-w-0 items-center gap-3 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-ink/25">
                  <Logo name={c.business.name} url={c.business.logoUrl} />
                  <span className="min-w-0 flex-1">
                    <span className="eyebrow block truncate">{c.categoryName}</span>
                    <span className="block truncate font-semibold">{c.business.name}</span>
                  </span>
                  <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">▲ {n(c.business.voteCount)}</span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}
    </div>
  );
}
