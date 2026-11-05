import { and, asc, desc, eq, gte, lt, max, min, sql } from "drizzle-orm";
import { db } from "@/db";
import { businesses, categories, fameWeeks, votes } from "@/db/schema";
import { addWeeks, currentWeek, weekStartOf } from "./week";

/**
 * Hall of Fame. Each finished week (Monday–Sunday IST), the three approved startups that received
 * the most upvotes that week are recorded. Only votes count: sponsored bids play no part.
 */
export const MIN_FAME_VOTES = 3; // a crown means something: no 1-vote champions
const BACKFILL_WEEKS = 52;

/** Records one finished week's podium. Safe to call twice: the table's key keeps the first result. */
export async function recordFameWeek(weekStart: Date) {
  const end = addWeeks(weekStart, 1);
  const weekVotes = sql<number>`count(*)::int`;
  const top = await db
    .select({ businessId: votes.businessId, weekVotes })
    .from(votes)
    .innerJoin(businesses, eq(businesses.id, votes.businessId))
    .where(and(gte(votes.createdAt, weekStart), lt(votes.createdAt, end), eq(businesses.status, "APPROVED")))
    .groupBy(votes.businessId, businesses.voteCount, businesses.approvedAt, businesses.name)
    // Ties: more total upvotes wins, then whoever launched first, then name (stable).
    .orderBy(desc(weekVotes), desc(businesses.voteCount), asc(businesses.approvedAt), asc(businesses.name))
    .limit(3);
  const podium = top.filter((t) => t.weekVotes >= MIN_FAME_VOTES);
  if (!podium.length) return 0;
  await db
    .insert(fameWeeks)
    .values(podium.map((t, i) => ({ weekStart, position: i + 1, businessId: t.businessId, weekVotes: t.weekVotes })))
    .onConflictDoNothing();
  return podium.length;
}

/** Records every finished week not yet in the Hall of Fame (at most the last year). */
export async function recordFinishedWeeks(now = new Date()) {
  const thisWeek = currentWeek(now);
  const [last] = await db.select({ w: max(fameWeeks.weekStart) }).from(fameWeeks);
  let from: Date;
  if (last?.w) {
    from = addWeeks(last.w, 1);
  } else {
    const [first] = await db.select({ t: min(votes.createdAt) }).from(votes);
    if (!first?.t) return 0;
    from = weekStartOf(first.t);
  }
  const oldest = addWeeks(thisWeek, -BACKFILL_WEEKS);
  if (from < oldest) from = oldest;
  let weeks = 0;
  for (let w = from; w < thisWeek; w = addWeeks(w, 1)) {
    await recordFameWeek(w);
    weeks++;
  }
  return weeks;
}

let lastFameWeek: number | null = null;
/** Cheap guard for page views: checks for newly finished weeks once per process per week. */
export async function ensureFame(now = new Date()) {
  const wk = currentWeek(now).getTime();
  if (lastFameWeek === wk) return;
  try {
    await recordFinishedWeeks(now);
    lastFameWeek = wk;
  } catch (e) {
    console.error("[fame] recording failed", e);
  }
}

const pick = {
  weekStart: fameWeeks.weekStart,
  position: fameWeeks.position,
  weekVotes: fameWeeks.weekVotes,
  business: businesses,
  categoryName: categories.name,
  categorySlug: categories.slug,
};

/** Past podiums, newest week first, grouped by week. Listings that were later removed are skipped. */
export async function listFameWeeks(limitWeeks = 26) {
  const recent = await db.selectDistinct({ w: fameWeeks.weekStart }).from(fameWeeks).orderBy(desc(fameWeeks.weekStart)).limit(limitWeeks);
  const oldest = recent[recent.length - 1]?.w;
  if (!oldest) return [];
  const rows = await db
    .select(pick)
    .from(fameWeeks)
    .innerJoin(businesses, eq(businesses.id, fameWeeks.businessId))
    .innerJoin(categories, eq(categories.id, businesses.categoryId))
    .where(and(eq(businesses.status, "APPROVED"), gte(fameWeeks.weekStart, oldest)))
    .orderBy(desc(fameWeeks.weekStart), asc(fameWeeks.position));
  const weeks: { weekStart: Date; podium: typeof rows }[] = [];
  for (const r of rows) {
    const last = weeks[weeks.length - 1];
    if (last && last.weekStart.getTime() === r.weekStart.getTime()) last.podium.push(r);
    else weeks.push({ weekStart: r.weekStart, podium: [r] });
  }
  return weeks;
}

/** All-time most upvoted. */
export async function allTimeTop(limit = 10) {
  return db
    .select({ business: businesses, categoryName: categories.name, categorySlug: categories.slug })
    .from(businesses)
    .innerJoin(categories, eq(categories.id, businesses.categoryId))
    .where(and(eq(businesses.status, "APPROVED"), sql`${businesses.voteCount} > 0`))
    .orderBy(desc(businesses.voteCount), asc(businesses.approvedAt))
    .limit(limit);
}

/** The most upvoted startup in each category right now. */
export async function categoryChampions() {
  return db
    .selectDistinctOn([categories.sortOrder, categories.id], { business: businesses, categoryName: categories.name, categorySlug: categories.slug })
    .from(businesses)
    .innerJoin(categories, eq(categories.id, businesses.categoryId))
    .where(and(eq(businesses.status, "APPROVED"), sql`${businesses.voteCount} > 0`))
    .orderBy(asc(categories.sortOrder), asc(categories.id), desc(businesses.voteCount), asc(businesses.approvedAt));
}

/** Weeks this startup won (#1), newest first. */
export async function winsFor(businessId: string) {
  const rows = await db
    .select({ weekStart: fameWeeks.weekStart })
    .from(fameWeeks)
    .where(and(eq(fameWeeks.businessId, businessId), eq(fameWeeks.position, 1)))
    .orderBy(desc(fameWeeks.weekStart));
  return rows.map((r) => r.weekStart);
}
