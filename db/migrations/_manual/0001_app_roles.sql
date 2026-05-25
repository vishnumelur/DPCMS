-- Enforce append-only semantics for audit + future event tables at the DB role level.
-- The application uses the 'app_writer' role (DATABASE_URL); migrations use the owner.
--
-- NOTE: This only "bites" in production where DATABASE_URL connects as app_writer.
-- During local/Neon demo the connection role is the project owner with full
-- privileges, so UPDATE/DELETE on audit_log is NOT blocked at the DB layer there.
-- Application-level append-only is still enforced by withAudit() in lib/audit.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_writer') THEN
    CREATE ROLE app_writer NOLOGIN;
  END IF;
END$$;

-- Default privileges on everything app needs:
GRANT USAGE ON SCHEMA public TO app_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_writer;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_writer;

-- Revoke UPDATE/DELETE on append-only tables:
REVOKE UPDATE, DELETE ON TABLE audit_log FROM app_writer;
-- (Phases P1+ will add: consent_event, consent_artefact, dsr_event, breach_action)

-- Future tables created by migrations will inherit defaults:
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_writer;
