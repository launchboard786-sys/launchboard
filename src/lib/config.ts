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
  appName: process.env.NEXT_PUBLIC_APP_NAME || "REIGN",
  /**
   * Public address used in emails and share links. Falls back to the production
   * address Vercel provides, so links never point at localhost on a live site.
   */
  appUrl: (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "http://localhost:3000"
  ).replace(/\/+$/, ""),
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

  email: {
    /** Resend (resend.com) API key. Without it (and without a dev outbox) no email is sent. */
    resendKey: process.env.RESEND_API_KEY || "",
    from: process.env.EMAIL_FROM || "REIGN <onboarding@resend.dev>",
    /** Development/tests only: write emails as JSON files to this folder instead of sending. */
    devOutbox: process.env.EMAIL_DEV_OUTBOX || "",
  },
};

/** Image uploads: Supabase Storage in production, a local folder in development and tests. */
export const storage = {
  supabaseUrl: (process.env.SUPABASE_URL || "").replace(/\/+$/, ""),
  /** Supabase → Project Settings → API Keys → secret key (or the legacy service_role key). Server only. */
  supabaseKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  bucket: process.env.SUPABASE_BUCKET || "uploads",
  /** Development/tests only: keep uploads in this folder, served from /files/... */
  localDir: process.env.UPLOADS_LOCAL_DIR || "",
};

export function uploadsEnabled() {
  return Boolean((storage.supabaseUrl && storage.supabaseKey) || storage.localDir);
}

/** Email can actually reach people (or the dev outbox). */
export function emailEnabled() {
  return Boolean(config.email.resendKey || config.email.devOutbox);
}

/**
 * Verified email is required to vote and to list a business, but only once email
 * sending is set up; otherwise nobody could ever verify. EMAIL_VERIFICATION=off disables it.
 */
export function verificationRequired() {
  return emailEnabled() && process.env.EMAIL_VERIFICATION !== "off";
}

export type ZoneKey = (typeof config.zones)[number]["key"];

export function enabledProviders(): Array<"RAZORPAY" | "STRIPE" | "MOCK"> {
  const list: Array<"RAZORPAY" | "STRIPE" | "MOCK"> = [];
  if (config.razorpay.keyId && config.razorpay.keySecret) list.push("RAZORPAY");
  if (config.stripe.secretKey) list.push("STRIPE");
  if (config.paymentsMock) list.push("MOCK");
  return list;
}
