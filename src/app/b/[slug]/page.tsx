import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { placements, votes } from "@/db/schema";
import { Logo } from "@/components/Logo";
import { SponsoredChip, STAGE_LABEL, StatusChip } from "@/components/Badges";
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
    <div className="wrap max-w-3xl pt-10">
      {b.status !== "APPROVED" && (
        <div className="mb-6 flex items-center gap-2 rounded-[10px] border border-warn/40 bg-warn/10 p-3 text-sm">
          <StatusChip status={b.status} /> This is a preview. Visitors can&apos;t see this page until it&apos;s approved.
        </div>
      )}
      <nav className="text-sm text-muted">
        <Link href="/" className="hover:text-ink">Home</Link> / <Link href={`/c/${category.slug}`} className="hover:text-ink">{category.name}</Link>
      </nav>
      <header className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
        <Logo name={b.name} url={b.logoUrl} size={72} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-4xl font-semibold tracking-tight tracking-tight">{b.name}</h1>
            {placement && <SponsoredChip position={placement.position} />}
          </div>
          <p className="mt-2 text-xl text-muted">{b.tagline}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a href={`/go/${b.slug}${fromSponsored ? "?s=1" : ""}`} className="btn-primary px-6 py-2.5" rel="noopener nofollow" target="_blank">
              Visit website ↗
            </a>
            {isOwner && <Link href={`/dashboard/${b.id}`} className="btn-ghost">Manage listing</Link>}
          </div>
        </div>
        {b.status === "APPROVED" && <VoteButton businessId={b.id} count={b.voteCount} voted={voteRow.length > 0} />}
      </header>

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-4">
        {[
          ["Category", category.name],
          ["Based in", b.location],
          ["Founded", String(b.foundedYear)],
          ["Stage", STAGE_LABEL[b.stage] ?? b.stage],
        ].map(([k, v]) => (
          <div key={k} className="bg-surface p-4">
            <dt className="eyebrow">{k}</dt>
            <dd className="mt-1 font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold">About</h2>
        <div className="mt-3 whitespace-pre-line text-[16.5px] leading-relaxed">{b.description}</div>
      </section>
    </div>
  );
}
