import { describe, expect, it } from "vitest";
import { addWeeks, biddingWeek, currentWeek, isBiddingOpen, istDay, weekStartOf } from "@/lib/week";

describe("auction weeks (IST)", () => {
  it("week starts Monday 00:00 IST = Sunday 18:30 UTC", () => {
    // Wed 4 Nov 2026 10:00 UTC → week starts Mon 2 Nov 00:00 IST = Sun 1 Nov 18:30 UTC
    expect(weekStartOf(new Date("2026-11-04T10:00:00Z")).toISOString()).toBe("2026-11-01T18:30:00.000Z");
  });

  it("Sunday 23:59 IST still belongs to the previous week", () => {
    // Sun 8 Nov 23:59 IST = 18:29 UTC
    expect(weekStartOf(new Date("2026-11-08T18:29:00Z")).toISOString()).toBe("2026-11-01T18:30:00.000Z");
  });

  it("Monday 00:00 IST exactly starts a new week", () => {
    expect(weekStartOf(new Date("2026-11-08T18:30:00Z")).toISOString()).toBe("2026-11-08T18:30:00.000Z");
  });

  it("bidding week is always the next week, and its window is open now", () => {
    const now = new Date("2026-11-04T10:00:00Z");
    const bw = biddingWeek(now);
    expect(bw.getTime()).toBe(addWeeks(currentWeek(now), 1).getTime());
    expect(isBiddingOpen(bw, now)).toBe(true);
    expect(isBiddingOpen(currentWeek(now), now)).toBe(false);
    expect(isBiddingOpen(addWeeks(bw, 1), now)).toBe(false);
  });

  it("IST day bucket rolls over at IST midnight", () => {
    expect(istDay(new Date("2026-11-04T18:29:00Z"))).toBe("2026-11-04");
    expect(istDay(new Date("2026-11-04T18:30:00Z"))).toBe("2026-11-05");
  });
});
