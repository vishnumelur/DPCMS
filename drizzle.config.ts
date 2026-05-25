import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit migrations and introspection prefer the direct (unpooled) connection
// because they use prepared statements and may run multiple statements per session.
// Fall back to the pooled URL if no unpooled one is provided.
const migrationUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!migrationUrl) {
  throw new Error('drizzle.config: DATABASE_URL or DATABASE_URL_UNPOOLED must be set');
}

export default defineConfig({
  out: './db/migrations',
  schema: './db/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: { url: migrationUrl },
  verbose: true,
  strict: true,
});
