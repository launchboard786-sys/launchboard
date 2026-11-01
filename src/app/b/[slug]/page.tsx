import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { placements, votes } from "@/db/schema";
import { Logo } from "@/components/Logo";
import { STAGE_LABEL, StatusChip } from "@/components/Badges";
import { Crown } from "@/components/Crown";
import { Magnetic } from "@/components/motion/Magnetic";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { VoteButton } from "@/components/VoteButton";
import { ensureSettled } from "@/lib/auction";
import { getCurrentUser } from "@/lib/auth";
import { recordPageView } from "@/lib/impressions";
import { getBusinessBySlug } from "@/lib/listings";
import { currentWeek } from "@/lib/week";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ s?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const row = await getBusinessBySlug((await params).slug);
  if (!row || row.business.status !== "APPROVED") return {};
  return { title: row.business.name, description: row.business.tagline };
}

export default async function BusinessPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { s } = await searchParams;
  const [row, user] = await Promise.all([getBusinessBySlug(slug), getCurrentUser()]);
  if (!row) notFound();
  const { business: b, category } = row;
  const isOwner = user?.id === b.ownerId;
  // Unapproved listings are visible only to their owner (preview) and admins.
  if (b.status !== "APPROVED" && !isOwner && user?.role !== "ADMIN") notFound();

  await ensureSettled();
  const [[placement], voteRow] = await Promise.all([
    db.select().from(placements).where(and(eq(placements.businessId, b.id), eq(placements.weekStart, currentWeek()))),
    user ? db.select().from(votes).where(and(eq(votes.userId, user.id), eq(votes.businessId, b.id))) : Promise.resolve([]),
  ]);
  if (!isOwner && b.status === "APPROVED") await recordPageView(b.id);
  const fromSponsored = s === "1" && !!placement;

  return (
    <div className="relative">
      {/* Soft light behind the header: gold when this business holds a sponsored spot. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{
          background: placement
            ? "radial-gradient(60% 70% at 30% 0%, rgb(var(--gold-hi) / 0.22), transparent 70%)"
            : "radial-gradient(60% 70% at 30% 0%, rgb(var(--accent) / 0.12), transparent 70%)",
        }}
      />
      <div className="wrap relative max-w-4xl pt-10">
        {b.status !== "APPROVED" && (
          <div className="mb-6 flex items-center gap-2 rounded-[12px] border border-warn/40 bg-warn/10 p-3 text-sm">
            <StatusChip status={b.status} /> This is a preview. Visitors can&apos;t see this page until it&apos;s approved.
          </div>
        )}
        <nav aria-label="Breadcrumb" className="kicker">
          <Link prefetch={false} href="/" className="inline-block py-1.5 hover:text-ink">Home</Link> <span className="mx-1 opacity-50">/</span>{" "}
          <Link prefetch={false} href={`/c/${category.slug}`} className="inline-block py-1.5 hover:text-ink">{category.name}</Link>
        </nav>

        <header className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-start">
          <Reveal y={10} className="shrink-0 self-start">
            <div className={`inline-flex rounded-[22px] p-1.5 ${placement ? "bg-gradient-to-b from-gold-hi/60 to-sponsor/30" : "bg-gradient-to-b from-line to-transparent"}`}>
              <Logo name={b.name} url={b.logoUrl} size={84} />
            </div>
          </Reveal>
          <div className="min-w-0 flex-1">
            <Reveal delay={0.05} className="flex flex-wrap items-center gap-3">
              <h1 className="text-[clamp(2.2rem,5vw,3.6rem)] font-semibold leading-none tracking-[-0.04em]">{b.name}</h1>
              {placement && (
                <span className="flex items-center gap-1.5 rounded-full border border-sponsor/30 bg-sponsor-soft px-2.5 py-1 text-xs font-semibold text-sponsor">
                  <Crown size={13} /> Sponsored · #{placement.position} this week
                </span>
              )}
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-3 max-w-2xl text-xl leading-snug text-ink/70">{b.tagline}</p>
            </Reveal>
            <Reveal delay={0.15} className="mt-7 flex flex-wrap items-center gap-3">
              <Magnetic>
                <a href={`/go/${b.slug}${fromSponsored ? "?s=1" : ""}`} className="btn-primary rounded-full px-6 py-3" rel="noopener nofollow" target="_blank">
                  Visit website
                  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden><path d="M5 11 11 5M6 5h5v5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </a>
              </Magnetic>
              {isOwner && <Link prefetch={false} href={`/dashboard/${b.id}`} className="btn-ghost rounded-full px-5 py-3">Manage listing</Link>}
            </Reveal>
          </div>
          {b.status === "APPROVED" && (
            <Reveal delay={0.2} className="flex items-center gap-3 self-start sm:flex-col sm:gap-1.5">
              <VoteButton businessId={b.id} count={b.voteCount} voted={voteRow.length > 0} />
              <span className="text-[11px] text-muted">Upvote</span>
            </Reveal>
          )}
        </header>

        <Stagger as="dl" className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-[16px] border border-line bg-line sm:grid-cols-4">
          {[
            ["Category", category.name],
            ["Based in", b.location],
            ["Founded", String(b.foundedYear)],
            ["Stage", STAGE_LABEL[b.stage] ?? b.stage],
          ].map(([k, v]) => (
            <StaggerItem key={k} className="bg-surface p-5">
              <dt className="kicker">{k}</dt>
              <dd className="mt-2 text-lg font-semibold tracking-tight">{v}</dd>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal as="section" className="mt-12 grid gap-10 md:grid-cols-[1fr_15rem]">
          <div>
            <h2 className="kicker">About</h2>
            <div className="mt-4 whitespace-pre-line text-[17px] leading-relaxed text-ink/85">{b.description}</div>
          </div>
          <aside className="flex flex-col gap-3 self-start rounded-[16px] border border-line bg-raised p-5 text-sm">
            <p className="font-semibold">Like what {b.name} is building?</p>
            <p className="text-muted">Upvotes push it up the organic ranking, which is never for sale.</p>
            <Link prefetch={false} href={`/c/${category.slug}`} className="mt-1 inline-block py-1.5 font-medium underline decoration-line underline-offset-4 hover:decoration-ink">More in {category.name} →</Link>
          </aside>
        </Reveal>
      </div>
    </div>
  );
}
