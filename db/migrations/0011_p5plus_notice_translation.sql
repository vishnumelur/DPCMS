CREATE TABLE "notice_translation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"notice_id" uuid NOT NULL,
	"language_code" text NOT NULL,
	"body_markdown" text NOT NULL,
	"source" text DEFAULT 'ai' NOT NULL,
	"reviewed" boolean DEFAULT false NOT NULL,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notice_translation" ADD CONSTRAINT "notice_translation_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice_translation" ADD CONSTRAINT "notice_translation_notice_id_notice_id_fk" FOREIGN KEY ("notice_id") REFERENCES "public"."notice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notice_translation_notice_lang_ux" ON "notice_translation" USING btree ("notice_id","language_code");