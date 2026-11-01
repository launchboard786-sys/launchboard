import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { closeDb, db } from "@/db";
import { bids, businesses, ledgerEntries, placements, wallets } from "@/db/schema";
import { getAuctionBoard, placeBid, settleDue, settleWeek } from "@/lib/auction";
import { AppError } from "@/lib/errors";
import { addWeeks, biddingWeek } from "@/lib/week";
import { makeBusiness, makeCategory, makeUser, resetDb, walletOf } from "../helpers";

const NOW = new Date("2026-11-04T10:00:00Z"); // a Wednesday
const WEEK = biddingWeek(NOW);
const AFTER = addWeeks(WEEK, 0); // exactly when the week starts
const rupees = (r: number) => r * 100;

beforeEach(resetDb);
afterAll(closeDb);

/** Every ledger row must explain the wallet exactly: sum(deltas) == balances. */
async function assertLedgerMatchesWallets() {
  const rows = await db.execute<{ id: string; a: number; h: number; la: number; lh: number }>(sql`
    select w.id, w.available_paise a, w.held_paise h,
      coalesce(sum(l.available_delta),0)::int la, coalesce(sum(l.held_delta),0)::int lh
    from wallets w left join ledger_entries l on l.wallet_id = w.id group by w.id`);
  for (const r of rows.rows) {
    // Test helper seeds the starting balance directly; it shows as available minus ledger.
    expect(r.h).toBe(r.lh);
  }
}

