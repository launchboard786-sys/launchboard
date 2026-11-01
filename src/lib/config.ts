/**
 * Central configuration. Every business rule number lives here so it can be
 * tuned through environment variables without code changes.
 */
function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) throw new Error(`Env ${name} must be a non-negative integer`);
  return n;
}

export const config = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || "Launchboard",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  currency: "INR" as const,

  /** Listings accepted for free before a listing fee applies. */
  freeListingLimit: int("FREE_LISTING_LIMIT", 2000),
  /** Listing fee after the free limit (paise). Default ₹999. */
  listingFeePaise: int("LISTING_FEE_PAISE", 99_900),

  /** Sponsored positions per category per week. */
  maxPositions: 100,
  /** Zone boundaries (inclusive upper bounds). */
  zones: [
    { key: "TOP_10", label: "Top 10", from: 1, to: 10 },
    { key: "TOP_50", label: "Top 50", from: 11, to: 50 },
    { key: "TOP_100", label: "Top 100", from: 51, to: 100 },
  ] as const,
  /** Bids must be multiples of this (paise). Default ₹100. */
  bidStepPaise: int("BID_STEP_PAISE", 10_000),
  /** Safety cap per bid (paise). Default ₹50,00,000. */
  maxBidPaise: int("MAX_BID_PAISE", 500_000_000),
  /** Wallet top-up limits (paise). */
  minTopupPaise: int("MIN_TOPUP_PAISE", 50_000),
  maxTopupPaise: int("MAX_TOPUP_PAISE", 500_000_000),
  /** Auction week timezone: IST, fixed offset, India has no DST. */
  tzOffsetMinutes: 330,
  /** On category pages, one sponsored row after this many organic rows. */
  sponsoredEvery: 4,
  pageSize: 20,

  paymentsMock: process.env.PAYMENTS_MOCK === "true",
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || "",
    keySecret: process.env.RAZORPAY_KEY_SECRET || "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  },
  cronSecret: process.env.CRON_SECRET || "",
};

export type ZoneKey = (typeof config.zones)[number]["key"];

export function enabledProviders(): Array<"RAZORPAY" | "STRIPE" | "MOCK"> {
  const list: Array<"RAZORPAY" | "STRIPE" | "MOCK"> = [];
  if (config.razorpay.keyId && config.razorpay.keySecret) list.push("RAZORPAY");
  if (config.stripe.secretKey) list.push("STRIPE");
  if (config.paymentsMock) list.push("MOCK");
  return list;
}
