CREATE TABLE "dsr_attachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"url_or_inline_text" text NOT NULL,
	"uploaded_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dsr_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"event_kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"actor_label" text NOT NULL,
	"actor_user_id" uuid,
	"row_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dsr_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"principal_user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"subject" text NOT NULL,
	"details" text NOT NULL,
	"branch_id" uuid,
	"assigned_to_user_id" uuid,
	"sla_due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sla_clock" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"threshold_amber" timestamp with time zone NOT NULL,
	"threshold_red" timestamp with time zone NOT NULL,
	"state" text DEFAULT 'green' NOT NULL,
	"last_evaluated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "breach_action" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"incident_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"notes" text NOT NULL,
	"actor_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "breach_cohort" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"incident_id" uuid NOT NULL,
	"principal_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "breach_incident" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"severity" text NOT NULL,
	"status" text DEFAULT 'detected' NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reported_at" timestamp with time zone,
	"reporting_deadline_at" timestamp with time zone,
	"declared_by_user_id" uuid NOT NULL,
	"affected_data_categories" text[] DEFAULT '{}' NOT NULL,
	"estimated_affected_count" integer DEFAULT 0 NOT NULL,
	"root_cause" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "breach_notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"incident_id" uuid NOT NULL,
	"audience" text NOT NULL,
	"draft_markdown" text NOT NULL,
	"sent_at" timestamp with time zone,
	"recipient_cohort_description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dsr_attachment" ADD CONSTRAINT "dsr_attachment_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dsr_attachment" ADD CONSTRAINT "dsr_attachment_request_id_dsr_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."dsr_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dsr_attachment" ADD CONSTRAINT "dsr_attachment_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dsr_event" ADD CONSTRAINT "dsr_event_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dsr_event" ADD CONSTRAINT "dsr_event_request_id_dsr_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."dsr_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dsr_event" ADD CONSTRAINT "dsr_event_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dsr_request" ADD CONSTRAINT "dsr_request_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dsr_request" ADD CONSTRAINT "dsr_request_principal_user_id_user_id_fk" FOREIGN KEY ("principal_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dsr_request" ADD CONSTRAINT "dsr_request_branch_id_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branch"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dsr_request" ADD CONSTRAINT "dsr_request_assigned_to_user_id_user_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_clock" ADD CONSTRAINT "sla_clock_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_clock" ADD CONSTRAINT "sla_clock_request_id_dsr_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."dsr_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "breach_action" ADD CONSTRAINT "breach_action_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "breach_action" ADD CONSTRAINT "breach_action_incident_id_breach_incident_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."breach_incident"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "breach_action" ADD CONSTRAINT "breach_action_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "breach_cohort" ADD CONSTRAINT "breach_cohort_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "breach_cohort" ADD CONSTRAINT "breach_cohort_incident_id_breach_incident_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."breach_incident"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "breach_cohort" ADD CONSTRAINT "breach_cohort_principal_user_id_user_id_fk" FOREIGN KEY ("principal_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "breach_incident" ADD CONSTRAINT "breach_incident_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "breach_incident" ADD CONSTRAINT "breach_incident_declared_by_user_id_user_id_fk" FOREIGN KEY ("declared_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "breach_notification" ADD CONSTRAINT "breach_notification_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "breach_notification" ADD CONSTRAINT "breach_notification_incident_id_breach_incident_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."breach_incident"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dsr_event_request_idx" ON "dsr_event" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE INDEX "dsr_request_org_principal_idx" ON "dsr_request" USING btree ("org_id","principal_user_id");--> statement-breakpoint
CREATE INDEX "dsr_request_org_status_idx" ON "dsr_request" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "breach_action_incident_idx" ON "breach_action" USING btree ("incident_id","created_at");--> statement-breakpoint
CREATE INDEX "breach_incident_org_status_idx" ON "breach_incident" USING btree ("org_id","status");