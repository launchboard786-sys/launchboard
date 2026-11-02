-- Launchboard: one-time database setup
-- Paste this whole file into your database's SQL editor (Supabase or Neon) and run it once.

CREATE TYPE "public"."bid_status" AS ENUM('ACTIVE', 'WON', 'LOST');
CREATE TYPE "public"."ledger_type" AS ENUM('TOPUP', 'BID_HOLD', 'BID_CHARGE', 'BID_RELEASE', 'REFUND');
CREATE TYPE "public"."listing_status" AS ENUM('PENDING_PAYMENT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE "public"."payment_provider" AS ENUM('RAZORPAY', 'STRIPE', 'MOCK');
CREATE TYPE "public"."payment_purpose" AS ENUM('WALLET_TOPUP', 'LISTING_FEE');
CREATE TYPE "public"."payment_status" AS ENUM('CREATED', 'PAID', 'FAILED');
CREATE TYPE "public"."role" AS ENUM('USER', 'ADMIN');
CREATE TYPE "public"."stage" AS ENUM('IDEA', 'MVP', 'EARLY_REVENUE', 'GROWTH');
CREATE TABLE "bids" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"category_id" text NOT NULL,
	"week_start" timestamp with time zone NOT NULL,
	"amount_paise" integer NOT NULL,
	"amount_set_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "bid_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bids_amount_pos" CHECK ("bids"."amount_paise" > 0)
);

CREATE TABLE "businesses" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"owner_id" text NOT NULL,
	"category_id" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text NOT NULL,
	"description" text NOT NULL,
	"website_url" text NOT NULL,
	"logo_url" text,
	"location" text NOT NULL,
	"founded_year" integer NOT NULL,
	"stage" "stage" NOT NULL,
	"status" "listing_status" NOT NULL,
	"rejection_reason" text,
	"vote_count" integer DEFAULT 0 NOT NULL,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "businesses_slug_unique" UNIQUE("slug")
);

CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"reserve_paise" integer DEFAULT 50000 NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);

CREATE TABLE "daily_stats" (
	"business_id" text NOT NULL,
	"day" date NOT NULL,
	"page_views" integer DEFAULT 0 NOT NULL,
	"website_clicks" integer DEFAULT 0 NOT NULL,
	"sponsored_impressions" integer DEFAULT 0 NOT NULL,
	"sponsored_clicks" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "daily_stats_business_id_day_pk" PRIMARY KEY("business_id","day")
);

CREATE TABLE "ledger_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"wallet_id" text NOT NULL,
	"type" "ledger_type" NOT NULL,
	"available_delta" integer NOT NULL,
	"held_delta" integer NOT NULL,
	"ref_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"purpose" "payment_purpose" NOT NULL,
	"amount_paise" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" "payment_status" DEFAULT 'CREATED' NOT NULL,
	"provider_order_id" text,
	"provider_payment_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "payments_provider_order_id_unique" UNIQUE("provider_order_id"),
	CONSTRAINT "payments_amount_pos" CHECK ("payments"."amount_paise" > 0)
);

CREATE TABLE "placements" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"category_id" text NOT NULL,
	"week_start" timestamp with time zone NOT NULL,
	"position" integer NOT NULL,
	"amount_paise" integer NOT NULL
);

CREATE TABLE "settlements" (
	"week_start" timestamp with time zone PRIMARY KEY NOT NULL,
	"settled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"winners" integer NOT NULL,
	"losers" integer NOT NULL,
	"revenue_paise" integer NOT NULL
);

CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'USER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE "votes" (
	"user_id" text NOT NULL,
	"business_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "votes_user_id_business_id_pk" PRIMARY KEY("user_id","business_id")
);

CREATE TABLE "wallets" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"available_paise" integer DEFAULT 0 NOT NULL,
	"held_paise" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "wallets_business_id_unique" UNIQUE("business_id"),
	CONSTRAINT "wallets_available_nonneg" CHECK ("wallets"."available_paise" >= 0),
	CONSTRAINT "wallets_held_nonneg" CHECK ("wallets"."held_paise" >= 0)
);

