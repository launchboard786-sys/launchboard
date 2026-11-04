-- REIGN upgrade 5: US-dollar pricing for visitors outside India.
-- Run in Supabase → SQL Editor. Safe to run more than once.
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "charge_minor" integer;
