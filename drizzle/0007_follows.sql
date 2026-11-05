CREATE TABLE "follows" (
	"user_id" text NOT NULL,
	"business_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_user_id_business_id_pk" PRIMARY KEY("user_id","business_id")
);
--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "follower_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "follows_business_idx" ON "follows" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "follows_user_created_idx" ON "follows" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "follows" ENABLE ROW LEVEL SECURITY;