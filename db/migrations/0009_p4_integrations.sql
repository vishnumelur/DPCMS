CREATE TABLE "connector" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"mode" text DEFAULT 'mock' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"health_state" text DEFAULT 'green' NOT NULL,
	"last_health_check_at" timestamp with time zone,
	"config_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connector_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"connector_id" uuid NOT NULL,
	"direction" text NOT NULL,
	"event_kind" text NOT NULL,
	"payload_redacted" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status_code" integer,
	"latency_ms" integer,
	"error_message" text,
	"correlation_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_enforcement_check" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"connector_id" uuid NOT NULL,
	"principal_user_id" uuid,
	"purpose_code" text NOT NULL,
	"decision" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "connector" ADD CONSTRAINT "connector_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connector_event" ADD CONSTRAINT "connector_event_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connector_event" ADD CONSTRAINT "connector_event_connector_id_connector_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."connector"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_enforcement_check" ADD CONSTRAINT "consent_enforcement_check_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_enforcement_check" ADD CONSTRAINT "consent_enforcement_check_connector_id_connector_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."connector"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_enforcement_check" ADD CONSTRAINT "consent_enforcement_check_principal_user_id_user_id_fk" FOREIGN KEY ("principal_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "connector_org_code_ux" ON "connector" USING btree ("org_id","code");--> statement-breakpoint
CREATE INDEX "connector_event_connector_idx" ON "connector_event" USING btree ("connector_id","created_at");--> statement-breakpoint
CREATE INDEX "connector_event_org_idx" ON "connector_event" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "consent_enforcement_check_connector_idx" ON "consent_enforcement_check" USING btree ("connector_id","created_at");