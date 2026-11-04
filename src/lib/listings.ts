import { and, asc, count, desc, eq, ilike, ne, or, sql, inArray, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { bids, businesses, categories, votes, type Business } from "@/db/schema";
import { config } from "./config";
import { AppError, badRequest, forbidden, notFound } from "./errors";
import { slugify } from "./rules";
import type { ListingInput } from "./validation";
import { ensureWallet } from "./wallet";

async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base);
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const [hit] = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(excludeId ? and(eq(businesses.slug, candidate), ne(businesses.id, excludeId)) : eq(businesses.slug, candidate));
    if (!hit) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/** How many listings count toward the free quota (everything except rejected). */
export async function listingsUsedCount() {
  const [row] = await db.select({ n: count() }).from(businesses).where(ne(businesses.status, "REJECTED"));
  return row?.n ?? 0;
}

export async function createListing(ownerId: string, input: ListingInput) {
  const [cat] = await db.select().from(categories).where(eq(categories.id, input.categoryId));
  if (!cat) throw badRequest("Choose a valid category.");
  const used = await listingsUsedCount();
  const status = used < config.freeListingLimit ? "PENDING_REVIEW" : "PENDING_PAYMENT";
  const slug = await uniqueSlug(input.name);
  const biz = await db.transaction(async (tx) => {
    const [b] = await tx.insert(businesses).values({ ...input, ownerId, slug, status }).returning();
    if (!b) throw new Error("insert failed");
    await ensureWallet(tx, b.id);
    return b;
  });
  return { business: biz, needsPayment: status === "PENDING_PAYMENT" };
}

/**
 * Owners can edit their listing. Changing the name or website of an approved listing
 * sends it back to review (that's what visitors trust). Category can't change while a bid is open.
 */
export async function updateListing(ownerId: string, businessId: string, input: ListingInput) {
  const [biz] = await db.select().from(businesses).where(eq(businesses.id, businessId));
  if (!biz) throw notFound("Business not found.");
  if (biz.ownerId !== ownerId) throw forbidden();
  if (biz.status === "REJECTED") throw badRequest("Rejected listings can't be edited. Contact support.");

  if (input.categoryId !== biz.categoryId) {
    const [cat] = await db.select().from(categories).where(eq(categories.id, input.categoryId));
    if (!cat) throw badRequest("Choose a valid category.");
    const [open] = await db
      .select({ id: bids.id })
      .from(bids)
      .where(and(eq(bids.businessId, biz.id), eq(bids.status, "ACTIVE")));
    if (open) throw new AppError(409, "BID_OPEN", "You can't change category while you have an open bid.");
  }

  const identityChanged = input.name !== biz.name || input.websiteUrl !== biz.websiteUrl;
  const status = biz.status === "APPROVED" && identityChanged ? "PENDING_REVIEW" : biz.status;
  const slug = input.name !== biz.name ? await uniqueSlug(input.name, biz.id) : biz.slug;

  const [updated] = await db
    .update(businesses)
    .set({ ...input, slug, status, updatedAt: new Date() })
    .where(eq(businesses.id, biz.id))
    .returning();
  return { business: updated!, sentToReview: status !== biz.status };
}

export async function reviewListing(businessId: string, action: "approve" | "reject", reason?: string) {
  const [biz] = await db.select().from(businesses).where(eq(businesses.id, businessId));
  if (!biz) throw notFound("Business not found.");
  if (action === "approve") {
    if (biz.status === "PENDING_PAYMENT") throw badRequest("This listing hasn't paid its listing fee yet.");
    const [u] = await db
      .update(businesses)
      .set({ status: "APPROVED", rejectionReason: null, approvedAt: biz.approvedAt ?? new Date(), updatedAt: new Date() })
      .where(eq(businesses.id, biz.id))
      .returning();
    return u!;
  }
  if (!reason) throw badRequest("Give a reason so the owner knows what to fix.");
  const [u] = await db
    .update(businesses)
    .set({ status: "REJECTED", rejectionReason: reason, updatedAt: new Date() })
    .where(eq(businesses.id, biz.id))
    .returning();
  return u!;
}

export type OrganicSort = "trending" | "top" | "new";

