import { describe, expect, it } from "vitest";
import { checkBidAmount, interleave, priceToReach, rankBids, slugify, sponsoredSliceForPage, trendingScore, zoneFor, zonePrices } from "@/lib/rules";

describe("zones", () => {
  it("maps positions to zones at the boundaries", () => {
    expect(zoneFor(1)?.key).toBe("TOP_10");
    expect(zoneFor(10)?.key).toBe("TOP_10");
    expect(zoneFor(11)?.key).toBe("TOP_50");
    expect(zoneFor(50)?.key).toBe("TOP_50");
    expect(zoneFor(51)?.key).toBe("TOP_100");
    expect(zoneFor(100)?.key).toBe("TOP_100");
    expect(zoneFor(101)).toBeNull();
    expect(zoneFor(0)).toBeNull();
  });
});

describe("checkBidAmount", () => {
  const reservePaise = 50_000; // ₹500
  it("accepts a valid first bid", () => expect(checkBidAmount({ amountPaise: 100_000, reservePaise }).ok).toBe(true));
  it("rejects below reserve", () => expect(checkBidAmount({ amountPaise: 40_000, reservePaise }).ok).toBe(false));
  it("rejects non-step amounts", () => expect(checkBidAmount({ amountPaise: 55_050, reservePaise }).ok).toBe(false));
  it("rejects above the cap", () => expect(checkBidAmount({ amountPaise: 600_000_000, reservePaise }).ok).toBe(false));
  it("rejects lowering or equal re-bids", () => {
    expect(checkBidAmount({ amountPaise: 90_000, reservePaise, previousPaise: 100_000 }).ok).toBe(false);
    expect(checkBidAmount({ amountPaise: 100_000, reservePaise, previousPaise: 100_000 }).ok).toBe(false);
  });
  it("accepts a raise of one step", () => expect(checkBidAmount({ amountPaise: 110_000, reservePaise, previousPaise: 100_000 }).ok).toBe(true));
  it("rejects zero and fractions", () => {
    expect(checkBidAmount({ amountPaise: 0, reservePaise }).ok).toBe(false);
    expect(checkBidAmount({ amountPaise: 50_000.5, reservePaise }).ok).toBe(false);
  });
});

describe("rankBids", () => {
  const t = (s: number) => new Date(1_700_000_000_000 + s * 1000);
  it("orders by amount desc, then earliest commit, then id", () => {
    const ranked = rankBids([
      { id: "c", amountPaise: 1000, amountSetAt: t(5) },
      { id: "a", amountPaise: 2000, amountSetAt: t(9) },
      { id: "b", amountPaise: 1000, amountSetAt: t(1) },
      { id: "d", amountPaise: 1000, amountSetAt: t(1) },
    ]);
    expect(ranked.map((r) => r.id)).toEqual(["a", "b", "d", "c"]);
    expect(ranked.map((r) => r.position)).toEqual([1, 2, 3, 4]);
  });
  it("does not mutate the input", () => {
    const input = [{ id: "x", amountPaise: 1, amountSetAt: t(0) }, { id: "y", amountPaise: 2, amountSetAt: t(0) }];
    rankBids(input);
    expect(input[0]!.id).toBe("x");
  });
});

describe("priceToReach / zonePrices", () => {
  const others = Array.from({ length: 12 }, (_, i) => ({ amountPaise: (20 - i) * 10_000 })); // ₹2000 … ₹900
  it("returns reserve when the zone has empty spots", () => {
    expect(priceToReach(50, others, 50_000)).toBe(50_000);
  });
  it("must beat the current holder by one step", () => {
    expect(priceToReach(1, others, 50_000)).toBe(210_000);
    expect(priceToReach(10, others, 50_000)).toBe(120_000);
  });
  it("never goes below reserve", () => {
    expect(priceToReach(1, [{ amountPaise: 10_000 }], 50_000)).toBe(50_000);
  });
  it("gives a price per zone", () => {
    expect(zonePrices(others, 50_000).map((z) => z.pricePaise)).toEqual([120_000, 50_000, 50_000]);
  });
});

describe("trendingScore", () => {
  const now = new Date("2026-11-04T00:00:00Z");
  it("newer listings with the same votes score higher", () => {
    expect(trendingScore(10, new Date("2026-11-03T22:00:00Z"), now)).toBeGreaterThan(trendingScore(10, new Date("2026-10-28T00:00:00Z"), now));
  });
  it("more votes score higher at the same age", () => {
    const at = new Date("2026-11-03T00:00:00Z");
    expect(trendingScore(20, at, now)).toBeGreaterThan(trendingScore(5, at, now));
  });
  it("is finite for a listing approved in the future (clock skew)", () => {
    expect(Number.isFinite(trendingScore(1, new Date("2026-11-05T00:00:00Z"), now))).toBe(true);
  });
});

describe("interleave", () => {
  const o = (id: string) => ({ id });
  it("inserts one sponsored after every N organic", () => {
    const feed = interleave(["1", "2", "3", "4", "5", "6", "7", "8"].map(o), [{ item: o("S1"), position: 11 }, { item: o("S2"), position: 12 }], 4);
    expect(feed.map((f) => (f.kind === "sponsored" ? `[${f.item.id}]` : f.item.id))).toEqual(["1", "2", "3", "4", "[S1]", "5", "6", "7", "8", "[S2]"]);
  });
  it("removes organic duplicates of sponsored businesses", () => {
    const feed = interleave(["1", "S1", "2"].map(o), [{ item: o("S1"), position: 11 }], 4);
    expect(feed.filter((f) => f.item.id === "S1")).toHaveLength(1);
    expect(feed.find((f) => f.item.id === "S1")?.kind).toBe("sponsored");
  });
  it("appends leftover sponsored items when organic runs out", () => {
    const feed = interleave([o("1")], [{ item: o("S1"), position: 11 }, { item: o("S2"), position: 12 }], 4);
    expect(feed.map((f) => f.item.id)).toEqual(["1", "S1", "S2"]);
  });
  it("handles empty inputs", () => {
    expect(interleave([], [], 4)).toEqual([]);
  });
});

describe("sponsoredSliceForPage", () => {
  it("covers positions 11–100 across pages without gaps or overlap", () => {
    const seen: number[] = [];
    for (let p = 1; p <= 30; p++) {
      const s = sponsoredSliceForPage(p, 20, 4);
      if (!s) break;
      for (let i = s.first; i <= s.last; i++) seen.push(i);
    }
    expect(seen[0]).toBe(11);
    expect(seen.at(-1)).toBe(100);
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen.length).toBe(90);
  });
});

describe("slugify", () => {
  it("makes URL-safe slugs", () => {
    expect(slugify("Café Déjà Vu — AI!")).toBe("cafe-deja-vu-ai");
    expect(slugify("   ")).toBe("business");
  });
});

describe("reserve not on a step boundary", () => {
  it("priceToReach rounds up to a biddable amount", () => {
    expect(priceToReach(1, [], 75_000)).toBe(80_000);
    expect(checkBidAmount({ amountPaise: priceToReach(1, [], 75_000), reservePaise: 75_000 }).ok).toBe(true);
  });
});
