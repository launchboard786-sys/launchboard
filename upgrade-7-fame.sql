-- REIGN upgrade 7: Hall of Fame (Startup of the Week).
-- Run in Supabase → SQL Editor. Safe to run more than once.
CREATE TABLE IF NOT EXISTS "fame_weeks" (
	"week_start" timestamp with time zone NOT NULL,
	"position" integer NOT NULL,
	"business_id" text NOT NULL REFERENCES "public"."businesses"("id") ON DELETE cascade,
	"week_votes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fame_weeks_week_start_position_pk" PRIMARY KEY("week_start","position"),
	CONSTRAINT "fame_weeks_position" CHECK ("fame_weeks"."position" between 1 and 3)
);
CREATE INDEX IF NOT EXISTS "fame_weeks_business_idx" ON "fame_weeks" USING btree ("business_id");
ALTER TABLE "fame_weeks" ENABLE ROW LEVEL SECURITY;