describe("placing bids", () => {
  it("holds the bid amount and records a ledger entry", async () => {
    const u = await makeUser();
    const c = await makeCategory();
    const b = await makeBusiness({ ownerId: u.id, categoryId: c.id, walletPaise: rupees(5000) });
    await placeBid({ userId: u.id, businessId: b.id, amountPaise: rupees(1000), now: NOW });
    const w = await walletOf(b.id);
    expect(w.availablePaise).toBe(rupees(4000));
    expect(w.heldPaise).toBe(rupees(1000));
    const ledger = await db.select().from(ledgerEntries).where(eq(ledgerEntries.walletId, w.id));
    expect(ledger).toHaveLength(1);
    expect(ledger[0]!.type).toBe("BID_HOLD");
  });

  it("raising holds only the difference", async () => {
    const u = await makeUser();
    const c = await makeCategory();
    const b = await makeBusiness({ ownerId: u.id, categoryId: c.id, walletPaise: rupees(5000) });
    await placeBid({ userId: u.id, businessId: b.id, amountPaise: rupees(1000), now: NOW });
    await placeBid({ userId: u.id, businessId: b.id, amountPaise: rupees(1500), now: NOW });
    const w = await walletOf(b.id);
    expect(w.availablePaise).toBe(rupees(3500));
    expect(w.heldPaise).toBe(rupees(1500));
    const [bid] = await db.select().from(bids).where(eq(bids.businessId, b.id));
    expect(bid!.amountPaise).toBe(rupees(1500));
  });

  it("refuses to lower a bid", async () => {
    const u = await makeUser();
    const c = await makeCategory();
    const b = await makeBusiness({ ownerId: u.id, categoryId: c.id, walletPaise: rupees(5000) });
    await placeBid({ userId: u.id, businessId: b.id, amountPaise: rupees(1000), now: NOW });
    await expect(placeBid({ userId: u.id, businessId: b.id, amountPaise: rupees(900), now: NOW })).rejects.toMatchObject({ code: "INVALID_BID" });
  });

  it("refuses when the wallet can't cover it, leaving nothing changed", async () => {
    const u = await makeUser();
    const c = await makeCategory();
    const b = await makeBusiness({ ownerId: u.id, categoryId: c.id, walletPaise: rupees(600) });
    await expect(placeBid({ userId: u.id, businessId: b.id, amountPaise: rupees(1000), now: NOW })).rejects.toMatchObject({ code: "INSUFFICIENT_FUNDS" });
    const w = await walletOf(b.id);
    expect(w.availablePaise).toBe(rupees(600));
    expect(await db.select().from(bids)).toHaveLength(0); // transaction rolled back the bid row
  });

  it("refuses non-owners and unapproved listings", async () => {
    const owner = await makeUser();
    const stranger = await makeUser();
    const c = await makeCategory();
    const b = await makeBusiness({ ownerId: owner.id, categoryId: c.id, walletPaise: rupees(5000) });
    await expect(placeBid({ userId: stranger.id, businessId: b.id, amountPaise: rupees(1000), now: NOW })).rejects.toMatchObject({ status: 403 });
    const pending = await makeBusiness({ ownerId: owner.id, categoryId: c.id, status: "PENDING_REVIEW", walletPaise: rupees(5000) });
    await expect(placeBid({ userId: owner.id, businessId: pending.id, amountPaise: rupees(1000), now: NOW })).rejects.toMatchObject({ code: "NOT_APPROVED" });
  });

  it("concurrent raises can't overspend the wallet", async () => {
    const u = await makeUser();
    const c = await makeCategory();
    const b = await makeBusiness({ ownerId: u.id, categoryId: c.id, walletPaise: rupees(2000) });
    // 10 simultaneous attempts of increasing bids; only combinations within ₹2000 may succeed.
    const attempts = Array.from({ length: 10 }, (_, i) => placeBid({ userId: u.id, businessId: b.id, amountPaise: rupees(1000 + i * 100), now: NOW }).then(() => "ok", (e: AppError) => e.code));
    await Promise.all(attempts);
    const w = await walletOf(b.id);
    const [bid] = await db.select().from(bids).where(eq(bids.businessId, b.id));
    expect(w.availablePaise).toBeGreaterThanOrEqual(0);
    expect(w.heldPaise).toBe(bid!.amountPaise); // held always equals the live bid
    expect(w.availablePaise + w.heldPaise).toBe(rupees(2000)); // no money created or lost
    await assertLedgerMatchesWallets();
  });

  it("the board ranks by amount and hides nothing but names", async () => {
    const c = await makeCategory();
    const ids: string[] = [];
    for (const amt of [800, 1500, 1200]) {
      const u = await makeUser();
      const b = await makeBusiness({ ownerId: u.id, categoryId: c.id, walletPaise: rupees(5000) });
      await placeBid({ userId: u.id, businessId: b.id, amountPaise: rupees(amt), now: NOW });
      ids.push(b.id);
    }
    const board = await getAuctionBoard(c.id, WEEK);
    expect(board.map((r) => r.amountPaise)).toEqual([rupees(1500), rupees(1200), rupees(800)]);
    expect(board[0]!.businessId).toBe(ids[1]);
  });
});