export async function listOrganic(params: {
  categoryId?: string;
  sort: OrganicSort;
  page?: number;
  pageSize?: number;
  q?: string;
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? config.pageSize;
  const where: SQL[] = [eq(businesses.status, "APPROVED")];
  if (params.categoryId) where.push(eq(businesses.categoryId, params.categoryId));
  if (params.q) {
    const term = `%${params.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    where.push(or(ilike(businesses.name, term), ilike(businesses.tagline, term), ilike(businesses.description, term), ilike(businesses.location, term))!);
  }
  const order =
    params.sort === "top"
      ? [desc(businesses.voteCount), desc(businesses.approvedAt)]
      : params.sort === "new"
        ? [desc(businesses.approvedAt)]
        : [
            desc(
              sql`(${businesses.voteCount} + 1) / power(extract(epoch from (now() - ${businesses.approvedAt})) / 3600.0 + 2, 1.5)`,
            ),
            desc(businesses.approvedAt),
          ];

  const [items, totalRow] = await Promise.all([
    db
      .select({ business: businesses, categoryName: categories.name, categorySlug: categories.slug })
      .from(businesses)
      .innerJoin(categories, eq(categories.id, businesses.categoryId))
      .where(and(...where))
      .orderBy(...order)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ n: count() }).from(businesses).where(and(...where)),
  ]);
  const total = totalRow[0]?.n ?? 0;
  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getBusinessBySlug(slug: string) {
  const [row] = await db
    .select({ business: businesses, category: categories })
    .from(businesses)
    .innerJoin(categories, eq(categories.id, businesses.categoryId))
    .where(eq(businesses.slug, slug));
  return row ?? null;
}

/** Position in its category's organic ranking (by votes only; sponsored spots never count). */
export async function organicRank(b: { categoryId: string; voteCount: number }) {
  const [row] = await db
    .select({ n: count() })
    .from(businesses)
    .where(and(eq(businesses.categoryId, b.categoryId), eq(businesses.status, "APPROVED"), sql`${businesses.voteCount} > ${b.voteCount}`));
  return (row?.n ?? 0) + 1;
}

export async function getOwnedBusiness(ownerId: string, businessId: string) {
  const [row] = await db
    .select({ business: businesses, category: categories })
    .from(businesses)
    .innerJoin(categories, eq(categories.id, businesses.categoryId))
    .where(eq(businesses.id, businessId));
  if (!row) throw notFound("Business not found.");
  if (row.business.ownerId !== ownerId) throw forbidden();
  return row;
}

export async function listCategories() {
  return db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function categoryCounts() {
  const rows = await db
    .select({ categoryId: businesses.categoryId, n: count() })
    .from(businesses)
    .where(eq(businesses.status, "APPROVED"))
    .groupBy(businesses.categoryId);
  return new Map(rows.map((r) => [r.categoryId, r.n]));
}

// ---------------------------------------------------------------- votes

export async function toggleVote(userId: string, businessId: string) {
  return db.transaction(async (tx) => {
    const [biz] = await tx.select().from(businesses).where(eq(businesses.id, businessId)).for("update");
    if (!biz || biz.status !== "APPROVED") throw notFound("Business not found.");
    if (biz.ownerId === userId) throw badRequest("You can't upvote your own business.");
    const inserted = await tx.insert(votes).values({ userId, businessId }).onConflictDoNothing().returning();
    let voted: boolean;
    if (inserted.length) {
      voted = true;
      await tx.update(businesses).set({ voteCount: sql`${businesses.voteCount} + 1` }).where(eq(businesses.id, businessId));
    } else {
      voted = false;
      await tx.delete(votes).where(and(eq(votes.userId, userId), eq(votes.businessId, businessId)));
      await tx
        .update(businesses)
        .set({ voteCount: sql`greatest(${businesses.voteCount} - 1, 0)` })
        .where(eq(businesses.id, businessId));
    }
    const [after] = await tx.select({ voteCount: businesses.voteCount }).from(businesses).where(eq(businesses.id, businessId));
    return { voted, voteCount: after!.voteCount };
  });
}

export async function votedSet(userId: string | undefined, businessIds: string[]) {
  if (!userId || businessIds.length === 0) return new Set<string>();
  const rows = await db
    .select({ businessId: votes.businessId })
    .from(votes)
    .where(and(eq(votes.userId, userId), inArray(votes.businessId, businessIds)));
  return new Set(rows.map((r) => r.businessId));
}

export type { Business };
