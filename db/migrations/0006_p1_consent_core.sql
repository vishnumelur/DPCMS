CREATE TABLE "consent_artefact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"principal_user_id" uuid NOT NULL,
	"purpose_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"prev_artefact_id" uuid,
	"jws" text NOT NULL,
	"body_hash" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_preference" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"principal_user_id" uuid NOT NULL,
	"purpose_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"current_artefact_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"purpose_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"body_markdown" text NOT NULL,
	"language_code" text DEFAULT 'en' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cookie_category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_essential" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cookie_consent_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"principal_user_id" uuid,
	"session_id" text NOT NULL,
	"categories_accepted" text[] DEFAULT '{}' NOT NULL,
	"user_agent" text,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"body_markdown" text NOT NULL,
	"language_code" text DEFAULT 'en' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notice_ack" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"principal_user_id" uuid NOT NULL,
	"notice_id" uuid NOT NULL,
	"acknowledged_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purpose" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"lawful_basis" text DEFAULT 'consent' NOT NULL,
	"data_categories" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consent_artefact" ADD CONSTRAINT "consent_artefact_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_artefact" ADD CONSTRAINT "consent_artefact_principal_user_id_user_id_fk" FOREIGN KEY ("principal_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_artefact" ADD CONSTRAINT "consent_artefact_purpose_id_purpose_id_fk" FOREIGN KEY ("purpose_id") REFERENCES "public"."purpose"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_artefact" ADD CONSTRAINT "consent_artefact_template_id_consent_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."consent_template"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_preference" ADD CONSTRAINT "consent_preference_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_preference" ADD CONSTRAINT "consent_preference_principal_user_id_user_id_fk" FOREIGN KEY ("principal_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_preference" ADD CONSTRAINT "consent_preference_purpose_id_purpose_id_fk" FOREIGN KEY ("purpose_id") REFERENCES "public"."purpose"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_preference" ADD CONSTRAINT "consent_preference_current_artefact_id_consent_artefact_id_fk" FOREIGN KEY ("current_artefact_id") REFERENCES "public"."consent_artefact"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_template" ADD CONSTRAINT "consent_template_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_template" ADD CONSTRAINT "consent_template_purpose_id_purpose_id_fk" FOREIGN KEY ("purpose_id") REFERENCES "public"."purpose"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cookie_category" ADD CONSTRAINT "cookie_category_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cookie_consent_record" ADD CONSTRAINT "cookie_consent_record_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cookie_consent_record" ADD CONSTRAINT "cookie_consent_record_principal_user_id_user_id_fk" FOREIGN KEY ("principal_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice" ADD CONSTRAINT "notice_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice_ack" ADD CONSTRAINT "notice_ack_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice_ack" ADD CONSTRAINT "notice_ack_principal_user_id_user_id_fk" FOREIGN KEY ("principal_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice_ack" ADD CONSTRAINT "notice_ack_notice_id_notice_id_fk" FOREIGN KEY ("notice_id") REFERENCES "public"."notice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purpose" ADD CONSTRAINT "purpose_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consent_artefact_org_principal_purpose_idx" ON "consent_artefact" USING btree ("org_id","principal_user_id","purpose_id");--> statement-breakpoint
CREATE UNIQUE INDEX "consent_preference_principal_purpose_ux" ON "consent_preference" USING btree ("principal_user_id","purpose_id");--> statement-breakpoint
CREATE UNIQUE INDEX "consent_template_purpose_version_lang_ux" ON "consent_template" USING btree ("purpose_id","version","language_code");--> statement-breakpoint
CREATE UNIQUE INDEX "cookie_category_org_key_ux" ON "cookie_category" USING btree ("org_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "notice_org_slug_version_lang_ux" ON "notice" USING btree ("org_id","slug","version","language_code");--> statement-breakpoint
CREATE INDEX "notice_ack_principal_notice_idx" ON "notice_ack" USING btree ("principal_user_id","notice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purpose_org_code_ux" ON "purpose" USING btree ("org_id","code");