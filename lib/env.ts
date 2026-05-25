import { z } from 'zod';

const EnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // NextAuth
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.string().url().optional(),

  // Email
  RESEND_API_KEY: z.string().startsWith('re_'),
  EMAIL_FROM: z.string().email(),

  // AI
  AI_GATEWAY_API_KEY: z.string().min(1).optional(),
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
