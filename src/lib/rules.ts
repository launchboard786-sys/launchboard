/**
 * Pure business rules: no database, no I/O. Everything here is unit-tested.
 */
import { config, type ZoneKey } from "./config";
import { formatINR } from "./money";

// ---------- Sponsored zones ----------

export function zoneFor(position: number): (typeof config.zones)[number] | null {
  return config.zones.find((z) => position >= z.from && position <= z.to) ?? null;
}

export function zoneLabel(position: number): string {
  return zoneFor(position)?.label ?? "Unplaced";
}

// ---------- Bid validation ----------

export type BidCheck = { ok: true } | { ok: false; message: string };

/**
 * Validate a new bid amount against the reserve, step, cap and the business's existing bid.
 * Bids may only be raised (by at least one step), never lowered or withdrawn.
 */
export function checkBidAmount(params: {
  amountPaise: number;
  reservePaise: number;
  previousPaise?: number | null;
}): BidCheck {
  const { amountPaise, reservePaise, previousPaise } = params;
  const step = config.bidStepPaise;
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) return { ok: false, message: "Enter a valid amount." };
  if (amountPaise < reservePaise)
    return { ok: false, message: `The minimum bid in this category is ${formatINR(reservePaise)}.` };
  if (amountPaise % step !== 0)
    return { ok: false, message: `Bids must be in steps of ${formatINR(step)}.` };
  if (amountPaise > config.maxBidPaise)
    return { ok: false, message: `The maximum bid is ${formatINR(config.maxBidPaise)}.` };
  if (previousPaise != null && amountPaise < previousPaise + step)
    return {
      ok: false,
      message: `Bids can only be raised. Your current bid is ${formatINR(previousPaise)}, so the next bid must be at least ${formatINR(previousPaise + step)}.`,
    };
  return { ok: true };
}

// ---------- Auction ranking ----------

export type RankableBid = { id: string; amountPaise: number; amountSetAt: Date };

/** Highest amount first; ties go to whoever committed to that amount first; then id for determinism. */
export function compareBids(a: RankableBid, b: RankableBid): number {
  if (a.amountPaise !== b.amountPaise) return b.amountPaise - a.amountPaise;
  const t = a.amountSetAt.getTime() - b.amountSetAt.getTime();
  if (t !== 0) return t;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function rankBids<T extends RankableBid>(bidList: T[]): Array<T & { position: number }> {
  return [...bidList].sort(compareBids).map((b, i) => ({ ...b, position: i + 1 }));
}

/**
 * What a business must bid to reach a zone, given the current ranked bids from *other* businesses.
 * To take position p you must beat the bid currently at p. Ties lose to earlier bids,
 * so you need at least one step more.
 */
export function priceToReach(
  position: number,
  othersRanked: Array<{ amountPaise: number }>,
  reservePaise: number,
): number {
  const holder = othersRanked[position - 1];
  const step = config.bidStepPaise;
  const roundUp = (p: number) => Math.ceil(p / step) * step;
  if (!holder) return roundUp(reservePaise);
  return roundUp(Math.max(reservePaise, holder.amountPaise + step));
}

export function zonePrices(othersRanked: Array<{ amountPaise: number }>, reservePaise: number) {
  return config.zones.map((z) => ({
    key: z.key as ZoneKey,
    label: z.label,
    // Entering a zone means reaching its last position.
    pricePaise: priceToReach(z.to, othersRanked, reservePaise),
  }));
}

// ---------- Organic ranking ----------

/** Trending score: (votes + 1) / (hours since approval + 2) ^ 1.5 */
export function trendingScore(voteCount: number, approvedAt: Date, now = new Date()): number {
  const hours = Math.max(0, (now.getTime() - approvedAt.getTime()) / 3_600_000);
  return (voteCount + 1) / Math.pow(hours + 2, 1.5);
}

// ---------- Category feed: organic + sponsored interleave ----------

export type FeedItem<T> = { kind: "organic"; item: T } | { kind: "sponsored"; item: T; position: number };

/**
 * Insert one sponsored item after every `every` organic items. A business that is
 * shown as sponsored on this page is not repeated in the organic rows.
 * Sponsored items left over (when organic runs out) are appended in order.
 */
export function interleave<T extends { id: string }>(
  organic: T[],
  sponsored: Array<{ item: T; position: number }>,
  every = config.sponsoredEvery,
): FeedItem<T>[] {
  const sponsoredIds = new Set(sponsored.map((s) => s.item.id));
  const organicFiltered = organic.filter((o) => !sponsoredIds.has(o.id));
  const out: FeedItem<T>[] = [];
  let s = 0;
  organicFiltered.forEach((item, i) => {
    out.push({ kind: "organic", item });
    if ((i + 1) % every === 0 && s < sponsored.length) {
      const sp = sponsored[s++]!;
      out.push({ kind: "sponsored", item: sp.item, position: sp.position });
    }
  });
  while (s < sponsored.length) {
    const sp = sponsored[s++]!;
    out.push({ kind: "sponsored", item: sp.item, position: sp.position });
  }
  return out;
}

/** Which sponsored positions (from 11 upward) belong on a given 1-based organic page. */
export function sponsoredSliceForPage(page: number, pageSize = config.pageSize, every = config.sponsoredEvery) {
  const perPage = Math.floor(pageSize / every);
  const first = 11 + (page - 1) * perPage;
  const last = Math.min(config.maxPositions, first + perPage - 1);
  return first > config.maxPositions ? null : { first, last };
}

// ---------- Slugs ----------

export function slugify(input: string): string {
  return (
    input
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "business"
  );
}
