import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { businesses, categories, follows } from "@/db/schema";
import { badRequest, notFound } from "./errors";

/** Most startups one person can save. Plenty for real use, and stops scripted abuse. */
export const MAX_SAVED = 500;

/** Save or unsave a startup. Returns the new state and the startup's saver count. */
export async function toggleFollow(userId: string, businessId: string) {
  return db.transaction(async (tx) => {
    const [biz] = await tx.select().from(businesses).where(eq(businesses.id, businessId)).for("update");
    if (!biz || biz.status !== "APPROVED") throw notFound("Business not found.");
    const removed = await tx.delete(follows).where(and(eq(follows.userId, userId), eq(follows.businessId, businessId))).returning();
    if (removed.length) {
      const [after] = await tx
        .update(businesses)
        .set({ followerCount: sql`greatest(${businesses.followerCount} - 1, 0)` })
        .where(eq(businesses.id, businessId))
        .returning({ n: businesses.followerCount });
      return { saved: false, followerCount: after!.n };
    }
    if (biz.ownerId === userId) throw badRequest("This is your own startup. It's already on your dashboard.");
    const [{ n: mine }] = (await tx.select({ n: sql<number>`count(*)::int` }).from(follows).where(eq(follows.userId, userId))) as [{ n: number }];
    if (mine >= MAX_SAVED) throw badRequest(`You can save up to ${MAX_SAVED} startups. Remove a few first.`);
    await tx.insert(follows).values({ userId, businessId });
    const [after] = await tx
      .update(businesses)
      .set({ followerCount: sql`${businesses.followerCount} + 1` })
      .where(eq(businesses.id, businessId))
      .returning({ n: businesses.followerCount });
    return { saved: true, followerCount: after!.n };
  });
}

export async function isSaved(userId: string | undefined, businessId: string) {
  if (!userId) return false;
  const [row] = await db.select({ b: follows.businessId }).from(follows).where(and(eq(follows.userId, userId), eq(follows.businessId, businessId)));
  return !!row;
}

/** A person's saved startups, newest save first. Listings that are no longer public are left out. */
export async function listSaved(userId: string) {
  return db
    .select({ business: businesses, categoryName: categories.name, savedAt: follows.createdAt })
    .from(follows)
    .innerJoin(businesses, eq(businesses.id, follows.businessId))
    .innerJoin(categories, eq(categories.id, businesses.categoryId))
    .where(and(eq(follows.userId, userId), eq(businesses.status, "APPROVED")))
    .orderBy(desc(follows.createdAt));
}
