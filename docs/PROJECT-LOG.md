# DPCMS POC — Project Log

> Snapshot taken **2026-05-26** at commit `4160076`.
> Live URL: **https://dpcms-sigma.vercel.app** · creds: `dpcmsadmin` / `dpcms@2026`
> Repo: **https://github.com/vishnumelur/DPCMS**
> Vercel project: `vishnumelurs-projects/dpcms` (GitHub auto-deploy on every push to `main`)

This document captures everything built so far so the next session can pick up cleanly. Read top-to-bottom for the full story; jump to "Where to resume" at the end for next steps.

---

## 1. What this is

**DPCMS** — Data Privacy & Consent Management System, a proof-of-concept for the **Kerala State Cooperative Bank (KSCB)** bid under RFP `KBIT/PMU/DPCMS/088/25-26`. Aligned to India's **DPDP Act 2023**. Built end-to-end on **free-tier infrastructure** — zero monthly spend.

The goal: a live, clickable demo where every numbered RFP requirement maps to a working screen + evidence link. Today the live RFP Compliance Matrix sits at **52 RA · 0 CA · 0 NA** out of 52 representative rows.

---

## 2. Stack + infra

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TS strict + `noUncheckedIndexedAccess` + `noImplicitOverride`) |
| Hosting | Vercel Hobby — auto-deploys from GitHub `main` |
| Database | Neon Postgres (free tier, `aws-ap-south-1`) + Drizzle ORM 0.45 + `@neondatabase/serverless` |
| Auth | Auth.js v5 (`next-auth@beta`) — credentials provider + **opt-in TOTP MFA** (AES-256-GCM-encrypted secret) |
| UI | shadcn/ui (base-nova style, KSCB teal palette) + Tailwind v4 |
| Charts | recharts |
| i18n | next-intl, 22 Schedule-8 Indian locales declared; **en/ml/hi authored**; rest fall back to en |
| AI | Vercel AI Gateway → Gemini 2.5 Flash via AI SDK v6 (`google/gemini-2.5-flash`); PII-redacted via `lib/ai/redact.ts` |
| Email | Resend (free tier; conditional — credential login is primary) |
| PDF | `@react-pdf/renderer` (DPB breach report) |
| Testing | Vitest 4 (unit) + Playwright 1.60 (E2E) |
| CI | GitHub Actions (typecheck → lint → test → build) |
| Env loader | `dotenv-flow/config` (loads `.env.local` for CLI tools, matches Next convention) |

---

## 3. Phase timeline — what shipped when

