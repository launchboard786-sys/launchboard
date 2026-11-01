import { config } from "./config";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Start of the auction week (Monday 00:00 in IST) containing `date`, as a UTC Date.
 * IST is a fixed +05:30 offset, so plain arithmetic is exact.
 */
export function weekStartOf(date: Date): Date {
  const offsetMs = config.tzOffsetMinutes * 60_000;
  const local = new Date(date.getTime() + offsetMs); // "wall clock" in IST, read via UTC getters
  const day = local.getUTCDay(); // 0 = Sunday
  const daysSinceMonday = (day + 6) % 7;
  const localMidnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(localMidnight - daysSinceMonday * 24 * 3600_000 - offsetMs);
}

export function addWeeks(weekStart: Date, n: number): Date {
  return new Date(weekStart.getTime() + n * WEEK_MS);
}

/** The week currently live (placements shown on the site). */
export function currentWeek(now = new Date()): Date {
  return weekStartOf(now);
}

/** The week businesses are bidding on right now. */
export function biddingWeek(now = new Date()): Date {
  return addWeeks(weekStartOf(now), 1);
}

/** Bidding for `weekStart` is open from the previous week's start until `weekStart` itself. */
export function isBiddingOpen(weekStart: Date, now = new Date()): boolean {
  const t = now.getTime();
  return t >= addWeeks(weekStart, -1).getTime() && t < weekStart.getTime();
}

/** Human-readable range like "3 Nov – 9 Nov 2026" in IST. */
export function formatWeek(weekStart: Date): string {
  const offsetMs = config.tzOffsetMinutes * 60_000;
  const a = new Date(weekStart.getTime() + offsetMs);
  const b = new Date(weekStart.getTime() + offsetMs + WEEK_MS - 1);
  const fmt = (d: Date, year: boolean) =>
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}), timeZone: "UTC" });
  return `${fmt(a, false)} – ${fmt(b, true)}`;
}

/** Calendar day in IST as YYYY-MM-DD, used for daily stats buckets. */
export function istDay(date = new Date()): string {
  const local = new Date(date.getTime() + config.tzOffsetMinutes * 60_000);
  return local.toISOString().slice(0, 10);
}
