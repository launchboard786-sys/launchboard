import { and, eq, gte, sql, desc } from "drizzle-orm";
import { db, type DBOrTx, type Tx } from "@/db";
import { wallets, ledgerEntries } from "@/db/schema";
import { AppError } from "./errors";

/** Get or create the wallet for a business (inside the given transaction). */
export async function ensureWallet(tx: DBOrTx, businessId: string) {
  await tx.insert(wallets).values({ businessId }).onConflictDoNothing({ target: wallets.businessId });
  const [w] = await tx.select().from(wallets).where(eq(wallets.businessId, businessId));
  if (!w) throw new Error("Wallet missing after upsert");
  return w;
}

export async function getWallet(businessId: string) {
  return ensureWallet(db, businessId);
}

/** Credit the available balance (top-up). */
export async function credit(tx: Tx, businessId: string, amountPaise: number, refId: string, note?: string) {
  if (amountPaise <= 0) throw new Error("credit must be positive");
  const w = await ensureWallet(tx, businessId);
  await tx
    .update(wallets)
    .set({ availablePaise: sql`${wallets.availablePaise} + ${amountPaise}` })
    .where(eq(wallets.id, w.id));
  await tx.insert(ledgerEntries).values({
    walletId: w.id,
    type: "TOPUP",
    availableDelta: amountPaise,
    heldDelta: 0,
    refId,
    note,
  });
}

/**
 * Move money from available to held. Atomic: the UPDATE only matches if the
 * available balance covers it, so concurrent holds can never overspend.
 */
export async function hold(tx: Tx, businessId: string, amountPaise: number, refId: string, note?: string) {
  if (amountPaise <= 0) throw new Error("hold must be positive");
  const w = await ensureWallet(tx, businessId);
  const updated = await tx
    .update(wallets)
    .set({
      availablePaise: sql`${wallets.availablePaise} - ${amountPaise}`,
      heldPaise: sql`${wallets.heldPaise} + ${amountPaise}`,
    })
    .where(and(eq(wallets.id, w.id), gte(wallets.availablePaise, amountPaise)))
    .returning({ id: wallets.id });
  if (updated.length !== 1) {
    throw new AppError(402, "INSUFFICIENT_FUNDS", "Your wallet balance is too low for this bid. Add funds and try again.");
  }
  await tx.insert(ledgerEntries).values({
    walletId: w.id,
    type: "BID_HOLD",
    availableDelta: -amountPaise,
    heldDelta: amountPaise,
    refId,
    note,
  });
}

/** Held → gone (revenue). Used when a bid wins. */
export async function chargeHeld(tx: Tx, businessId: string, amountPaise: number, refId: string, note?: string) {
  const w = await ensureWallet(tx, businessId);
  const updated = await tx
    .update(wallets)
    .set({ heldPaise: sql`${wallets.heldPaise} - ${amountPaise}` })
    .where(and(eq(wallets.id, w.id), gte(wallets.heldPaise, amountPaise)))
    .returning({ id: wallets.id });
  if (updated.length !== 1) throw new Error(`Held balance too low to charge ${amountPaise} on wallet ${w.id}`);
  await tx.insert(ledgerEntries).values({
    walletId: w.id,
    type: "BID_CHARGE",
    availableDelta: 0,
    heldDelta: -amountPaise,
    refId,
    note,
  });
}

/** Held → available. Used when a bid loses. */
export async function releaseHeld(tx: Tx, businessId: string, amountPaise: number, refId: string, note?: string) {
  const w = await ensureWallet(tx, businessId);
  const updated = await tx
    .update(wallets)
    .set({
      heldPaise: sql`${wallets.heldPaise} - ${amountPaise}`,
      availablePaise: sql`${wallets.availablePaise} + ${amountPaise}`,
    })
    .where(and(eq(wallets.id, w.id), gte(wallets.heldPaise, amountPaise)))
    .returning({ id: wallets.id });
  if (updated.length !== 1) throw new Error(`Held balance too low to release ${amountPaise} on wallet ${w.id}`);
  await tx.insert(ledgerEntries).values({
    walletId: w.id,
    type: "BID_RELEASE",
    availableDelta: amountPaise,
    heldDelta: -amountPaise,
    refId,
    note,
  });
}

/** Admin refund of available balance (paid out manually or through the gateway's refund screen). */
export async function refundAvailable(tx: Tx, businessId: string, amountPaise: number, note: string) {
  if (amountPaise <= 0) throw new AppError(400, "BAD_REQUEST", "Refund amount must be positive.");
  const w = await ensureWallet(tx, businessId);
  const updated = await tx
    .update(wallets)
    .set({ availablePaise: sql`${wallets.availablePaise} - ${amountPaise}` })
    .where(and(eq(wallets.id, w.id), gte(wallets.availablePaise, amountPaise)))
    .returning({ id: wallets.id });
  if (updated.length !== 1) throw new AppError(400, "BAD_REQUEST", "Refund is larger than the available balance.");
  await tx.insert(ledgerEntries).values({
    walletId: w.id,
    type: "REFUND",
    availableDelta: -amountPaise,
    heldDelta: 0,
    note,
  });
}

export async function getLedger(businessId: string, limit = 50) {
  const w = await ensureWallet(db, businessId);
  return db
    .select()
    .from(ledgerEntries)
    .where(eq(ledgerEntries.walletId, w.id))
    .orderBy(desc(ledgerEntries.createdAt))
    .limit(limit);
}
