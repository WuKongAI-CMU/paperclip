CREATE TABLE "dearme_referral_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"owner_company_id" uuid NOT NULL,
	"stripe_coupon_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"disabled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "dearme_referral_attributions" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"referred_email" text NOT NULL,
	"referred_company_id" uuid NOT NULL,
	"attributed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"first_payment_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "dearme_referral_codes" ADD CONSTRAINT "dearme_referral_codes_owner_company_id_companies_id_fk" FOREIGN KEY ("owner_company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "dearme_referral_attributions" ADD CONSTRAINT "dearme_referral_attributions_code_dearme_referral_codes_code_fk" FOREIGN KEY ("code") REFERENCES "public"."dearme_referral_codes"("code") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "dearme_referral_attributions" ADD CONSTRAINT "dearme_referral_attributions_referred_company_id_companies_id_fk" FOREIGN KEY ("referred_company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "dearme_referral_codes_owner_company_idx" ON "dearme_referral_codes" USING btree ("owner_company_id");
--> statement-breakpoint
CREATE INDEX "dearme_referral_codes_stripe_coupon_idx" ON "dearme_referral_codes" USING btree ("stripe_coupon_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "dearme_referral_attributions_code_email_idx" ON "dearme_referral_attributions" USING btree ("code","referred_email");
--> statement-breakpoint
CREATE INDEX "dearme_referral_attributions_code_first_payment_idx" ON "dearme_referral_attributions" USING btree ("code","first_payment_at");
--> statement-breakpoint
CREATE INDEX "dearme_referral_attributions_referred_company_idx" ON "dearme_referral_attributions" USING btree ("referred_company_id");
