-- REIGN upgrade 6: save / follow startups.
-- Run in Supabase → SQL Editor. Safe to run more than once.
CREATE TABLE IF NOT EXISTS "follows" (
	"user_id" text NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
	"business_id" text NOT NULL REFERENCES "public"."businesses"("id") ON DELETE cascade,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_user_id_business_id_pk" PRIMARY KEY("user_id","business_id")
);
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "follower_count" integer DEFAULT 0 NOT NULL;
CREATE INDEX IF NOT EXISTS "follows_business_idx" ON "follows" USING btree ("business_id");
CREATE INDEX IF NOT EXISTS "follows_user_created_idx" ON "follows" USING btree ("user_id","created_at");
ALTER TABLE "follows" ENABLE ROW LEVEL SECURITY;
