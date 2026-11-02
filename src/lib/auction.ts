import { and, asc, eq, inArray, lte, sql, between } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { bids, businesses, categories, placements, settlements } from "@/db/schema";
import { config } from "./config";
import { AppError, forbidden, notFound } from "./errors";
import { checkBidAmount, rankBids } from "./rules";
import { biddingWeek, currentWeek, formatWeek } from "./week";
import { chargeHeld, hold, releaseHeld } from "./wallet";
import { defer, notifySettlement, significantDrops, type Outcome, type RankedBid } from "./notify";

/**
 * Settlement of a week takes an exclusive advisory lock; bid placement takes a shared one.
 * This removes the race where a bid commits for a week that is being settled
 * (its money would otherwise stay held forever).
 */
function weekLockKey(weekStart: Date) {
  return `lb-settle:${weekStart.toISOString()}`;
}
async function lockWeekShared(tx: Tx, weekStart: Date) {
  await tx.execute(sql`select pg_advisory_xact_lock_shared(hashtext(${weekLockKey(weekStart)}))`);
}
async function lockWeekExclusive(tx: Tx, weekStart: Date) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${weekLockKey(weekStart)}))`);
}

// ---------------------------------------------------------------- bidding

export async function placeBid(params: { userId: string; businessId: string; amountPaise: number; now?: Date }) {
  const now = params.now ?? new Date();
  const weekStart = biddingWeek(now);

  return db.transaction(async (tx) => {
    const [biz] = await tx.select().from(businesses).where(eq(businesses.id, params.businessId));
    if (!biz) throw notFound("Business not found.");
    if (biz.ownerId !== params.userId) throw forbidden();
    if (biz.status !== "APPROVED") throw new AppError(400, "NOT_APPROVED", "Your listing must be approved before you can bid.");

    await lockWeekShared(tx, weekStart);
    const [settled] = await tx.select().from(settlements).where(eq(settlements.weekStart, weekStart));
    if (settled) throw new AppError(409, "AUCTION_CLOSED", "This auction has already closed. Refresh to bid on the next week.");

    const [cat] = await tx.select().from(categories).where(eq(categories.id, biz.categoryId));
    if (!cat) throw notFound("Category not found.");

    // Lock this business's existing bid row (if any) so two raises can't interleave.
    const [existing] = await tx
      .select()
      .from(bids)
      .where(and(eq(bids.businessId, biz.id), eq(bids.weekStart, weekStart)))
      .for("update");

    const check = checkBidAmount({
      amountPaise: params.amountPaise,
      reservePaise: cat.reservePaise,
      previousPaise: existing?.amountPaise ?? null,
    });
    if (!check.ok) throw new AppError(400, "INVALID_BID", check.message);

    const delta = params.amountPaise - (existing?.amountPaise ?? 0);
    let bidId: string;
    if (existing) {
      bidId = existing.id;
      await tx
        .update(bids)
        .set({ amountPaise: params.amountPaise, amountSetAt: now })
        .where(eq(bids.id, existing.id));
    } else {
      const inserted = await tx
        .insert(bids)
        .values({ businessId: biz.id, categoryId: biz.categoryId, weekStart, amountPaise: params.amountPaise, amountSetAt: now })
        .onConflictDoNothing()
        .returning({ id: bids.id });
      if (!inserted[0]) throw new AppError(409, "RETRY", "Another bid was placed at the same moment. Please try again.");
      bidId = inserted[0].id;
    }
    await hold(tx, biz.id, delta, bidId, `Bid for ${formatWeek(weekStart)}`);

    // Who did this bid push down? (used for outbid alerts, sent after the response)
    const live = await tx
      .select({ id: bids.id, businessId: bids.businessId, amountPaise: bids.amountPaise, amountSetAt: bids.amountSetAt })
      .from(bids)
      .where(and(eq(bids.weekStart, weekStart), eq(bids.categoryId, biz.categoryId), eq(bids.status, "ACTIVE")));
    const afterRanked: RankedBid[] = rankBids(live);
    const beforeList = live
      .filter((b) => b.businessId !== biz.id || existing)
      .map((b) => (b.businessId === biz.id && existing ? { ...b, amountPaise: existing.amountPaise, amountSetAt: existing.amountSetAt } : b));
    const beforeRanked: RankedBid[] = rankBids(beforeList);
    const displaced = significantDrops(beforeRanked, afterRanked, biz.id);
    return { bidId, weekStart, amountPaise: params.amountPaise, outbid: { weekStart, reservePaise: cat.reservePaise, ranked: afterRanked, displaced } };
  });
}

/** Ranked live bids for a category/week. Competitor names are hidden; only amounts are public. */
export async function getAuctionBoard(categoryId: string, weekStart: Date) {
  const rows = await db
    .select({
      id: bids.id,
      businessId: bids.businessId,
      amountPaise: bids.amountPaise,
      amountSetAt: bids.amountSetAt,
    })
    .from(bids)
    .innerJoin(businesses, eq(businesses.id, bids.businessId))
    .where(
      and(
        eq(bids.categoryId, categoryId),
        eq(bids.weekStart, weekStart),
        eq(bids.status, "ACTIVE"),
        eq(businesses.status, "APPROVED"),
      ),
    );
  return rankBids(rows);
}

// ---------------------------------------------------------------- settlement

export type SettlementResult = { weekStart: Date; alreadySettled: boolean; winners: number; losers: number; revenuePaise: number; outcomes?: Outcome[] };

/**
 * Close the auction for `weekStart`: top N bids per category win and are charged,
 * the rest are released. Idempotent and safe to run concurrently.
 */
export async function settleWeek(weekStart: Date, now = new Date()): Promise<SettlementResult> {
  if (now.getTime() < weekStart.getTime()) {
    throw new AppError(400, "TOO_EARLY", "This week's auction is still open.");
  }
  const result = await db.transaction(async (tx): Promise<SettlementResult> => {
    await lockWeekExclusive(tx, weekStart);
    const [done] = await tx.select().from(settlements).where(eq(settlements.weekStart, weekStart));
    if (done) {
      return { weekStart, alreadySettled: true, winners: done.winners, losers: done.losers, revenuePaise: done.revenuePaise };
    }

    const rows = await tx
      .select({
        id: bids.id,
        businessId: bids.businessId,
        categoryId: bids.categoryId,
        amountPaise: bids.amountPaise,
        amountSetAt: bids.amountSetAt,
        bizStatus: businesses.status,
        bizCategoryId: businesses.categoryId,
      })
      .from(bids)
      .innerJoin(businesses, eq(businesses.id, bids.businessId))
      .where(and(eq(bids.weekStart, weekStart), eq(bids.status, "ACTIVE")));

    const byCategory = new Map<string, typeof rows>();
    const ineligible: typeof rows = [];
    for (const r of rows) {
      // A listing that was suspended or moved category can't win; its money goes back.
      if (r.bizStatus !== "APPROVED" || r.bizCategoryId !== r.categoryId) {
        ineligible.push(r);
        continue;
      }
      const list = byCategory.get(r.categoryId) ?? [];
      list.push(r);
      byCategory.set(r.categoryId, list);
    }

    let winners = 0;
    let revenuePaise = 0;
    const outcomes: Outcome[] = [];
    const losers: typeof rows = [...ineligible];
    const note = formatWeek(weekStart);

    for (const [categoryId, list] of byCategory) {
      const ranked = rankBids(list);
      for (const b of ranked) {
        if (b.position <= config.maxPositions) {
          await tx.insert(placements).values({
            businessId: b.businessId,
            categoryId,
            weekStart,
            position: b.position,
            amountPaise: b.amountPaise,
          });
          await tx.update(bids).set({ status: "WON" }).where(eq(bids.id, b.id));
          await chargeHeld(tx, b.businessId, b.amountPaise, b.id, `${note}: won position #${b.position}`);
          winners++;
          revenuePaise += b.amountPaise;
          outcomes.push({ businessId: b.businessId, position: b.position, amountPaise: b.amountPaise });
        } else {
          losers.push(b);
        }
      }
    }
    for (const b of losers) {
      await tx.update(bids).set({ status: "LOST" }).where(eq(bids.id, b.id));
      await releaseHeld(tx, b.businessId, b.amountPaise, b.id, `${note}: not placed, funds released`);
      outcomes.push({ businessId: b.businessId, position: null, amountPaise: b.amountPaise });
    }

    await tx.insert(settlements).values({ weekStart, winners, losers: losers.length, revenuePaise });
    return { weekStart, alreadySettled: false, winners, losers: losers.length, revenuePaise, outcomes };
  });
  // Results emails go out only after the money moves are committed.
  if (!result.alreadySettled && result.outcomes?.length) {
    const outcomes = result.outcomes;
    defer(() => notifySettlement(weekStart, outcomes));
  }
  return result;
}

