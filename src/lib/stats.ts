import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { dailyStats } from "@/db/schema";
import { istDay } from "./week";

type Field = "pageViews" | "websiteClicks" | "sponsoredImpressions" | "sponsoredClicks";

/** Increment a counter for each business today. Never throws: analytics must not break pages. */
export async function bump(businessIds: string[], field: Field, now = new Date()) {
  const ids = [...new Set(businessIds)];
  if (ids.length === 0) return;
  const day = istDay(now);
  try {
    await db
      .insert(dailyStats)
      .values(ids.map((businessId) => ({ businessId, day, [field]: 1 })))
      .onConflictDoUpdate({
        target: [dailyStats.businessId, dailyStats.day],
        set: { [field]: sql`${dailyStats[field]} + 1` },
      });
  } catch (e) {
    console.error("[stats] bump failed", e);
  }
}

export async function statsForBusiness(businessId: string, days = 28, now = new Date()) {
  const since = istDay(new Date(now.getTime() - (days - 1) * 86_400_000));
  const rows = await db
    .select()
    .from(dailyStats)
    .where(and(eq(dailyStats.businessId, businessId), gte(dailyStats.day, since)))
    .orderBy(asc(dailyStats.day));
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const series = Array.from({ length: days }, (_, i) => {
    const day = istDay(new Date(now.getTime() - (days - 1 - i) * 86_400_000));
    const r = byDay.get(day);
    return {
      day,
      pageViews: r?.pageViews ?? 0,
      websiteClicks: r?.websiteClicks ?? 0,
      sponsoredImpressions: r?.sponsoredImpressions ?? 0,
      sponsoredClicks: r?.sponsoredClicks ?? 0,
    };
  });
  const totals = series.reduce(
    (a, d) => ({
      pageViews: a.pageViews + d.pageViews,
      websiteClicks: a.websiteClicks + d.websiteClicks,
      sponsoredImpressions: a.sponsoredImpressions + d.sponsoredImpressions,
      sponsoredClicks: a.sponsoredClicks + d.sponsoredClicks,
    }),
    { pageViews: 0, websiteClicks: 0, sponsoredImpressions: 0, sponsoredClicks: 0 },
  );
  return { series, totals };
}

export async function statsTotalsFor(businessIds: string[]) {
  if (!businessIds.length) return new Map<string, { views: number; clicks: number }>();
  const rows = await db
    .select({
      businessId: dailyStats.businessId,
      views: sql<number>`sum(${dailyStats.pageViews})::int`,
      clicks: sql<number>`sum(${dailyStats.websiteClicks})::int`,
    })
    .from(dailyStats)
    .where(inArray(dailyStats.businessId, businessIds))
    .groupBy(dailyStats.businessId);
  return new Map(rows.map((r) => [r.businessId, { views: r.views, clicks: r.clicks }]));
}
