CREATE TABLE "dearme_public_feed_optin" (
	"company_id" uuid PRIMARY KEY NOT NULL,
	"enabled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"disabled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "dearme_public_feed_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"summary" text NOT NULL,
	"link_url" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dearme_public_feed_optin" ADD CONSTRAINT "dearme_public_feed_optin_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "dearme_public_feed_items" ADD CONSTRAINT "dearme_public_feed_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "dearme_public_feed_items_company_kind_link_idx" ON "dearme_public_feed_items" USING btree ("company_id","kind","link_url");
--> statement-breakpoint
CREATE INDEX "dearme_public_feed_items_published_at_idx" ON "dearme_public_feed_items" USING btree ("published_at");
--> statement-breakpoint
CREATE INDEX "dearme_public_feed_items_company_published_at_idx" ON "dearme_public_feed_items" USING btree ("company_id","published_at");
