-- REIGN upgrade 4: Sign in with Google.
-- Run once in Supabase → SQL Editor (after upgrade-3-alerts.sql).
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN "google_sub" text;
ALTER TABLE "users" ADD CONSTRAINT "users_google_sub_unique" UNIQUE("google_sub");