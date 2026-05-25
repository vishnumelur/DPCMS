CREATE TABLE "principal_minor_flag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"principal_user_id" uuid NOT NULL,
	"declared_date_of_birth" date NOT NULL,
	"is_minor" boolean NOT NULL,
	"guardian_name" text,
	"guardian_email" text,
	"guardian_relation" text,
	"verification_method" text DEFAULT 'declared' NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consent_artefact" ADD COLUMN "parental_consent_evidence" text;--> statement-breakpoint
ALTER TABLE "principal_minor_flag" ADD CONSTRAINT "principal_minor_flag_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principal_minor_flag" ADD CONSTRAINT "principal_minor_flag_principal_user_id_user_id_fk" FOREIGN KEY ("principal_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "principal_minor_flag_principal_ux" ON "principal_minor_flag" USING btree ("principal_user_id");