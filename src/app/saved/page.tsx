import type { Metadata } from "next";
import { BusinessRow } from "@/components/BusinessRow";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Stagger } from "@/components/motion/Reveal";
import { listSaved } from "@/lib/follows";
import { requireUserOrRedirect } from "@/lib/guards";
import { votedSet } from "@/lib/listings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Saved startups", robots: { index: false } };

export default async function SavedPage() {
  const user = await requireUserOrRedirect("/saved");
  const rows = await listSaved(user.id);
  const voted = await votedSet(user.id, rows.map((r) => r.business.id));
  return (
    <div className="wrap flex max-w-4xl flex-col gap-8 pt-12">
      <PageHeader
        size="md"
        kicker="Your list"
        title="Saved startups"
        description={rows.length ? `${rows.length} saved. Open one and tap Saved to remove it.` : undefined}
      />
      {rows.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          body="Tap Save on any startup to keep it here, so you can come back, follow how it's doing and upvote it later."
          href="/search?sort=trending"
          cta="Explore startups"
        />
      ) : (
        <Stagger as="ol" className="ruled">
          {rows.map((r) => (
            <BusinessRow key={r.business.id} business={r.business} categoryName={r.categoryName} voted={voted.has(r.business.id)} />
          ))}
        </Stagger>
      )}
    </div>
  );
}
