CREATE TABLE "law_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"jurisdiction" text NOT NULL,
	"effective_from" date,
	"summary" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "law_document_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "law_section" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"section_number" text NOT NULL,
	"title" text NOT NULL,
	"body_markdown" text NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nominee" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"principal_user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"relation" text NOT NULL,
	"permissions" text[] DEFAULT '{}' NOT NULL,
	"verification_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "law_section" ADD CONSTRAINT "law_section_document_id_law_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."law_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nominee" ADD CONSTRAINT "nominee_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nominee" ADD CONSTRAINT "nominee_principal_user_id_user_id_fk" FOREIGN KEY ("principal_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "law_document_jurisdiction_idx" ON "law_document" USING btree ("jurisdiction");--> statement-breakpoint
CREATE UNIQUE INDEX "law_section_doc_section_ux" ON "law_section" USING btree ("document_id","section_number");--> statement-breakpoint
CREATE INDEX "nominee_principal_idx" ON "nominee" USING btree ("principal_user_id");