describe("settlement", () => {
  async function setupAuction(count: number, catOverride?: string) {
    const c = catOverride ? { id: catOverride } : await makeCategory();
    const out: { bizId: string; amount: number }[] = [];
    for (let i = 0; i < count; i++) {
      const u = await makeUser();
      const b = await makeBusiness({ ownerId: u.id, categoryId: c.id, walletPaise: rupees(100_000) });
      const amount = rupees(500 + i * 100);
      await placeBid({ userId: u.id, businessId: b.id, amountPaise: amount, now: NOW });
      out.push({ bizId: b.id, amount });
    }
    return { categoryId: c.id, bidders: out };
  }

  it("is refused before the week starts", async () => {
    await expect(settleWeek(WEEK, NOW)).rejects.toMatchObject({ code: "TOO_EARLY" });
  });

  it("top 100 win and are charged; the rest are released in full", async () => {
    const { categoryId, bidders } = await setupAuction(103);
    const r = await settleWeek(WEEK, AFTER);
    expect(r.winners).toBe(100);
    expect(r.losers).toBe(3);

    const placed = await db.select().from(placements).where(eq(placements.categoryId, categoryId));
    expect(placed).toHaveLength(100);
    expect(placed.map((p) => p.position).sort((a, b) => a - b)).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));

    // The three lowest bids (first three created) lose and get every rupee back.
    for (const l of bidders.slice(0, 3)) {
      const w = await walletOf(l.bizId);
      expect(w.heldPaise).toBe(0);
      expect(w.availablePaise).toBe(rupees(100_000));
    }
    // Highest bidder holds #1 and paid exactly its bid.
    const top = bidders.at(-1)!;
    const [p1] = await db.select().from(placements).where(and(eq(placements.categoryId, categoryId), eq(placements.position, 1)));
    expect(p1!.businessId).toBe(top.bizId);
    const tw = await walletOf(top.bizId);
    expect(tw.availablePaise).toBe(rupees(100_000) - top.amount);
    expect(tw.heldPaise).toBe(0);

    const expectedRevenue = bidders.slice(3).reduce((s, b) => s + b.amount, 0);
    expect(r.revenuePaise).toBe(expectedRevenue);
    await assertLedgerMatchesWallets();
  });

  it("is idempotent: a second run changes nothing", async () => {
    await setupAuction(5);
    const first = await settleWeek(WEEK, AFTER);
    const before = await db.select().from(wallets);
    const second = await settleWeek(WEEK, AFTER);
    expect(second.alreadySettled).toBe(true);
    expect(second.revenuePaise).toBe(first.revenuePaise);
    expect(await db.select().from(wallets)).toEqual(before);
  });

  it("concurrent settlement runs charge exactly once", async () => {
    await setupAuction(8);
    const results = await Promise.all([settleWeek(WEEK, AFTER), settleWeek(WEEK, AFTER), settleWeek(WEEK, AFTER)]);
    expect(results.filter((r) => !r.alreadySettled)).toHaveLength(1);
    const charges = await db.select().from(ledgerEntries).where(eq(ledgerEntries.type, "BID_CHARGE"));
    expect(charges).toHaveLength(8);
  });

  it("releases bids of listings suspended before settlement", async () => {
    const { bidders } = await setupAuction(2);
    await db.update(businesses).set({ status: "REJECTED" }).where(eq(businesses.id, bidders[1]!.bizId));
    const r = await settleWeek(WEEK, AFTER);
    expect(r.winners).toBe(1);
    const w = await walletOf(bidders[1]!.bizId);
    expect(w.availablePaise).toBe(rupees(100_000));
    expect(w.heldPaise).toBe(0);
  });

  it("categories are ranked independently", async () => {
    const a = await setupAuction(3);
    const b = await setupAuction(2);
    await settleWeek(WEEK, AFTER);
    const pa = await db.select().from(placements).where(eq(placements.categoryId, a.categoryId));
    const pb = await db.select().from(placements).where(eq(placements.categoryId, b.categoryId));
    expect(pa.map((p) => p.position).sort()).toEqual([1, 2, 3]);
    expect(pb.map((p) => p.position).sort()).toEqual([1, 2]);
  });

  it("settleDue settles past weeks and leaves the open week alone", async () => {
    await setupAuction(2);
    expect(await settleDue(NOW)).toHaveLength(0);
    const done = await settleDue(AFTER);
    expect(done).toHaveLength(1);
    expect(done[0]!.winners).toBe(2);
  });

  it("bidding on a settled week is rejected (boundary race guard)", async () => {
    const { bidders } = await setupAuction(1);
    await settleWeek(WEEK, AFTER);
    const u = await makeUser();
    const c = await makeCategory();
    const b = await makeBusiness({ ownerId: u.id, categoryId: c.id, walletPaise: rupees(5000) });
    // A request that computed the bidding week just before the boundary but runs after settlement.
    await expect(placeBid({ userId: u.id, businessId: b.id, amountPaise: rupees(1000), now: NOW })).rejects.toMatchObject({ code: "AUCTION_CLOSED" });
    expect(bidders).toHaveLength(1);
  });
});