### P0 — Foundation (`9f0bf8b` … `6bb7aa6`)
- Next.js scaffold + TS strict
- ESLint flat config + Prettier
- Tailwind v4 + shadcn/ui baseline
- Zod-validated env (`lib/env.ts`)
- Vitest baseline
- Drizzle + Neon + `org/branch` schema
- Identity schema (`user/account/session/role/permission/user_role/mfa_factor`)
- **Hash-chained audit log core** (TDD'd in `lib/audit/chain.ts`)
- `audit_log` table + `withAudit()` wrapper + chain verifier
- Append-only DB role enforcement
- RBAC roles + perms + `withScope` helper (TDD'd)
- Auth.js v5 + credentials provider (`dpcmsadmin`/`dpcms@2026`)
- TOTP MFA helpers
- Middleware route guard + stub portals
- next-intl 22-language skeleton
- Workflow state-machine engine (TDD'd)
- AI gateway wrapper + PII redactor + system tables
- RFP requirement type + seed data
- RFP Compliance Matrix page (`/rfp-matrix`)
- Health + cron stub + `vercel.ts`
- Playwright E2E smoke
- Seed scripts + CI workflow + README

### P0.5 — App shell + navigation (`b3a2957`)
Recognised that P0's literal stub layouts gave evaluators nothing visible. Built:
- `components/app-shell/{top-bar,user-menu,public-shell,auth-shell,sidebar-nav,sidebar-configs,phase-badge,coming-soon}.tsx`
- 18-item admin sidebar, 7-item customer sidebar (every module reachable)
- /me + /admin dashboards with real DB-backed KPIs
- /admin/audit (live chain verifier), /admin/rbac (live viewer), /admin/settings (live org/branches)
- /me/activity (real audit log filtered to user)
- 11 module placeholder pages with phase badges + RFP refs

### P1 — Consent core (`8ae310f`, `2a9e600`)
- 8 new tables (`purpose`, `consent_template`, `consent_artefact`, `consent_preference`, `notice`, `notice_ack`, `cookie_category`, `cookie_consent_record`)
- **DEPA-compatible JWS-signed consent artefacts** via `jose` (RS256), keypair stored in `app_keys`
- Customer grant/withdraw with downloadable JWS artefact
- Admin purpose + template CRUD
- Notice authoring + customer read + acknowledge
- Cookie banner (4 categories) + consent record
- 5 sample purposes + 1 sample notice + 4 cookie categories seeded
- RFP: 8 rows flipped to RA

### P2 — Rights & breach (`f7f7d24`)
- DSR + breach schemas (`dsr_request`, `dsr_event`, `sla_clock`, `breach_incident`, `breach_action`, `breach_notification`, `breach_cohort`)
- DSR workflow wired into the generic state machine: `RECEIVED → IDENTITY_VERIFIED → IN_REVIEW → INFO_REQUESTED ⇄ IN_REVIEW → FULFILLED | REJECTED | ESCALATED`
- SLA computation **live on-read** (no sub-day cron needed on Hobby)
- Customer raises DSR; DPO sees in queue with green/amber/red flags
- Breach incident lifecycle: detect → assess → contain → report → close
- 72h reporting deadline auto-computed per DPDP Rules 2025
- DPB notification template + Markdown download
- RFP: 8 more rows flipped to RA

### P3 — Assessments (`8ec3b0e`)
- 4 new tables (`processing_activity`, `assessment`, `assessment_response`, `assessment_action`)
- RoPA registry with cross-border + retention tracking
- PIA 6-question template + weighted scoring
- DPIA 10-question template + **AI prefill via Gemini** (deterministic fallback if no API key)
- Approval workflow (DPO-only via `can()` from `lib/auth/rbac.ts`)
- 2 sample activities + 1 approved PIA + 1 AI-prefilled DPIA seeded
- RFP: 6 rows flipped to RA

### P4 — Integrations (`3174353`)
- 3 new tables (`connector`, `connector_event`, `consent_enforcement_check`)
- 6 connectors with **realistic industry payload shapes**:
  - Finacle (Infosys CBS 10.2.25) — customer / account / KYC events with `cif`, `branchCode`, `prodCode`, `solId`
  - NPCI (UPI / AEPS / BBPS) — `txnId`, `vpa`, `rrn`, `mcc`
  - Aadhaar UIDAI e-KYC OTP — `<KycRes>` XML envelope
  - DigiLocker — issued-document fetch with `docTypeURI`, `issuerInstitute`
  - Account Aggregator (Sahamati ReBIT 1.1.2) — `ConsentArtefactSignedXML`
  - MeitY National Consent Stack — placeholder, awaits GoI release
- Admin control panel: toggle mode, trigger event, health check, replay
- Connector event log + audit entries
- RFP: 3 rows flipped to RA

### P5 — Reporting & polish (`64afbb8`)
- 3 new tables (`law_document`, `law_section`, `nominee`)
- **Reports dashboard** with 6 KPIs + 4 recharts charts + board-pack JSON export
- **Research repository** — 5 seeded law docs (DPDP Act 2023, DPDP Rules 2025, IT Act 2000, SPDI Rules 2011, GDPR EU 2018) + 20 sections, searchable
- Customer nominees CRUD with audit
- **Language switcher** UI (22-locale dropdown)
- **SBOM page + CycloneDX 1.5 export** (45 direct deps, 847 transitive)
- `/api/reports/board-pack` and `/api/reports/sbom` download endpoints
- RFP: 9 more rows to RA + 4 new P5 evidence rows added

### SBOM fixes (`810b376`, `da7f154`)
- Production SBOM page initially 500'd because `fs.readFile(process.cwd() + ...)` didn't resolve in Vercel serverless bundle
- Fix: switched to static JSON imports (`import pkg from '../../../../package.json'`) which Next bundles at build time

### Tier 2 — close every CA (`c27f8d9`, `6f71a2d`, `c949f1a`, `b1d486a`, `ee8b52e`)
- **Live Gemini translation pipeline** for notices + cookie banner across 22 langs (M1.A.23, M2.B.2, M8.A.3 → RA)
- **Cookie auto-scanner** — admin pastes URL, server fetches + parses Set-Cookie, heuristic-categorises (M2.A.1 → RA)
- **Parental/guardian consent** for minors per DPDP Act §9 — `principal_minor_flag` + `parentalConsentEvidence` on artefact (M1.A.8 → RA)
- **Real PDF DPB report** via `@react-pdf/renderer` with KSCB letterhead (M9 evidence quality up)
- **MeitY Consent Stack** ready-when-published adapter (M1.A.2 → RA)

### Design pass (`1fd4c2b`)
- KSCB deep teal palette (OKLCH light + dark) + chart + sidebar tokens
- New SVG K-in-circle brand mark + coconut-frond dot, replaces generic "D" tile
- `favicon.svg` + viewport `themeColor` `#1d6470`
- `DEFAULT_LOCALE='ml'`, LOCALES re-ordered (ml first)
- ReadAloudButton on `/me/notices/[slug]` + `/notices` (Web Speech API, locale-aware voice)
- CheckCircle2 / XCircle / Circle lucide icons on consent state (decorative, ARIA-hidden alongside Badge text)
- Customer portal tap targets: `text-base` body + `h-11` inputs/buttons
- Skip-to-content links on both shells, `lang={effectiveLocale}` on translated bodies
- RFP: P5.6 (design + a11y) added as RA

### Audit-driven UX fix (`9a6d5f8`)
Following a systematic-debugging audit that found:
- ❌ Mobile sidebar entirely missing (`hidden md:block` + no drawer)
- ❌ Mobile top-bar nav missing
- ❌ Language switcher cookie sets correctly but pages hardcoded English

Fixes:
- **Mobile drawer** via shadcn `Sheet` (built on existing `@base-ui/react/dialog`): hamburger button (`md:hidden` with `aria-label="Open menu"`) opens a left-anchored sheet containing public links + account links + full sidebar + language switcher + sign-out
- **i18n actually wired** into TopBar, landing, `/signin`, `/me` dashboard, RFP matrix headings via `getTranslations()` / `useTranslations()`
- **~40 new keys** authored per locale (en/ml/hi)
- `messages/ml.json` proven to render Malayalan strings in production curl tests
- `DemoFillButton` on signin (auto-fills `dpcmsadmin`/`dpcms@2026`)
- Sign-in error gets `role="alert"` and i18n-driven text
- New e2e: mobile hamburger flow
- README "i18n coverage" section documents admin pages remain English in POC scope

### Admin dashboard redesign (`4160076`) — most recent
Recognised the /admin dashboard felt "skeleton-like" despite the brand pass. Redesigned to feel like a polished SaaS surface (Linear / Vercel / Stripe gravitas) while keeping KSCB teal.

- **HeroMesh**: gradient mesh background + 2 drifting orbs (`@keyframes drift-a/b`, 22s/28s ease-in-out) + grain SVG overlay (`mix-blend-mode: soft-light` at 3.5% opacity). Time-of-day greeting + "All systems operational" pulse indicator. Two primary CTAs.
- **KpiCard**: bento grid of 4 primary tiles (audit · consents · DSRs · breach), big tabular-num numerals, lucide icon chips, gradient borders on featured cards, hover-lift micro-interaction
- **RfpProgress**: real visualisation — RA/CA/NA stacked progress bar with percentages, plus per-phase mini-bars (P0–P5)
- **WhatsLive**: feature grid with lucide icons + live/conditional status dots
- **MiniTile**: secondary tenancy footprint (orgs/branches/users/roles/perms)
- `globals.css`: `mesh-hero`, `surface-grain`, `drift-a/b`, `fade-up` (cubic-bezier 0.16,1,0.3,1 stagger), `card-lift`, `gradient-border`, `tabular`
- Every animation respects `prefers-reduced-motion: reduce`

---

## 4. Final state right now

| | |
|---|---|
| **Live URL** | https://dpcms-sigma.vercel.app |
| **Sign in** | `dpcmsadmin` / `dpcms@2026` (TOTP MFA opt-in via Settings) |
| **Repo** | https://github.com/vishnumelur/DPCMS |
| **Latest commit** | `4160076` |
| **Commits total** | 49 on `main` |
| **Routes** | 49 building |
| **Tests** | 60 vitest + 20 Playwright all passing |
| **DB migrations** | 14 applied to live Neon |
| **RFP matrix** | **52 RA · 0 CA · 0 NA** (all 11 modules + cross-cutting + P0.5 + P5 evidence rows) |
| **Cost** | ₹0/month |

### Spec + plan locations
- Design spec: `docs/superpowers/specs/2026-05-25-dpcms-poc-design.md`
- P0 plan: `docs/superpowers/plans/2026-05-25-dpcms-p0-foundation.md`

### Module → DB schema mapping
- `db/schema/org.ts` — `org`, `branch`
- `db/schema/auth.ts` — `user`, `account`, `session`, `verification_token`, `role`, `permission`, `role_permission`, `user_role`, `mfa_factor`
- `db/schema/audit.ts` — `audit_log`, `audit_chain_head`
- `db/schema/system.ts` — `app_keys`, `feature_flag`, `i18n_string`, `ai_call_log`
- `db/schema/consent.ts` — `purpose`, `consent_template`, `consent_artefact`, `consent_preference`, `notice`, `notice_translation`, `notice_ack`, `cookie_category`, `cookie_consent_record`, `cookie_scan_run`, `cookie_scan_finding`, `principal_minor_flag`
- `db/schema/rights.ts` — `dsr_request`, `dsr_event`, `dsr_attachment`, `sla_clock`
- `db/schema/breach.ts` — `breach_incident`, `breach_action`, `breach_notification`, `breach_cohort`
- `db/schema/assessment.ts` — `processing_activity`, `assessment`, `assessment_response`, `assessment_action`
- `db/schema/integrations.ts` — `connector`, `connector_event`, `consent_enforcement_check`
- `db/schema/research.ts` — `law_document`, `law_section`, `nominee`

### Module → service-layer mapping
- `modules/consent/` — purposes, artefacts (JWS), queries, notice-translate
- `modules/cookies/scanner.ts` — Set-Cookie parser + heuristic categoriser
- `modules/rights/` — DSR flow, service, sla (TDD'd pure scoring)
- `modules/breach/` — service, templates/dpb-report (Markdown), pdf-report (React-PDF)
- `modules/assessment/` — service, templates, scoring (TDD'd pure scoring)
- `modules/ropa/service.ts` — RoPA CRUD
- `modules/integrations/` — types, registry, connectors/{aadhaar,aa,digilocker,finacle,meity_consent_stack,npci}.ts

### Lib mapping
- `lib/audit/{chain,with-audit,verifier}.ts`
- `lib/workflow/{engine,types}.ts`
- `lib/consent-artefact/{keys,sign,verify}.ts`
- `lib/auth/{rbac,scope,mfa,encrypt}.ts`
- `lib/ai/{gateway,redact}.ts`
- `lib/sbom/build-sbom.ts`
- `lib/reporting/aggregate.ts`
- `lib/actions/{consent,dsr,breach,assessment,ropa,integrations,nominees,mfa,sign-out}.ts`
- `lib/env.ts` (Zod-validated)

---

## 5. Full commit log (49 commits)

```
9f0bf8b feat(p0): next.js 15 + typescript strict scaffold
a5306cc chore(p0): tsconfig strictness + cleanup npm init leftovers
4dad2d4 chore(p0): eslint flat config + prettier
d4d71ee feat(p0): tailwind v4 + shadcn/ui baseline
3406dd9 feat(p0): zod-validated env
75ebfab fix(p0): relax env schema for empty-string-as-absent + RFC-5322 EMAIL_FROM
6bb7aa6 test(p0): vitest baseline
38d7124 feat(p0): drizzle + neon client + org/branch schema (migration not yet applied to db)
2c4e7b5 feat(p0): identity schema (auth.js v5 + rbac + mfa)
c1b278a feat(p0): hash-chained audit log core (tdd)
216f04d feat(p0): audit_log table + withAudit wrapper + verifier
0304ce9 feat(p0): document append-only DB role enforcement
c5f3c8f feat(p0): rbac roles + permissions + withScope helper (tdd)
5e50371 feat(p0): auth.js v5 with resend magic link
b5c3004 feat(p0): totp mfa helpers (tdd)
7e0b76f feat(p0): middleware route guard + stub portal layouts
4a4b147 feat(p0): next-intl 22-language skeleton (en/ml/hi authored)
511b3d0 feat(p0): generic workflow state machine (tdd)
8137d79 feat(p0): ai gateway wrapper + pii redactor (tdd) + system tables
431aba4 feat(p0): rfp requirement types + representative seed data
df0e722 feat(p0): rfp compliance matrix shell page
cb24dd4 feat(p0): health + daily cron stub + vercel.ts
05cdcd7 test(p0): playwright e2e smoke (landing, matrix, health, auth gate)
0fe6a25 feat(p0): seed scripts + ci workflow + readme
22703f0 feat(p0): support pooled + unpooled Neon URLs (DATABASE_URL_UNPOOLED for migrations)
2ea4b7b fix(p0): load .env.local in CLI tools via dotenv-flow (drizzle, seed, manual-sql)
ad3791a feat(p0): user.password_hash column + user_role synthetic PK (nullable branch_id)
7a8448d feat(p0): credentials auth (dpcmsadmin/dpcms@2026) + JWT sessions
b3a2957 feat(p0.5): app shell + full navigation + every module clickable
8ae310f feat(p1): consent core schema + JWS signer + service layer + seeds
2a9e600 feat(p1): consent UI — admin + customer pages, cookie banner, RFP matrix flips
f7f7d24 feat(p2): rights + breach — M5 DSR queue with SLA, M9 incident workflow with DPB report
8ec3b0e feat(p3): assessments — M3 RoPA registry + M6 PIA + M7 DPIA with AI prefill
3174353 feat(p4): integrations — connector framework + 6 mocks with realistic payloads
64afbb8 feat(p5): reporting + research repo + nominees + language switcher + SBOM — DPCMS feature-complete
810b376 fix(p5): bundle package.json + lockfile into SBOM route via outputFileTracingIncludes
da7f154 fix(p5): SBOM uses static JSON imports — no fs reads at runtime
82a76c1 docs: live demo banner + evaluator walkthrough in README
8aac7c3 chore: rename middleware.ts → proxy.ts (Next 16 convention)
a5c82b5 docs: architecture diagram (Mermaid) + module map
8b297f1 test(e2e): deflake DSR transition by creating a fresh DSR per run
1cecbd3 feat: TOTP MFA opt-in for admin accounts
c27f8d9 feat(p5+): live Gemini translation pipeline for notices + cookie banner
6f71a2d feat(p5+): cookie auto-scanner
c949f1a feat(p5+): parental/guardian consent for minors (DPDP Act §9)
b1d486a feat(p5+): real PDF generation for DPB breach notification
ee8b52e feat(p5+): MeitY National Consent Stack adapter ready, awaiting GoI release
1fd4c2b feat(design): KSCB brand theme + Malayalam-first + read-aloud + lucide icons + tap targets + a11y pass
9a6d5f8 fix(ux): mobile drawer + functional i18n + signin polish
4160076 feat(design): admin dashboard redesign — institutional modernism
```

---

## 6. What's still open

### Operational (need you / not blocked by code)
- **Real DigiLocker sandbox** — register the KSUM startup at API Setu (free). Connector code is ready to swap from `mode='mock'` to `'sandbox'`.
- **Real Account Aggregator sandbox** — Sahamati / Setu / Finvu free dev tiers, same.
- **Resend domain verification** — current setup uses `onboarding@resend.dev` for dev. Verify a real domain to enable production magic-link sign-in alongside credentials.
- **Custom domain** (e.g. `dpcms.kscb.in`) — ~₹800/yr; outside zero-spend rule but boosts credibility.

### Design / UX (paused for Stitch MCP install)
- **Redesign the other admin pages** to match the new institutional-modernism dashboard:
  - `/admin/dsr` — currently functional table, would benefit from the same hero + bento + chart treatment
  - `/admin/dpia/[id]` — assessment editor; could feel more like a Linear issue page with a clean right rail
  - `/admin/integrations` — connector list; treat connectors as 6 hero cards
  - `/admin/reporting` — already has charts but could use the gradient mesh + heroes for board-pack feel
  - `/admin/breach/[id]` — incident detail; could use a timeline + status flow visual
  - `/admin/research/[docCode]` — law detail; could feel like a magazine reading view
  - `/me/*` — customer surfaces; need warmth, larger type, friendlier illustrations
- This is where the **Google Stitch MCP** will help — generate design variants we can adapt.

### Bid submission package (Tier 5 — drafting work)
- Technical proposal PDF (10-15 pages mapping every RFP line to architecture)
- Financial proposal (QCBS 70:30 pricing per RFP §6)
- One-page executive summary (lead with live URL + matrix)
- 5-minute demo video (screen recording, evaluator flow)
- Eligibility annexures (KSUM cert, conflict-of-interest, NDA, integrity pact)

### Smaller polish items
- Wire **email notifications** to DSR state changes + breach declarations + consent expiry (Resend free tier)
- **Vercel Blob** real file attachments on DSR (currently text-only inline)
- **VAPT pre-flight** — run OWASP ZAP against the live URL, attach `docs/security/zap-report.html`
- **AD/SSO stub** — add disabled OIDC provider option to Auth.js
- **Rotate the demo password** before public release (currently hardcoded in seed + README)
- 1 pre-existing ESLint warning in `postcss.config.mjs` (anonymous default export) — cosmetic

---

## 7. Where to resume

You paused to install the **Google Stitch MCP server** for AI-driven UI design generation. The install command was:

```bash
claude mcp add stitch --transport http https://stitch.googleapis.com/mcp \
  --header "X-Goog-Api-Key: <YOUR-KEY>" -s user
```

(Claude Code's auto-mode classifier blocked me from running it — MCP additions are persistent self-modification. **You must run it in your own terminal.** Restart Claude Code afterwards so the new tools load.)

**⚠️ Security**: the API key was pasted in the conversation transcript verbatim. It must be assumed compromised. After installing Stitch, **rotate it in Google Cloud Console → APIs & Services → Credentials → regenerate**, then re-add the MCP with the new value. (The original key is intentionally not stored in this log — see the chat transcript if you need to recover it for the rotation step.)

### When you come back
1. Confirm Stitch tools are loaded: type `/mcp` in Claude Code and look for `stitch` in the server list.
2. Tell me which admin page to redesign first (recommend `/admin/dsr` or `/admin/dpia` since they're high-traffic and the most "table-heavy" — biggest visual lift potential).
3. I'll call Stitch's generation tool, pick the best variant, and adapt it into our codebase keeping the KSCB teal palette + Geist font + existing data wiring.

If you'd rather skip the Stitch path and just continue manually (as I did with the dashboard redesign in commit `4160076`), say the word — the dashboard pattern is replicable across all admin pages without external help.

### One-line recap for any future agent reading this
> DPCMS POC for KSCB DPDP bid. Live at https://dpcms-sigma.vercel.app (`dpcmsadmin`/`dpcms@2026`). 49 commits on `main`. 52 RA / 0 CA / 0 NA. 60 vitest + 20 Playwright passing. Stack: Next 16 + TS strict + Drizzle + Neon + Auth.js v5 + shadcn (KSCB teal) + next-intl (ml-first) + AI Gateway + recharts. All on free tier. Paused before redesigning remaining admin pages with Google Stitch MCP — install in your terminal, rotate the API key, then resume.