/** Settle every past week that still has open bids. Returns results per week. */
export async function settleDue(now = new Date()): Promise<SettlementResult[]> {
  const due = await db
    .selectDistinct({ weekStart: bids.weekStart })
    .from(bids)
    .where(and(eq(bids.status, "ACTIVE"), lte(bids.weekStart, now)))
    .orderBy(asc(bids.weekStart));
  const results: SettlementResult[] = [];
  for (const d of due) results.push(await settleWeek(d.weekStart, now));
  return results;
}

let lastSettledWeek: number | null = null;
/**
 * Cheap guard called on page views: settles due weeks once per process per week,
 * so placements appear even if the cron job runs late.
 */
export async function ensureSettled(now = new Date()) {
  const wk = currentWeek(now).getTime();
  if (lastSettledWeek === wk) return;
  try {
    await settleDue(now);
    lastSettledWeek = wk;
  } catch (e) {
    console.error("[auction] lazy settlement failed", e);
  }
}

// ---------------------------------------------------------------- placements (read)

export async function getPlacements(categoryId: string, weekStart: Date, from = 1, to = config.maxPositions) {
  return db
    .select({ position: placements.position, amountPaise: placements.amountPaise, business: businesses })
    .from(placements)
    .innerJoin(businesses, eq(businesses.id, placements.businessId))
    .where(
      and(
        eq(placements.categoryId, categoryId),
        eq(placements.weekStart, weekStart),
        between(placements.position, from, to),
        eq(businesses.status, "APPROVED"),
      ),
    )
    .orderBy(asc(placements.position));
}

/** Top-N sponsored businesses across all categories this week (homepage). */
export async function getFeaturedAcrossCategories(weekStart: Date, perCategory = 3) {
  return db
    .select({ position: placements.position, business: businesses, categoryName: categories.name, categorySlug: categories.slug })
    .from(placements)
    .innerJoin(businesses, eq(businesses.id, placements.businessId))
    .innerJoin(categories, eq(categories.id, placements.categoryId))
    .where(and(eq(placements.weekStart, weekStart), lte(placements.position, perCategory), eq(businesses.status, "APPROVED")))
    .orderBy(asc(placements.position), asc(categories.sortOrder));
}

export async function getPlacementsForBusinesses(businessIds: string[], weekStart: Date) {
  if (businessIds.length === 0) return [];
  return db
    .select()
    .from(placements)
    .where(and(inArray(placements.businessId, businessIds), eq(placements.weekStart, weekStart)));
}
