CREATE TYPE "public"."bid_status" AS ENUM('ACTIVE', 'WON', 'LOST');--> statement-breakpoint
CREATE TYPE "public"."ledger_type" AS ENUM('TOPUP', 'BID_HOLD', 'BID_CHARGE', 'BID_RELEASE', 'REFUND');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('PENDING_PAYMENT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('RAZORPAY', 'STRIPE', 'MOCK');--> statement-breakpoint
CREATE TYPE "public"."payment_purpose" AS ENUM('WALLET_TOPUP', 'LISTING_FEE');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('CREATED', 'PAID', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."stage" AS ENUM('IDEA', 'MVP', 'EARLY_REVENUE', 'GROWTH');--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"reserve_paise" integer DEFAULT 50000 NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "daily_stats" (
	"business_id" text NOT NULL,
	"day" date NOT NULL,
	"page_views" integer DEFAULT 0 NOT NULL,
	"website_clicks" integer DEFAULT 0 NOT NULL,
	"sponsored_impressions" integer DEFAULT 0 NOT NULL,
	"sponsored_clicks" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "daily_stats_business_id_day_pk" PRIMARY KEY("business_id","day")
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "placements" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"category_id" text NOT NULL,
	"week_start" timestamp with time zone NOT NULL,
	"position" integer NOT NULL,
	"amount_paise" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"week_start" timestamp with time zone PRIMARY KEY NOT NULL,
	"settled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"winners" integer NOT NULL,
	"losers" integer NOT NULL,
	"revenue_paise" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'USER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"user_id" text NOT NULL,
	"business_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "votes_user_id_business_id_pk" PRIMARY KEY("user_id","business_id")
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"available_paise" integer DEFAULT 0 NOT NULL,
	"held_paise" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "wallets_business_id_unique" UNIQUE("business_id"),
	CONSTRAINT "wallets_available_nonneg" CHECK ("wallets"."available_paise" >= 0),
	CONSTRAINT "wallets_held_nonneg" CHECK ("wallets"."held_paise" >= 0)
);
--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_stats" ADD CONSTRAINT "daily_stats_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bids_business_week_uq" ON "bids" USING btree ("business_id","week_start");--> statement-breakpoint
CREATE INDEX "bids_cat_week_status_idx" ON "bids" USING btree ("category_id","week_start","status");--> statement-breakpoint
CREATE INDEX "businesses_cat_status_votes_idx" ON "businesses" USING btree ("category_id","status","vote_count");--> statement-breakpoint
CREATE INDEX "businesses_status_approved_idx" ON "businesses" USING btree ("status","approved_at");--> statement-breakpoint
CREATE INDEX "businesses_owner_idx" ON "businesses" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ledger_wallet_created_idx" ON "ledger_entries" USING btree ("wallet_id","created_at");--> statement-breakpoint
CREATE INDEX "payments_business_created_idx" ON "payments" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "placements_cat_week_pos_uq" ON "placements" USING btree ("category_id","week_start","position");--> statement-breakpoint
CREATE UNIQUE INDEX "placements_business_week_uq" ON "placements" USING btree ("business_id","week_start");--> statement-breakpoint
CREATE INDEX "votes_business_idx" ON "votes" USING btree ("business_id");