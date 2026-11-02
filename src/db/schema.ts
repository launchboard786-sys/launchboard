import {
  pgTable,
  pgEnum,
  text,
  integer,
  timestamp,
  date,
  primaryKey,
  uniqueIndex,
  index,
  check,
  boolean,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const roleEnum = pgEnum("role", ["USER", "ADMIN"]);
export const listingStatusEnum = pgEnum("listing_status", [
  "PENDING_PAYMENT",
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
]);
export const stageEnum = pgEnum("stage", ["IDEA", "MVP", "EARLY_REVENUE", "GROWTH"]);
export const bidStatusEnum = pgEnum("bid_status", ["ACTIVE", "WON", "LOST"]);
export const ledgerTypeEnum = pgEnum("ledger_type", [
  "TOPUP",
  "BID_HOLD",
  "BID_CHARGE",
  "BID_RELEASE",
  "REFUND",
]);
export const paymentProviderEnum = pgEnum("payment_provider", ["RAZORPAY", "STRIPE", "MOCK"]);
export const paymentStatusEnum = pgEnum("payment_status", ["CREATED", "PAID", "FAILED"]);
export const paymentPurposeEnum = pgEnum("payment_purpose", ["WALLET_TOPUP", "LISTING_FEE"]);

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("USER"),
  /** Set when the user clicks the link in their verification email. */
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  /** Sessions issued before this moment are rejected (logs out other devices after a reset). */
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
  /** Optional alerts (outbid, vote milestones). Account and payment emails are always sent. */
  emailAlerts: boolean("email_alerts").notNull().default(true),
  createdAt: createdAt(),
});

export const tokenPurposeEnum = pgEnum("token_purpose", ["VERIFY_EMAIL", "RESET_PASSWORD"]);

/** One-time links sent by email. Only a SHA-256 hash of the token is stored. */
export const authTokens = pgTable(
  "auth_tokens",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: tokenPurposeEnum("purpose").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("auth_tokens_user_idx").on(t.userId, t.purpose)],
);

export const categories = pgTable("categories", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  /** Minimum bid for any sponsored position, in paise. */
  reservePaise: integer("reserve_paise").notNull().default(50000),
});

export const businesses = pgTable(
  "businesses",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    name: text("name").notNull(),
    tagline: text("tagline").notNull(),
    description: text("description").notNull(),
    websiteUrl: text("website_url").notNull(),
    logoUrl: text("logo_url"),
    /** Up to 6 product screenshots, uploaded through /api/uploads. */
    screenshotUrls: text("screenshot_urls").array().notNull().default(sql`'{}'::text[]`),
    location: text("location").notNull(),
    foundedYear: integer("founded_year").notNull(),
    stage: stageEnum("stage").notNull(),
    status: listingStatusEnum("status").notNull(),
    rejectionReason: text("rejection_reason"),
    voteCount: integer("vote_count").notNull().default(0),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("businesses_cat_status_votes_idx").on(t.categoryId, t.status, t.voteCount),
    index("businesses_status_approved_idx").on(t.status, t.approvedAt),
    index("businesses_owner_idx").on(t.ownerId),
  ],
);

export const votes = pgTable(
  "votes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.businessId] }), index("votes_business_idx").on(t.businessId)],
);

export const wallets = pgTable("wallets", {
  id: id(),
  businessId: text("business_id")
    .notNull()
    .unique()
    .references(() => businesses.id, { onDelete: "cascade" }),
  availablePaise: integer("available_paise").notNull().default(0),
  heldPaise: integer("held_paise").notNull().default(0),
}, (t) => [
  check("wallets_available_nonneg", sql`${t.availablePaise} >= 0`),
  check("wallets_held_nonneg", sql`${t.heldPaise} >= 0`),
]);

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: id(),
    walletId: text("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "cascade" }),
    type: ledgerTypeEnum("type").notNull(),
    /** Signed change to the available balance. */
    availableDelta: integer("available_delta").notNull(),
    /** Signed change to the held balance. */
    heldDelta: integer("held_delta").notNull(),
    refId: text("ref_id"),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("ledger_wallet_created_idx").on(t.walletId, t.createdAt)],
);

export const bids = pgTable(
  "bids",
  {
    id: id(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    /** UTC instant of the auction week start (Monday 00:00 IST). */
    weekStart: timestamp("week_start", { withTimezone: true }).notNull(),
    amountPaise: integer("amount_paise").notNull(),
    /** When the current amount was set; earlier wins ties. */
    amountSetAt: timestamp("amount_set_at", { withTimezone: true }).notNull().defaultNow(),
    status: bidStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("bids_business_week_uq").on(t.businessId, t.weekStart),
    index("bids_cat_week_status_idx").on(t.categoryId, t.weekStart, t.status),
    check("bids_amount_pos", sql`${t.amountPaise} > 0`),
  ],
);

export const settlements = pgTable("settlements", {
  weekStart: timestamp("week_start", { withTimezone: true }).primaryKey(),
  settledAt: timestamp("settled_at", { withTimezone: true }).notNull().defaultNow(),
  winners: integer("winners").notNull(),
  losers: integer("losers").notNull(),
  revenuePaise: integer("revenue_paise").notNull(),
});

export const placements = pgTable(
  "placements",
  {
    id: id(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    weekStart: timestamp("week_start", { withTimezone: true }).notNull(),
    position: integer("position").notNull(),
    amountPaise: integer("amount_paise").notNull(),
  },
  (t) => [
    uniqueIndex("placements_cat_week_pos_uq").on(t.categoryId, t.weekStart, t.position),
    uniqueIndex("placements_business_week_uq").on(t.businessId, t.weekStart),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: id(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    provider: paymentProviderEnum("provider").notNull(),
    purpose: paymentPurposeEnum("purpose").notNull(),
    amountPaise: integer("amount_paise").notNull(),
    currency: text("currency").notNull().default("INR"),
    status: paymentStatusEnum("status").notNull().default("CREATED"),
    providerOrderId: text("provider_order_id").unique(),
    providerPaymentId: text("provider_payment_id"),
    createdAt: createdAt(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [
    index("payments_business_created_idx").on(t.businessId, t.createdAt),
    check("payments_amount_pos", sql`${t.amountPaise} > 0`),
  ],
);

export const dailyStats = pgTable(
  "daily_stats",
  {
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    pageViews: integer("page_views").notNull().default(0),
    websiteClicks: integer("website_clicks").notNull().default(0),
    sponsoredImpressions: integer("sponsored_impressions").notNull().default(0),
    sponsoredClicks: integer("sponsored_clicks").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.businessId, t.day] })],
);

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  owner: one(users, { fields: [businesses.ownerId], references: [users.id] }),
  category: one(categories, { fields: [businesses.categoryId], references: [categories.id] }),
  wallet: one(wallets, { fields: [businesses.id], references: [wallets.businessId] }),
  bids: many(bids),
  placements: many(placements),
}));
export const categoriesRelations = relations(categories, ({ many }) => ({
  businesses: many(businesses),
}));

/** Log of alert emails: prevents duplicates (dedupeKey) and enforces throttles. */
export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    businessId: text("business_id").references(() => businesses.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    dedupeKey: text("dedupe_key").unique(),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_biz_kind_idx").on(t.businessId, t.kind, t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Business = typeof businesses.$inferSelect;
export type Bid = typeof bids.$inferSelect;
export type Placement = typeof placements.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
