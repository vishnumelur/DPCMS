# DPCMS — Data Privacy & Consent Management System

> 🟢 **Live demo:** [https://dpcms-sigma.vercel.app](https://dpcms-sigma.vercel.app)
> Sign in with `dpcmsadmin` / `dpcms@2026` — full DPO role, global scope.
> Start at `/rfp-matrix` to see every KSCB RFP line item mapped to a working demo screen.

POC for the Kerala State Cooperative Bank (KSCB) DPCMS bid, in compliance with the
Digital Personal Data Protection Act, 2023.

> See [the design spec](docs/superpowers/specs/2026-05-25-dpcms-poc-design.md) for the
> full architecture and phasing. This is **Phase P0 — Foundation**.

## Demo flow for evaluators

1. **Public surface** — `/` landing · `/rfp-matrix` (live RFP compliance status) · `/notices` (sample privacy notice)
2. **Sign in** — `/signin` → `dpcmsadmin` / `dpcms@2026` → lands on `/admin`
3. **Compliance dashboard** — live KPIs from Neon, "What's live in P0" link map
4. **Walk the sidebar** — every module is a real page, not a mock
   - Overview: Audit chain (live SHA-256 chain verifier) · RBAC viewer · Settings · SBOM
   - Consent & notices: M1 · M2 · M8
   - Rights & breach: M5 DSR queue with SLA flags · M9 incident lifecycle
   - Assessments: M3 RoPA · M6 PIA · M7 DPIA with **AI prefill**
   - Integrations: M4 — 6 connectors with realistic payloads
   - Reporting & research: M10 with **live recharts** · M11 corpus search
5. **Customer side** — top-bar "My Portal" → consent grant/withdraw, DSR raising, nominee management
6. **22 languages** — top-bar language switcher (en/ml/hi authored; rest fall back)

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

## Phases shipped

The POC is now **feature-complete across all 11 RFP modules**. Each phase is a
single squash commit on `main`:

- **P0 — Foundation.** Next.js + Drizzle + Auth.js + shadcn baseline,
  hash-chained audit log with live verifier, RBAC scaffolding, AI gateway
  wrapper with PII redaction, 22-language i18n skeleton, app-shell navigation
  with every module clickable. Routes: `/`, `/admin`, `/admin/audit`,
  `/admin/rbac`, `/admin/settings`, `/rfp-matrix`.
- **P1 — Consent (M1, M2, M8).** Purpose/template/artefact ledger with DEPA-style
  JWS signing, cookie banner, versioned privacy notices, customer self-service
  consent toggle. Routes: `/admin/consents`, `/admin/cookies`, `/admin/notices`,
  `/me/consents`, `/me/notices`.
- **P2 — Rights + Breach (M5, M9).** DSR queue with SLA clock + workflow guards,
  breach incident lifecycle with DPB-format notification draft. Routes:
  `/admin/dsr`, `/admin/breach`, `/me/requests`.
- **P3 — Assessments (M3, M6, M7).** RoPA registry, PIA + DPIA editors with
  AI prefill, risk scoring, approval workflow. Routes: `/admin/data-mapping`,
  `/admin/pia`, `/admin/dpia`.
- **P4 — Integrations (M4).** 6 connectors with mock payloads matching real
  field shapes — Finacle (CBS), NPCI (UPI/AEPS/BBPS), UIDAI Aadhaar e-KYC,
  DigiLocker, Account Aggregator, MeitY consent stack. Trigger / replay /
  validate-consent surfaces. Route: `/admin/integrations`.
- **P5 — Reporting & polish (M10, M11 + nominees + language switcher + SBOM).**
  KPI dashboard with 4 recharts charts + Board-pack JSON export. Searchable
  research repository (DPDP Act 2023, DPDP Rules 2025, IT Act 2000, SPDI Rules
  2011, GDPR EU 2018). Customer nominee CRUD per DPDP §14. Top-bar language
  switcher across all 22 locales (en/ml/hi authored; rest fall back to en).
  POC-grade SBOM with CycloneDX 1.5 JSON export. Routes: `/admin/reporting`,
  `/admin/research`, `/admin/sbom`, `/me/nominees`,
  `/api/reports/board-pack`, `/api/reports/sbom`.
- **Production.** Live at [https://dpcms-sigma.vercel.app](https://dpcms-sigma.vercel.app).
  Source at [https://github.com/vishnumelur/DPCMS](https://github.com/vishnumelur/DPCMS).
  Auto-deploys from `main` via the Vercel GitHub integration.

### Final RFP matrix totals

See `/rfp-matrix` for the live, per-row mapping. The legend is RA = ready-to-show,
CA = customisable in a paid engagement, NA = explicitly out of POC.

### Known POC limitations (carried forward)

- Vercel Hobby SLA + Neon free-tier auto-suspend — production-grade HA / DR
  requires paid tiers (RFP T.1 marked CA).
- SBOM is generated from `package.json` + `package-lock.json`; for production
  use [@cyclonedx/cyclonedx-npm](https://github.com/CycloneDX/cyclonedx-node-npm)
  which captures licenses, hashes and supplier metadata.
- Only `en`, `ml`, `hi` have hand-authored UI bundles. Selecting any other
  Schedule-8 locale falls back to `en` strings until an AI-bootstrapped
  translation pass is run (Gemini 2.5 Flash via the AI gateway).
- The connector framework runs in `mock` mode end-to-end; switching to
  `sandbox` / `live` requires per-connector configuration (`baseUrl`,
  `apiKeyRef`) that production deployments must supply.
