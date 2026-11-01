import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDb, db } from "@/db";
import { businesses } from "@/db/schema";
import { placeBid } from "@/lib/auction";
import { createListing, listOrganic, reviewListing, toggleVote, updateListing } from "@/lib/listings";
import { bump, statsForBusiness } from "@/lib/stats";
import { makeBusiness, makeCategory, makeUser, resetDb } from "../helpers";

beforeEach(resetDb);
afterAll(closeDb);

const input = (categoryId: string, name = "Acme Robotics") => ({
  name,
  tagline: "Robots that sort recycling",
  description: "We build affordable robots that sort household recycling for municipalities.",
  websiteUrl: "https://acme.example",
  logoUrl: null,
  location: "Bangalore",
  foundedYear: 2025,
  stage: "MVP" as const,
  categoryId,
});

describe("listing lifecycle", () => {
  it("first N listings are free; after that a fee is required (FREE_LISTING_LIMIT=5 in tests)", async () => {
    const u = await makeUser();
    const c = await makeCategory();
    const results = [];
    for (let i = 0; i < 6; i++) results.push(await createListing(u.id, input(c.id, `Startup ${i}`)));
    expect(results.slice(0, 5).every((r) => !r.needsPayment && r.business.status === "PENDING_REVIEW")).toBe(true);
    expect(results[5]!.needsPayment).toBe(true);
    expect(results[5]!.business.status).toBe("PENDING_PAYMENT");
  });

  it("gives unique slugs for the same name", async () => {
    const u = await makeUser();
    const c = await makeCategory();
    const a = await createListing(u.id, input(c.id));
    const b = await createListing(u.id, input(c.id));
    expect(a.business.slug).toBe("acme-robotics");
    expect(b.business.slug).toBe("acme-robotics-2");
  });

  it("approve sets approvedAt; reject needs a reason; unpaid can't be approved", async () => {
    const u = await makeUser();
    const c = await makeCategory();
    const { business } = await createListing(u.id, input(c.id));
    await expect(reviewListing(business.id, "reject")).rejects.toMatchObject({ status: 400 });
    const ok = await reviewListing(business.id, "approve");
    expect(ok.status).toBe("APPROVED");
    expect(ok.approvedAt).toBeInstanceOf(Date);
    const unpaid = await makeBusiness({ ownerId: u.id, categoryId: c.id, status: "PENDING_PAYMENT" });
    await expect(reviewListing(unpaid.id, "approve")).rejects.toMatchObject({ status: 400 });
  });

  it("renaming an approved listing sends it back to review; tagline edits don't", async () => {
    const u = await makeUser();
    const c = await makeCategory();
    const b = await makeBusiness({ ownerId: u.id, categoryId: c.id });
    const base = { ...input(c.id, b.name), websiteUrl: b.websiteUrl };
    const r1 = await updateListing(u.id, b.id, { ...base, tagline: "A brand new tagline here" });
    expect(r1.sentToReview).toBe(false);
    const r2 = await updateListing(u.id, b.id, { ...base, name: "Totally Different Co" });
    expect(r2.sentToReview).toBe(true);
    expect(r2.business.status).toBe("PENDING_REVIEW");
  });

  it("blocks category changes while a bid is open", async () => {
    const u = await makeUser();
    const c1 = await makeCategory();
    const c2 = await makeCategory();
    const b = await makeBusiness({ ownerId: u.id, categoryId: c1.id, walletPaise: 500_000 });
    await placeBid({ userId: u.id, businessId: b.id, amountPaise: 100_000 });
    await expect(updateListing(u.id, b.id, { ...input(c2.id, b.name), websiteUrl: b.websiteUrl })).rejects.toMatchObject({ code: "BID_OPEN" });
  });

  it("only the owner can edit", async () => {
    const u = await makeUser();
    const x = await makeUser();
    const c = await makeCategory();
    const b = await makeBusiness({ ownerId: u.id, categoryId: c.id });
    await expect(updateListing(x.id, b.id, input(c.id))).rejects.toMatchObject({ status: 403 });
  });
});

describe("votes", () => {
  it("toggles on and off and keeps the counter right", async () => {
    const owner = await makeUser();
    const voter = await makeUser();
    const c = await makeCategory();
    const b = await makeBusiness({ ownerId: owner.id, categoryId: c.id });
    expect(await toggleVote(voter.id, b.id)).toEqual({ voted: true, voteCount: 1 });
    expect(await toggleVote(voter.id, b.id)).toEqual({ voted: false, voteCount: 0 });
  });

  it("owners can't vote for themselves; unapproved can't be voted", async () => {
    const owner = await makeUser();
    const c = await makeCategory();
    const b = await makeBusiness({ ownerId: owner.id, categoryId: c.id });
    await expect(toggleVote(owner.id, b.id)).rejects.toMatchObject({ status: 400 });
    const p = await makeBusiness({ ownerId: owner.id, categoryId: c.id, status: "PENDING_REVIEW" });
    const v = await makeUser();
    await expect(toggleVote(v.id, p.id)).rejects.toMatchObject({ status: 404 });
  });

  it("concurrent votes from many users count exactly", async () => {
    const owner = await makeUser();
    const c = await makeCategory();
    const b = await makeBusiness({ ownerId: owner.id, categoryId: c.id });
    const voters = await Promise.all(Array.from({ length: 15 }, () => makeUser()));
    await Promise.all(voters.map((v) => toggleVote(v.id, b.id)));
    const [after] = await db.select().from(businesses).where(eq(businesses.id, b.id));
    expect(after!.voteCount).toBe(15);
  });
});

describe("organic ranking", () => {
  it("trending favours fresh traction; top favours total votes; hides unapproved", async () => {
    const u = await makeUser();
    const c = await makeCategory();
    const now = Date.now();
    const old = await makeBusiness({ ownerId: u.id, categoryId: c.id, voteCount: 50, approvedAt: new Date(now - 30 * 86_400_000) });
    const fresh = await makeBusiness({ ownerId: u.id, categoryId: c.id, voteCount: 10, approvedAt: new Date(now - 3 * 3_600_000) });
    await makeBusiness({ ownerId: u.id, categoryId: c.id, status: "PENDING_REVIEW", voteCount: 999 });
    const trending = await listOrganic({ categoryId: c.id, sort: "trending" });
    expect(trending.items.map((i) => i.business.id)).toEqual([fresh.id, old.id]);
    const top = await listOrganic({ categoryId: c.id, sort: "top" });
    expect(top.items.map((i) => i.business.id)).toEqual([old.id, fresh.id]);
    expect(top.total).toBe(2);
  });

  it("search matches name/tagline and escapes LIKE wildcards", async () => {
    const u = await makeUser();
    const c = await makeCategory();
    await makeBusiness({ ownerId: u.id, categoryId: c.id });
    expect((await listOrganic({ sort: "top", q: "test business" })).total).toBe(1);
    expect((await listOrganic({ sort: "top", q: "%" })).total).toBe(0);
  });
});

describe("stats", () => {
  it("bumps daily counters and builds a gap-free series", async () => {
    const u = await makeUser();
    const c = await makeCategory();
    const b = await makeBusiness({ ownerId: u.id, categoryId: c.id });
    await bump([b.id], "sponsoredImpressions");
    await bump([b.id, b.id], "sponsoredImpressions"); // duplicates in one call count once
    await bump([b.id], "sponsoredClicks");
    const s = await statsForBusiness(b.id, 7);
    expect(s.series).toHaveLength(7);
    expect(s.totals.sponsoredImpressions).toBe(2);
    expect(s.totals.sponsoredClicks).toBe(1);
  });
});
