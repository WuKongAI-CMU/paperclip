CREATE TABLE "channel_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"external_account_id" text,
	"external_display_name" text,
	"encrypted_credential" text NOT NULL,
	"scopes" jsonb,
	"expires_at" timestamp with time zone,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_used_at" timestamp with time zone,
	"last_refreshed_at" timestamp with time zone,
	"last_error" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dearme_voice_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"user_id" text,
	"scope_key" text DEFAULT 'global' NOT NULL,
	"fingerprint_id" text NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"accepted_samples" integer DEFAULT 0 NOT NULL,
	"profile_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"kind" text DEFAULT 'other' NOT NULL,
	"title" text NOT NULL,
	"contact_handle" text,
	"contact_email" text,
	"contact_url" text,
	"fit_reason" text,
	"notes" jsonb,
	"signals" jsonb,
	"issue_id" uuid,
	"assignee_agent_id" uuid,
	"sends_today" integer DEFAULT 0 NOT NULL,
	"sends_today_day" text,
	"state_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channel_connections" ADD CONSTRAINT "channel_connections_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_connections" ADD CONSTRAINT "channel_connections_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dearme_voice_profiles" ADD CONSTRAINT "dearme_voice_profiles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dearme_voice_profiles" ADD CONSTRAINT "dearme_voice_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_assignee_agent_id_agents_id_fk" FOREIGN KEY ("assignee_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "channel_connections_company_user_channel_external_idx" ON "channel_connections" USING btree ("company_id","user_id","channel","external_account_id");--> statement-breakpoint
CREATE INDEX "channel_connections_company_channel_status_idx" ON "channel_connections" USING btree ("company_id","channel","status");--> statement-breakpoint
CREATE INDEX "channel_connections_expires_at_idx" ON "channel_connections" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "dearme_voice_profiles_scope_fingerprint_idx" ON "dearme_voice_profiles" USING btree ("scope_key","fingerprint_id");--> statement-breakpoint
CREATE INDEX "dearme_voice_profiles_fingerprint_id_idx" ON "dearme_voice_profiles" USING btree ("fingerprint_id");--> statement-breakpoint
CREATE INDEX "dearme_voice_profiles_company_user_idx" ON "dearme_voice_profiles" USING btree ("company_id","user_id");--> statement-breakpoint
CREATE INDEX "dearme_voice_profiles_updated_at_idx" ON "dearme_voice_profiles" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "opportunities_company_state_idx" ON "opportunities" USING btree ("company_id","state");--> statement-breakpoint
CREATE INDEX "opportunities_company_kind_idx" ON "opportunities" USING btree ("company_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunities_company_contact_email_idx" ON "opportunities" USING btree ("company_id","contact_email");