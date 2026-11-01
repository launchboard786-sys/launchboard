import { sql } from "drizzle-orm";
import { db } from "@/db";
import { businesses, categories, users, wallets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureWallet } from "@/lib/wallet";

export async function resetDb() {
  await db.execute(sql`truncate table users, categories, businesses, votes, wallets, ledger_entries, bids, settlements, placements, payments, daily_stats cascade`);
}

let n = 0;
export async function makeUser(role: "USER" | "ADMIN" = "USER") {
  n++;
  const [u] = await db.insert(users).values({ email: `u${n}-${Date.now()}@test.dev`, name: `User ${n}`, passwordHash: "x", role }).returning();
  return u!;
}

export async function makeCategory(reservePaise = 50_000) {
  n++;
  const [c] = await db.insert(categories).values({ slug: `cat-${n}`, name: `Category ${n}`, description: "Test category", reservePaise }).returning();
  return c!;
}

export async function makeBusiness(opts: { ownerId: string; categoryId: string; status?: "APPROVED" | "PENDING_REVIEW" | "PENDING_PAYMENT" | "REJECTED"; walletPaise?: number; approvedAt?: Date; voteCount?: number }) {
  n++;
  const [b] = await db
    .insert(businesses)
    .values({
      slug: `biz-${n}-${Date.now()}`,
      ownerId: opts.ownerId,
      categoryId: opts.categoryId,
      name: `Biz ${n}`,
      tagline: "A test business tagline",
      description: "A long enough description for a test business listing.",
      websiteUrl: "https://example.com",
      location: "Bangalore",
      foundedYear: 2025,
      stage: "MVP",
      status: opts.status ?? "APPROVED",
      approvedAt: opts.approvedAt ?? new Date(),
      voteCount: opts.voteCount ?? 0,
    })
    .returning();
  const w = await ensureWallet(db, b!.id);
  if (opts.walletPaise) await db.update(wallets).set({ availablePaise: opts.walletPaise }).where(eq(wallets.id, w.id));
  return b!;
}

export async function walletOf(businessId: string) {
  const [w] = await db.select().from(wallets).where(eq(wallets.businessId, businessId));
  return w!;
}
