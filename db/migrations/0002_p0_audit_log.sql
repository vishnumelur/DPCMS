CREATE TABLE "audit_chain_head" (
	"org_id" uuid NOT NULL,
	"stream" text NOT NULL,
	"last_seq" bigint DEFAULT 0 NOT NULL,
	"last_hash" text DEFAULT 'GENESIS' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"stream" text NOT NULL,
	"seq" bigint NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_user_id" uuid,
	"actor_label" text NOT NULL,
	"action" text NOT NULL,
	"target" text NOT NULL,
	"payload" jsonb NOT NULL,
	"prev_hash" text NOT NULL,
	"row_hash" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_chain_head" ADD CONSTRAINT "audit_chain_head_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_chain_head_pk" ON "audit_chain_head" USING btree ("org_id","stream");--> statement-breakpoint
CREATE INDEX "audit_log_org_stream_seq_idx" ON "audit_log" USING btree ("org_id","stream","seq");--> statement-breakpoint
DROP INDEX IF EXISTS "audit_chain_head_pk";--> statement-breakpoint
ALTER TABLE "audit_chain_head"
  ADD CONSTRAINT "audit_chain_head_pkey" PRIMARY KEY ("org_id", "stream");