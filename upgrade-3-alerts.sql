-- REIGN upgrade 3: email alerts (outbid, auction results, approvals, vote milestones).
-- Run once in Supabase → SQL Editor (after upgrade-2-uploads.sql).
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