ALTER TABLE "bids" ADD CONSTRAINT "bids_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bids" ADD CONSTRAINT "bids_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "daily_stats" ADD CONSTRAINT "daily_stats_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payments" ADD CONSTRAINT "payments_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "placements" ADD CONSTRAINT "placements_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "placements" ADD CONSTRAINT "placements_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "votes" ADD CONSTRAINT "votes_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "bids_business_week_uq" ON "bids" USING btree ("business_id","week_start");
CREATE INDEX "bids_cat_week_status_idx" ON "bids" USING btree ("category_id","week_start","status");
CREATE INDEX "businesses_cat_status_votes_idx" ON "businesses" USING btree ("category_id","status","vote_count");
CREATE INDEX "businesses_status_approved_idx" ON "businesses" USING btree ("status","approved_at");
CREATE INDEX "businesses_owner_idx" ON "businesses" USING btree ("owner_id");
CREATE INDEX "ledger_wallet_created_idx" ON "ledger_entries" USING btree ("wallet_id","created_at");
CREATE INDEX "payments_business_created_idx" ON "payments" USING btree ("business_id","created_at");
CREATE UNIQUE INDEX "placements_cat_week_pos_uq" ON "placements" USING btree ("category_id","week_start","position");
CREATE UNIQUE INDEX "placements_business_week_uq" ON "placements" USING btree ("business_id","week_start");
CREATE INDEX "votes_business_idx" ON "votes" USING btree ("business_id");


-- Lock every table against Supabase's public Data API (anon/authenticated keys).
-- The app connects as the database owner, which is not affected by these rules.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "businesses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "votes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "wallets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ledger_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bids" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "settlements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "placements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "daily_stats" ENABLE ROW LEVEL SECURITY;

-- Starting categories (minimum weekly bid in paise: 150000 = ₹1,500)
INSERT INTO "categories" ("id", "slug", "name", "description", "sort_order", "reserve_paise") VALUES
(gen_random_uuid()::text, 'ai', 'AI & Machine Learning', 'Assistants, agents and models that do real work.', 0, 150000),
(gen_random_uuid()::text, 'saas', 'SaaS & Productivity', 'Software that helps teams get more done.', 1, 100000),
(gen_random_uuid()::text, 'fintech', 'Fintech', 'Payments, lending, wealth and money tools.', 2, 150000),
(gen_random_uuid()::text, 'd2c', 'D2C & Consumer Brands', 'New brands selling straight to you.', 3, 80000),
(gen_random_uuid()::text, 'health', 'HealthTech', 'Care, fitness and wellbeing, built better.', 4, 100000),
(gen_random_uuid()::text, 'edtech', 'EdTech', 'New ways to learn and teach.', 5, 80000),
(gen_random_uuid()::text, 'climate', 'Climate & Energy', 'Clean energy, recycling and sustainability.', 6, 80000),
(gen_random_uuid()::text, 'food', 'Food & Beverage', 'Kitchens, snacks, drinks and food delivery.', 7, 50000),
(gen_random_uuid()::text, 'mobility', 'Mobility & Logistics', 'Moving people and things, faster and cheaper.', 8, 80000),
(gen_random_uuid()::text, 'devtools', 'Developer Tools', 'APIs, infra and tools for builders.', 9, 100000),
(gen_random_uuid()::text, 'agritech', 'Agritech', 'Technology for farms and food supply chains.', 10, 50000),
(gen_random_uuid()::text, 'creator', 'Creator Economy', 'Tools and platforms for creators.', 11, 50000);

-- Email verification + password reset (also shipped as upgrade-1-email.sql for existing databases)
CREATE TYPE "public"."token_purpose" AS ENUM('VERIFY_EMAIL', 'RESET_PASSWORD');
CREATE TABLE "auth_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"purpose" "token_purpose" NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_tokens_token_hash_unique" UNIQUE("token_hash")
);

ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN "password_changed_at" timestamp with time zone;
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "auth_tokens_user_idx" ON "auth_tokens" USING btree ("user_id","purpose");
ALTER TABLE "auth_tokens" ENABLE ROW LEVEL SECURITY;

-- Listing screenshots (also shipped as upgrade-2-uploads.sql, which also creates the Storage bucket)
ALTER TABLE "businesses" ADD COLUMN "screenshot_urls" text[] DEFAULT '{}'::text[] NOT NULL;
-- Email alerts (also shipped as upgrade-3-alerts.sql)
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"business_id" text,
	"kind" text NOT NULL,
	"dedupe_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_dedupe_key_unique" UNIQUE("dedupe_key")
);

ALTER TABLE "users" ADD COLUMN "email_alerts" boolean DEFAULT true NOT NULL;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "notifications_biz_kind_idx" ON "notifications" USING btree ("business_id","kind","created_at");
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
