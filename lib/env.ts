import { z } from 'zod';

// Treat empty-string env vars as absent. process.env entries that are unset come
// through as undefined, but entries declared without a value in .env files arrive
// as "" — which would defeat .optional() unless we normalise first.
const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v === '' ? undefined : v);

const EnvSchema = z.object({
  // Database — pooled is used by the runtime client (neon-http);
  // unpooled is used by drizzle-kit migrations and the seed scripts.
  // If only one is set, it'll serve both roles (degraded for migrations).
  DATABASE_URL: z.string().url(),
  DATABASE_URL_UNPOOLED: z.preprocess(emptyToUndefined, z.string().url().optional()),

  // NextAuth
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),

  // Email — EMAIL_FROM accepts both a bare address and the RFC 5322
  // "Display Name <addr@host>" form that Resend uses.
  RESEND_API_KEY: z.string().startsWith('re_'),
  EMAIL_FROM: z.string().min(3),

  // AI
  AI_GATEWAY_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  AI_MODEL: z.string().default('google/gemini-2.5-flash'),

  // Cron
  CRON_SECRET: z.string().min(16),

  // Org seed
  SEED_ORG_NAME: z.string().default('Kerala State Cooperative Bank'),
  SEED_ORG_SLUG: z.string().default('kscb'),

  // Runtime
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration. See lib/env.ts for required keys.');
}

export const env = parsed.data;
export type Env = z.infer<typeof EnvSchema>;
