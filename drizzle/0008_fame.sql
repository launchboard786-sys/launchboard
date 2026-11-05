CREATE TABLE "fame_weeks" (
	"week_start" timestamp with time zone NOT NULL,
	"position" integer NOT NULL,
	"business_id" text NOT NULL,
	"week_votes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fame_weeks_week_start_position_pk" PRIMARY KEY("week_start","position"),
	CONSTRAINT "fame_weeks_position" CHECK ("fame_weeks"."position" between 1 and 3)
);
--> statement-breakpoint
ALTER TABLE "fame_weeks" ADD CONSTRAINT "fame_weeks_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fame_weeks_business_idx" ON "fame_weeks" USING btree ("business_id");--> statement-breakpoint
ALTER TABLE "fame_weeks" ENABLE ROW LEVEL SECURITY;