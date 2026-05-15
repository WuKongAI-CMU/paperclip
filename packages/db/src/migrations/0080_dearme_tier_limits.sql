CREATE TABLE "dearme_tier_limits" (
	"company_id" uuid NOT NULL,
	"tier" text NOT NULL,
	"daily_content_posts_cap" integer NOT NULL,
	"weekly_outreach_cap" integer NOT NULL,
	"monthly_ad_spend_usd_cap" bigint NOT NULL,
	"voice_sample_cap" integer,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_to" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "dearme_tier_limits" ADD CONSTRAINT "dearme_tier_limits_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "dearme_tier_limits_company_effective_from_idx" ON "dearme_tier_limits" USING btree ("company_id","effective_from");
--> statement-breakpoint
CREATE INDEX "dearme_tier_limits_company_current_idx" ON "dearme_tier_limits" USING btree ("company_id","effective_to","effective_from");
