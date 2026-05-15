CREATE TABLE "dearme_cost_caps" (
	"company_id" uuid NOT NULL,
	"period_kind" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"window_end" timestamp with time zone NOT NULL,
	"usd_spent_micros" bigint DEFAULT 0 NOT NULL,
	"usd_cap_micros" bigint DEFAULT 0 NOT NULL,
	"soft_cap_micros" bigint DEFAULT 0 NOT NULL,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dearme_cost_caps" ADD CONSTRAINT "dearme_cost_caps_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "dearme_cost_caps_company_kind_window_idx" ON "dearme_cost_caps" USING btree ("company_id","period_kind","window_start","window_end");
--> statement-breakpoint
CREATE INDEX "dearme_cost_caps_company_kind_updated_idx" ON "dearme_cost_caps" USING btree ("company_id","period_kind","last_updated_at");
