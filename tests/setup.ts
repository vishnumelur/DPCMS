// Provide minimum env vars when tests run without .env.local
process.env.DATABASE_URL ||= 'postgres://test:test@localhost:5432/test';
process.env.AUTH_SECRET ||= 'test-secret-32-bytes-padding-padding-padding';
process.env.RESEND_API_KEY ||= 're_test';
process.env.EMAIL_FROM ||= 'test@example.com';
process.env.CRON_SECRET ||= 'cron-secret-test-padding-padding';
