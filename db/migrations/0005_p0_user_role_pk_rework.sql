ALTER TABLE "user_role" DROP CONSTRAINT "user_role_user_id_role_id_scope_kind_branch_id_pk";--> statement-breakpoint
ALTER TABLE "user_role" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
-- Postgres keeps the NOT NULL flag on a column even after its PK is dropped.
-- Explicitly relax it so global-scope roles can use NULL branch_id.
ALTER TABLE "user_role" ALTER COLUMN "branch_id" DROP NOT NULL;--> statement-breakpoint
-- Partial unique indexes preserve uniqueness semantics across the (user, role, scope) tuple
-- while allowing branch_id = NULL for global scope.
CREATE UNIQUE INDEX IF NOT EXISTS "ux_user_role_global"
  ON "user_role" ("user_id", "role_id")
  WHERE "scope_kind" = 'global';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ux_user_role_scoped"
  ON "user_role" ("user_id", "role_id", "scope_kind", "branch_id")
  WHERE "scope_kind" <> 'global' AND "branch_id" IS NOT NULL;