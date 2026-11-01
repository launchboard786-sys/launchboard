-- REIGN upgrade 1: forgot password + email verification.
-- Run once in Supabase → SQL Editor on a database created with the original setup.sql.
-- Existing accounts are marked as verified so nobody is locked out.
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
UPDATE "users" SET "email_verified_at" = now() WHERE "email_verified_at" IS NULL;
