# DPCMS — Data Privacy & Consent Management System

POC for the Kerala State Cooperative Bank (KSCB) DPCMS bid, in compliance with the
Digital Personal Data Protection Act, 2023.

> See [the design spec](docs/superpowers/specs/2026-05-25-dpcms-poc-design.md) for the
> full architecture and phasing. This is **Phase P0 — Foundation**.

## Stack

- Next.js 15/16 (App Router) on Vercel Hobby
- Neon Postgres (free tier) + Drizzle ORM
- Auth.js v5 (`next-auth@beta`) with Resend magic links + TOTP MFA
- shadcn/ui + Tailwind v4
- next-intl (22 Schedule-8 Indian languages skeleton)
- Vercel AI Gateway (free tier, Gemini 2.5 Flash via `google/gemini-2.5-flash`) via AI SDK v6
- Vitest + Playwright

## Free-tier signups required (one-time)

| Service | URL | Env var |
|---|---|---|
| Neon | https://neon.tech | `DATABASE_URL` |
| Resend | https://resend.com | `RESEND_API_KEY`, `EMAIL_FROM` |
| Vercel | https://vercel.com | (link via `vercel link`) |
| Vercel AI Gateway | Vercel dashboard → AI | `AI_GATEWAY_API_KEY` |

## Local setup

```bash
git clone <repo> && cd dpcms
npm install
cp .env.example .env.local       # fill in values
echo "AUTH_SECRET=$(openssl rand -base64 32)" >> .env.local
echo "CRON_SECRET=$(openssl rand -hex 32)" >> .env.local
npm run db:migrate
npm run db:manual                # enforce append-only DB roles
npm run db:seed
npm run dev
```

## Scripts

- `npm run dev` — local dev server
- `npm run build` / `npm run start` — production build
- `npm run typecheck` / `npm run lint`
- `npm test` / `npm run test:coverage` — Vitest
- `npm run e2e` — Playwright E2E smoke
- `npm run db:generate` — create migration from schema diff
- `npm run db:migrate` — apply migrations
- `npm run db:manual` — apply `db/migrations/_manual/*.sql`
- `npm run db:seed` — seed org/branches/roles/permissions

## Deploy

```bash
npx vercel link
npx vercel env pull .env.local     # pull production env, if already set
npx vercel deploy --prod
```

Set the same env vars in Vercel project settings.

## Roadmap (post-P0)

P1 Consent + Cookies + Notices → P2 DSR + Breach → P3 PIA/DPIA/RoPA → P4 Integrations → P5 Reporting + Polish.
See spec §15 for details.
