import { type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  framework: 'nextjs',
  crons: [
    // Hobby plan minimum interval is once per day — runs at 00:05 UTC.
    { path: '/api/cron/daily-tick', schedule: '5 0 * * *' },
  ],
};
