CREATE TABLE "cookie_scan_finding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_run_id" uuid NOT NULL,
	"cookie_name" text NOT NULL,
	"domain" text,
	"path" text,
	"secure" boolean DEFAULT false NOT NULL,
	"http_only" boolean DEFAULT false NOT NULL,
	"same_site" text,
	"suggested_category_key" text NOT NULL,
	"suggested_rationale" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cookie_scan_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"target_url" text NOT NULL,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"found_count" integer DEFAULT 0 NOT NULL,
	"status_code" integer,
	"error_message" text
);
--> statement-breakpoint
ALTER TABLE "cookie_scan_finding" ADD CONSTRAINT "cookie_scan_finding_scan_run_id_cookie_scan_run_id_fk" FOREIGN KEY ("scan_run_id") REFERENCES "public"."cookie_scan_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cookie_scan_run" ADD CONSTRAINT "cookie_scan_run_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cookie_scan_finding_run_idx" ON "cookie_scan_finding" USING btree ("scan_run_id");--> statement-breakpoint
CREATE INDEX "cookie_scan_run_org_scanned_idx" ON "cookie_scan_run" USING btree ("org_id","scanned_at");