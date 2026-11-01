import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { businesses, categories, ledgerEntries, payments, settlements, users } from "@/db/schema";

export async function adminOverview() {
  const [rev] = await db
    .select({ paise: sql<number>`coalesce(-sum(${ledgerEntries.heldDelta}), 0)::int` })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.type, "BID_CHARGE"));
  const [fees] = await db
    .select({ paise: sql<number>`coalesce(sum(${payments.amountPaise}), 0)::int` })
    .from(payments)
    .where(and(eq(payments.status, "PAID"), eq(payments.purpose, "LISTING_FEE")));
  const [topups] = await db
    .select({ paise: sql<number>`coalesce(sum(${payments.amountPaise}), 0)::int` })
    .from(payments)
    .where(and(eq(payments.status, "PAID"), eq(payments.purpose, "WALLET_TOPUP")));
  const statusCounts = await db.select({ status: businesses.status, n: count() }).from(businesses).groupBy(businesses.status);
  const [userCount] = await db.select({ n: count() }).from(users);
  return {
    adRevenuePaise: rev?.paise ?? 0,
    listingFeesPaise: fees?.paise ?? 0,
    topupsPaise: topups?.paise ?? 0,
    users: userCount?.n ?? 0,
    byStatus: Object.fromEntries(statusCounts.map((r) => [r.status, r.n])) as Record<string, number>,
  };
}

export async function pendingListings() {
  return db
    .select({ business: businesses, categoryName: categories.name, ownerEmail: users.email })
    .from(businesses)
    .innerJoin(categories, eq(categories.id, businesses.categoryId))
    .innerJoin(users, eq(users.id, businesses.ownerId))
    .where(eq(businesses.status, "PENDING_REVIEW"))
    .orderBy(businesses.updatedAt);
}

export async function recentPayments(limit = 20) {
  return db
    .select({ payment: payments, businessName: businesses.name })
    .from(payments)
    .innerJoin(businesses, eq(businesses.id, payments.businessId))
    .orderBy(desc(payments.createdAt))
    .limit(limit);
}

export async function recentSettlements(limit = 10) {
  return db.select().from(settlements).orderBy(desc(settlements.weekStart)).limit(limit);
}
