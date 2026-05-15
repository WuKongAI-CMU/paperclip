CREATE TABLE "dearme_linkedin_throttle" (
	"company_id" uuid NOT NULL,
	"account_connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dms_sent_today" integer DEFAULT 0 NOT NULL,
	"dms_sent_this_week" integer DEFAULT 0 NOT NULL,
	"last_reset_day" text NOT NULL,
	"last_reset_week" text NOT NULL,
	"lifetime_dms_sent" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dearme_linkedin_throttle" ADD CONSTRAINT "dearme_linkedin_throttle_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "dearme_linkedin_throttle_company_idx" ON "dearme_linkedin_throttle" USING btree ("company_id");
--> statement-breakpoint
CREATE INDEX "dearme_linkedin_throttle_last_reset_day_idx" ON "dearme_linkedin_throttle" USING btree ("last_reset_day");
