CREATE TABLE "dearme_pauses" (
	"company_id" uuid NOT NULL,
	"paused_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paused_by" text NOT NULL,
	"reason" text NOT NULL,
	"resumed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "dearme_pauses" ADD CONSTRAINT "dearme_pauses_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "dearme_pauses_active_company_idx" ON "dearme_pauses" USING btree ("company_id") WHERE "resumed_at" IS NULL;
--> statement-breakpoint
CREATE INDEX "dearme_pauses_company_paused_at_idx" ON "dearme_pauses" USING btree ("company_id","paused_at");
