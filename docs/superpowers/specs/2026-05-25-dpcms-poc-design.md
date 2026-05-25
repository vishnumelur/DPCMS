# DPCMS POC — Design Spec

**Project:** Data Privacy & Consent Management System (DPCMS), POC for KSCB / KSUM tender
**Date:** 2026-05-25
**Reference:** RFP KBIT/PMU DPCMS/088/25-26 — issued by Kerala State Cooperative Bank (KSCB), in collaboration with Kerala Startup Mission (KSUM)
**Goal:** Submit a live, clickable POC that maps to every numbered RFP requirement in Annexure I + II and visibly satisfies as many as possible as "Readily Available (RA)".

---

## 1. Intent and scope

This is **a working POC for the KSCB bid**, not a portfolio piece and not a production rollout. Evaluators (bank IT + compliance) will grade every requirement in Annexures I and II as RA / CA / NA. The build is optimised to:

1. **Tick the checklist.** Every numbered RFP requirement maps to a clickable demo screen or API route.
2. **Run on free infra only.** No paid services. Next.js on Vercel Hobby, Postgres on Neon free, Vercel Blob, Vercel Cron, Resend free tier, Vercel AI Gateway free tier (Gemini Flash).
3. **Be honest about integrations.** Free public sandboxes are used where they exist (DigiLocker via API Setu, Account Aggregator via Sahamati / Setu / Finvu free dev tiers). Where no public sandbox exists (Finacle CBS, NPCI, Aadhaar UIDAI production), the connector is **simulated with the real industry payload shape** and clearly labelled "simulated for demo".

Out of scope for the POC: real production deployment, real RBI/NABARD audits, real Bank DC/DR hosting, real VAPT certification. The architecture is designed so these become contract-time activities, not redesign.

---

## 2. RFP coverage map (one demo asset per module)

| RFP module | Module folder | Primary demo asset |
|---|---|---|
| M1 Universal Consent Management (23 items) | `modules/consent` | Customer consent inbox + DEPA-compatible Consent Artefact V1.1 (JWS-signed) |
| M2 Cookie Consent | `modules/cookies` | Live banner on `/`, auto-scanner CLI, IAB TCF-style categories |
| M3 Data Mapping Automation | `modules/data-mapping` | RoPA registry + AI-assisted classification of seeded assets |
| M4 Integrations | `modules/integrations` | Connector control panel; mocks (Finacle/NPCI/Aadhaar) + real (DigiLocker/AA) |
| M5 Data Principal Rights | `modules/dsr` | Customer-raised request → DPO queue → fulfilled with SLA timer |
| M6 Privacy Assessments (PIA) | `modules/pia` | Templated PIA with risk scoring |
| M7 Data Protection Impact Assessments (DPIA) | `modules/dpia` | AI-prefilled DPIA from RoPA, multi-level approval |
| M8 Privacy Notice Management | `modules/notices` | Versioned, multilingual notice publisher (22 Indian languages) |
| M9 Data Breach Management | `modules/breach` | Incident → impact assessment → DPB report PDF + DP cohort notification |
| M10 Controls, Reporting & Dashboards | `modules/reporting` | Role-aware dashboards (DPO, Steward, Auditor, Board, IT) |
| M11 Research Repository on Data Protection Laws | `modules/research` | Searchable library of DPDP Act, DPDP Rules 2025, IT Act, SPDI Rules, plus selected global laws |

Cross-cutting: RBAC + MFA, hash-chained audit trail, multilingual i18n, AI gateway, workflow engine.

---

## 3. Architecture (Approach A — Modular Monolith on Next.js)

Single Next.js 15 (App Router) application deployed to Vercel Hobby. Functions run on Fluid Compute (Node.js 24). Postgres on Neon free tier with Drizzle ORM. Three audience-scoped route groups in one codebase:

- `(public)` — landing, published privacy notices, cookie banner showcase, RFP Compliance Matrix.
- `(customer)/me/*` — Data Principal portal.
- `(admin)/admin/*` — Compliance portal (role-aware: DPO, Privacy Steward, Branch/Region, Auditor, IT Admin, Board).

### 3.1 Directory layout

```
/app
  /(public)              landing, notices, RFP matrix, cookie demo
  /(customer)/me/*       data principal self-serve portal
  /(admin)/admin/*       compliance portal
  /api
    /modules/...         module API routes
    /mocks/finacle       simulated CBS connector
    /mocks/npci          simulated NPCI events
    /mocks/aadhaar       simulated e-KYC + Aadhaar XML
    /integrations/digilocker   real (API Setu sandbox)
    /integrations/aa           real (Sahamati sandbox)
    /cron/daily-tick           Vercel Cron worker (once daily — Hobby plan limit)

/modules
  consent/  cookies/  data-mapping/  integrations/  dsr/
  pia/  dpia/  notices/  breach/  reporting/  research/

/lib
  auth/                   NextAuth + RBAC + TOTP MFA
  audit/                  hash-chained immutable audit log
  workflow/               state-machine engine (DSR, breach, DPIA, grievance)
  i18n/                   22-language framework (next-intl)
  ai/                     Vercel AI Gateway client (Gemini Flash)
  consent-artefact/       ConsentArtefactV1.1 signer / verifier (JWS RS256)
  pdf/                    consent receipt + audit evidence PDF generation
  email/                  Resend client
  outbox/                 simulated SMS / WhatsApp outbox
  rbac/                   roles, permissions, scope guards

/db
  schema/                 Drizzle ORM schemas, namespaced per module
  migrations/             Drizzle migrations
  seed/                   demo data, RFP matrix mapping, sample notices
```

### 3.2 Why a modular monolith, not real microservices

RFP §3.2 asks for "API-first, modular, microservices-based architecture". A real multi-deployment microservice topology is genuinely overkill for a free-tier POC, multiplies ops cost, and provides no demonstration value. We instead enforce module isolation **at the code level**: each module owns its DB namespace, services, routes, and UI; cross-module calls go through service interfaces, not direct DB reads. Each module is therefore extractable to its own Vercel project at production time without rewriting business logic. We document this explicitly so evaluators see the choice.

### 3.3 Routing model

- **Server Actions** for mutations. Every mutation is wrapped by `withAudit(action, payload)` which appends to the hash-chained audit log inside the same DB transaction. No module-side code may bypass the wrapper.
- **API routes** only for external-facing surfaces: mock-integration endpoints, OAuth callbacks (DigiLocker), AA webhooks, cron triggers.

---

## 4. Data model and multi-tenancy

Tenancy is modelled even though the demo runs a single bank. Every row carries `org_id`; branches form `org → region → zone → branch`. This satisfies RFP §2.9 (onboard branches and new privacy stakeholders).

| Group | Tables |
|---|---|
| **Identity & RBAC** | `org`, `branch`, `user`, `role`, `permission`, `user_role` (scope: global / region / branch), `mfa_factor` |
| **Data Principal** | `data_principal`, `principal_identifier` (UCIC, mobile, email, hashed PAN), `nominee` |
| **Consent (M1)** | `purpose`, `consent_template` (versioned per purpose), `consent_artefact` (JWS-signed, append-only), `consent_preference` (current state denorm), `consent_event` (append-only) |
| **Cookies (M2)** | `cookie_category`, `cookie_script`, `cookie_consent_record` |
| **Data Mapping (M3)** | `data_asset`, `data_category`, `system_of_record`, `processing_activity` (RoPA), `data_flow` |
| **Integrations (M4)** | `connector`, `connector_event` (redacted payload + hash), `consent_enforcement_check` |
| **DSR (M5)** | `dsr_request`, `dsr_event`, `dsr_attachment`, `sla_clock` |
| **Assessments (M6/M7)** | `assessment`, `assessment_question`, `assessment_response`, `risk_score`, `assessment_assignment` |
| **Notices (M8)** | `notice` (versioned), `notice_translation` (one row per language × version), `notice_ack` |
| **Breach (M9)** | `breach_incident`, `breach_action`, `breach_notification` (DP-facing + DPB-facing), `breach_cohort` |
| **Reporting (M10)** | DB views over the above + `report_run` |
| **Research (M11)** | `law_document`, `law_section`, `law_tag` |
| **Cross-cutting** | `audit_log` (hash-chained), `audit_chain_head`, `notification_outbox`, `feature_flag`, `i18n_string`, `ai_call_log`, `app_keys` |

### 4.1 Identifier minimisation

PAN, Aadhaar, account numbers stored as `sha256(value + org_salt)` plus a `*_last_4` display column. No clear-text storage. Aligns with DPDP minimisation and RFP §3.4 / §3.5.

### 4.2 RBAC scoping

Every query touching personal data is built via `withScope(user, query)`. The helper transparently injects `WHERE org_id = ? AND branch_id IN (allowed_branches)`. Centralised so no module can forget it; covered by unit tests.

### 4.3 Append-only enforcement

Database role `app_writer` has `INSERT` on audit / consent / event tables but **no `UPDATE` or `DELETE`** on them. Schema migrations run as `app_admin`. This is enforced at the Postgres role level, not just by application convention.

---

## 5. Audit immutability and Consent Artefact format

### 5.1 Hash-chained audit log

Every mutation goes through `withAudit()`:

```
row_hash = sha256(prev_hash || canonical_json(payload) || ts || actor || action || target)
```

`audit_chain_head` stores the latest `row_hash` per `(org_id, stream)`. The `/admin/audit/verify` page recomputes the chain on demand to prove integrity live during an audit. This satisfies RFP §1.16, §1.17, §3.5 and §14 (audit logging tamper-evident).

### 5.2 Consent Artefact (DEPA / MeitY Electronic Consent Framework compatible)

```json
{
  "ver": "1.1",
  "consentId": "uuid",
  "principal": { "id_hash": "...", "id_type": "ucic" },
  "dataConsumer": { "id": "kscb-org-1", "name": "Kerala State Cooperative Bank" },
  "purpose": { "code": "ACC_OPENING", "text": "...", "lawfulBasis": "consent" },
  "data": { "categories": ["personal", "financial.account"], "fi_types": ["DEPOSIT"] },
  "frequency": { "unit": "MONTH", "value": 12 },
  "lifetime": { "unit": "YEAR", "value": 5 },
  "purposeRevocable": true,
  "consentMode": "STORE",
  "fetchType": "ONETIME",
  "iat": 1716609600,
  "exp": 1874289600,
  "prev_artefact_id": null,
  "version_of": null
}
```

Signed as JWS (RS256). The signing key pair is generated at seed-time, stored in `app_keys`, and the public key is downloadable at `/.well-known/dpcms-consent-pubkey.pem` for third-party verification. The hash of the JWS goes into `consent_artefact.row_hash` on the chain.

**Renewal and withdrawal never mutate the prior artefact.** Renewals emit a new artefact with `version_of = <prior_id>`; withdrawals append a counter-signed `withdrawal_artefact` plus a `consent_event` of `kind='withdrawn'`. The principal can always download the full chain.

### 5.3 Receipts

Consent receipts available as JSON-JWS (machine) and PDF (human). PDFs are generated server-side and stored in Vercel Blob; their hash is recorded in `consent_artefact.receipt_hash`.

---

## 6. Workflow engine and SLA timers

A generic state-machine in `lib/workflow` drives DSR, breach, DPIA, and grievance flows. Each flow declares: states, transitions, allowed actor roles, SLA per state, escalation rule.

### 6.1 DSR state machine (DPDP Act 2023 timelines)

```
RECEIVED → IDENTITY_VERIFIED → IN_REVIEW → INFO_REQUESTED ⇄ IN_REVIEW
                                       ↘ FULFILLED | REJECTED | ESCALATED
```

Targets: 21-day warning, 30-day breach. Every transition writes a `dsr_event` (immutable, hash-chained), emits an audit row, schedules/cancels SLA timers in `sla_clock`, and enqueues notifications.

### 6.2 SLA status (on-read computation + daily Vercel Cron)

Vercel Hobby Cron is limited to **once-per-day minimum interval** ([source](https://vercel.com/docs/cron-jobs/usage-and-pricing)). Sub-daily polling is not available without leaving the free plan. We therefore split SLA into two parts:

1. **On-read computation.** Whenever any user loads a DSR list, queue, or detail page, the server query joins `sla_clock` and computes the current state (green / amber / red, time remaining) live from `now()` and stored thresholds. This is what the user actually sees on the dashboard and matches RFP §2.2 (dynamic red/yellow/green flags). Cost: one extra SQL expression per query — negligible. The DB does not need to be polled.

2. **Daily batch notifications.** `/api/cron/daily-tick` (Vercel Cron, once per day) sweeps `sla_clock` and `dsr_request` for state-change events that occurred since the last sweep (e.g. SLAs that crossed amber→red overnight), and dispatches notification emails (Resend) and in-app alerts. Idempotent: every event row carries `last_notified_at`.

**Optional sub-daily upgrade path documented:** if production needs minute-level SLA notifications, the same `/api/cron/daily-tick` endpoint can be hit on any schedule by a free external scheduler (GitHub Actions scheduled workflow, or cron-job.org) calling it with a shared-secret header. We ship the scheduler config in `.github/workflows/external-sla-tick.yml` (commented out by default — enable post-POC).

### 6.3 Breach reporting deadlines

DPDP Rules 2025 require notifying the Data Protection Board "without delay" and Data Principals "without delay" once impact assessed. Deadlines are computed on-read from `breach_incident.detected_at` and surfaced as live countdowns on the compliance portal. The daily Vercel Cron sends "deadline approaching" / "deadline breached" notification batches. Pre-filled DPB-notification templates (PDF + JSON) are generated on demand at any stage from `/admin/breach/<id>/report`.

---

## 7. Multilingual and AI strategy

### 7.1 i18n surface

22 Indian languages from Schedule 8 of the Constitution. UI strings via `next-intl`; content (notices, banners) via `notice_translation`. Static UI strings shipped for English + Malayalam + Hindi at launch. The remaining 19 are AI-bootstrapped on demand: admin clicks "Generate translation" → Gemini Flash produces draft → human reviewer publishes. This visibly demonstrates RFP §1.A.23, §2.B.2 and §8.A.3 without a 22-translation upfront cost.

### 7.2 AI uses (all on Gemini Flash via Vercel AI Gateway free tier)

| RFP requirement | AI use |
|---|---|
| §6.A.2 Data Discovery & Classification ("AI/ML-powered scanning of structured and unstructured data") | LLM classifies sample data rows + uploaded docs into PII / SPDI / non-personal; drafts RoPA entries |
| §7.1.16 Smart Assessments ("auto-fill assessments using AI") | LLM pre-fills DPIA from existing RoPA + connector configs; risk-scored |
| §2.B.2 Cookie banner translation into 22 languages | LLM translates banner per region |
| §8.A.3 Notice translation into 22 languages | LLM drafts notice translations; reviewer approves before publish |
| Customer assistance (optional) | LLM answers "what consents do I have, how do I revoke" against the principal's own data, strictly scoped |

### 7.3 AI safety and cost controls

All AI calls go through `lib/ai/gateway.ts` which:
- enforces per-tenant token quota (free-tier guard),
- PII-redacts inputs via regex before send,
- logs every prompt/response to `ai_call_log` (auditable),
- caches deterministic prompts via Vercel Data Cache.

---

## 8. Integrations: mocks + real

### 8.1 Connector interface

```
discoverDataAssets()
validateConsent(principal, purpose)
enforceWithdrawal(principal, purpose)
pullDataFor(dsr)
applyErasure(dsr)
```

Every call logged to `connector_event` (redacted payload + hash). Admin control panel toggles live/mock per connector, shows event stream, allows replay, and surfaces "last validation check" timestamps.

### 8.2 Mocked connectors (with real industry payload shapes)

- **Finacle CBS** — `/api/mocks/finacle/*` returns Finacle 10.2.25 SOAP-shape JSON for customer profile, accounts, transactions. Admin "Trigger Event" panel fires "new account opening" or "KYC update" events to demonstrate consent enforcement.
- **NPCI** — UPI / AEPS / BBPS webhook simulator. Generates "consent-required event" payloads matching NPCI circular formats.
- **Aadhaar e-KYC** — OTP flow returning UIDAI-shape XML (`<KycRes>` envelope). Real masking applied; only last-4 stored.
- **HRMS / CRM / DMS** — generic CSV / JSON adapters with sample seed data.

### 8.3 Real connectors (free sandboxes)

- **DigiLocker** — API Setu sandbox (developer registration free). OAuth pull URI, document fetch, consent-driven.
- **Account Aggregator** — Sahamati simulator + Setu / Finvu free dev tier. Full Consent Artefact V1.1 + FI Request flow.
- **MeitY National Consent Stack** — not yet released by GoI as of this writing. The connector interface is implemented and a placeholder endpoint is wired with a health check that surfaces "awaiting GoI release"; once published, only the adapter implementation needs to swap. Satisfies RFP §1.A.2 ("should be able to connect to the national consent stack as and when the same is released").

### 8.4 Communication gateways

- **Email**: Resend (free tier, 3 k/mo) — real.
- **SMS / WhatsApp**: simulated in-app outbox (no fully free production option). Same UI as a real outbound queue; clearly labelled.

---

## 9. Portals and UX flows

### 9.1 Public site (`/`)

Landing with DPDP context; live cookie banner demo; published privacy notices with language switcher; **RFP Compliance Matrix** (section 11); architecture overview.

### 9.2 Customer portal (`/me`)

Magic-link login (NextAuth email) or Aadhaar-mock OTP.

1. Dashboard — at-a-glance "N consents, M active, K expiring".
2. **Consents** — list per purpose; one-click withdraw; download artefact (JSON + PDF); history.
3. **Notices** — current + historical versions in chosen language; ack with timestamp.
4. **My Data** — categories held, system of record, retention countdown.
5. **Raise a request** — DSR wizard: access / correction / erasure / grievance / nominate.
6. **Nominees** — manage nominees for incapacity/death (RFP §5.A.3).
7. **Activity log** — every event the bank logged about my data, downloadable.

### 9.3 Compliance portal (`/admin`)

Role-aware sidebar:
- **DPO** — all modules.
- **Privacy Steward** — scope-limited DSR queue, PIAs, DPIAs.
- **Auditor** — audit logs, chain verifier, evidence export, read-only.
- **IT Admin** — connector panel, RBAC, MFA, keys, feature flags.
- **Board** — KPI dashboards only, no PII.

Module shell pattern: list/search → detail with timeline → role-guarded actions → audit trail panel always visible at the bottom. Built with shadcn/ui + Tailwind, TanStack Table, react-hook-form + Zod.

### 9.4 Accessibility (RFP eligibility item: UX for rural / low-literacy users)

- Large-tap-target customer portal.
- "Read aloud" buttons on notices (Web Speech API).
- Iconography + colour for consent state (not text-only).
- Malayalam-first toggle since KSCB is a Kerala bank.

---

## 10. Authentication, RBAC, MFA

- **AuthN**: NextAuth.js — email magic links (Resend) for both customers and staff; Aadhaar-mock OTP available as alternate customer path; AD/SSO stub (RFP §14.1) present and labelled "configure at production".
- **MFA**: TOTP via `otpauth` for all admin roles (RFP §3.4, §3.5). Enforced on first login for any role above customer.
- **Roles**: `dpo`, `privacy_steward`, `branch_user`, `auditor`, `it_admin`, `board`, `customer`. Permissions are tuples of `(resource, action, scope_kind)`. Role-permission map seeded; editable in IT Admin UI.
- **Sessions**: short-lived JWT (15 min) with refresh; session table in DB for revocation.
- **Privileged Access Management (PAM)** stub: `it_admin` actions log a high-priority audit row and require a fresh MFA challenge (RFP §3.5 PAM).

---

## 11. RFP Compliance Matrix (`/rfp-matrix`)

A public page listing every numbered requirement from Annexures I + II (~200 lines). Three columns per row:

- **Status** — RA / CA / NA badge.
- **Demo link** — opens the exact screen or API route that satisfies the line.
- **Evidence link** — opens the artefact, audit chain entry, or connector event log proving it.

Seeded from `db/seed/rfp_matrix.ts` (one row per requirement, hand-tagged). Evaluators click through; the matrix doubles as a navigation index. CI asserts every "demo link" returns 200 for an authorised role.

This is the single highest-leverage feature in the build: most bidders submit a Word table with RA/CA/NA cells; we submit a live, clickable, evidence-backed matrix.

---

## 12. Security and compliance posture

| RFP requirement | POC demonstration |
|---|---|
| Encryption in transit | HTTPS-only (Vercel default); HSTS header set |
| Encryption at rest | Neon-managed (Postgres encrypted at rest); Vercel Blob server-side encryption |
| RBAC + least privilege | `withScope()` + role-permission tuples |
| MFA | TOTP enforced on admin roles |
| Audit logging tamper-evident | Hash-chained `audit_log` + `audit_chain_head` |
| CERT-In / VAPT | OWASP ZAP run locally before submission; report attached |
| Secure SDLC / SBOM, CBOM | `cyclonedx-bom` at build; downloadable from `/admin/sbom` (RFP §17.10) |
| BYOK / CMK | UI placeholder in IT Admin → Keys (RFP §17.35) |
| Source code escrow | Repo + escrow letter template attached (RFP §14, §17.28) |
| DC/DR + data residency | Architecture supports Neon Indian region + Vercel India edge (free tier limitation noted; production-time switch documented) |
| Data localisation | All data in Neon (India region selectable); no external SaaS holds personal data |

---

## 13. Testing strategy

- **Unit**: Vitest. Target 80 % coverage on `/lib` and `/modules/*/services`. Critical paths: hash chain, consent artefact signer/verifier, RBAC scope guard, workflow transitions, SLA computation.
- **Integration**: Vitest + Neon ephemeral branches (`neonctl branches create --parent main`). One branch per CI run, dropped on completion. Tests cover: full consent lifecycle, DSR end-to-end, breach reporting workflow, connector enforcement.
- **E2E**: Playwright smoke on the canonical journeys — customer consent → withdraw → DSR; DPO breach response; admin connector toggle; auditor chain verifier.
- **Compliance Matrix CI assertion**: every requirement row must point to a route that returns 200 for an authorised role.

---

## 14. Deployment and free-tier sizing

| Service | Free-tier reality | POC fit |
|---|---|---|
| Vercel Hobby (Functions, Cron, Blob, Edge Network) | Generous; no money required | Sufficient for demo and evaluator traffic |
| Neon Postgres | 0.5 GB storage, autosuspend after 5 min idle | Demo seed ~30 MB; cold start acceptable |
| Vercel Blob | ~1 GB free | Consent receipts ~5 KB each |
| Vercel Cron | Hobby plan: **once-per-day minimum interval** ([docs](https://vercel.com/docs/cron-jobs/usage-and-pricing)) | One daily batch tick for SLA + breach notifications. Live state computed on-read (no polling). Optional GitHub Actions scheduled workflow shipped commented-out for sub-daily upgrade. |
| Resend | 3 k emails / mo free | Demo plus evaluator notifications well within |
| Vercel AI Gateway | Free tier covers Gemini Flash demo traffic | Admin-side per-tenant cap prevents overshoot |

No paid services. If unexpected scale hits, Neon scales to zero and Vercel Hobby has soft caps that fail closed.

---

## 15. Suggested phasing for implementation

Eleven modules plus cross-cutting concerns is too large for a single implementation plan. Suggested phases for `writing-plans` to slice into separate plans:

| Phase | Scope | Why |
|---|---|---|
| **P0 — Foundation** | Next.js scaffold, Neon + Drizzle, NextAuth + RBAC + MFA, hash-chained audit log, workflow engine, i18n framework, AI gateway client, shadcn baseline, seed scripts, **RFP Compliance Matrix shell** (empty rows, route guard). | Everything else builds on these. The RFP Matrix shell appears first because every later module fills in rows. |
| **P1 — Consent core** | M1 Universal Consent Management, M2 Cookie Consent, M8 Privacy Notices. Customer portal MVP. | This is the heart of DPCMS and the most-visible part of the demo. |
| **P2 — Rights & breach** | M5 Data Principal Rights (DSR full lifecycle), M9 Data Breach Management. SLA timers + cron live. | Workflow-heavy; demonstrates the workflow engine end-to-end. |
| **P3 — Assessments & RoPA** | M3 Data Mapping / RoPA, M6 PIA, M7 DPIA (with AI prefill). | Internal compliance modules. |
| **P4 — Integrations** | M4 connector framework, all mocks (Finacle / NPCI / Aadhaar), real DigiLocker + AA sandboxes, comms outbox. | Most failure-prone area; isolated to one phase. |
| **P5 — Reporting & polish** | M10 dashboards + reports, M11 research repository, accessibility pass, SBOM/CBOM export, VAPT pre-flight. | Final coat. |

Each phase ends with the RFP Compliance Matrix updated and CI green on the per-phase requirement assertions.

---

## 16. Non-goals (explicit)

- Real Finacle CBS / NPCI / Aadhaar production integrations.
- Real CERT-In or RBI audit certification.
- Real DC/DR provisioning at Bank or MeitY-empanelled cloud.
- Real production-scale data volume.
- Source-code escrow execution (template provided; execution is contract-time).

These are intentional non-goals for the POC. The architecture is designed so each becomes a contract-time activity rather than a redesign.

---

## 17. Open items for the user before plan-time

These are not blockers (no fixed deadline was set), but they shape the P0 plan:

1. Preferred deploy URL (e.g. `dpcms-kscb.vercel.app`) and any branding constraints (logo, colour palette aligned to KSCB).
2. Whether you'll register the developer sandboxes for **DigiLocker** (API Setu) and **Account Aggregator** (Sahamati/Setu/Finvu) under your KSUM-registered startup. Both are free but require sign-up; without them, those connectors fall back to mocked-with-real-payload-shape.
3. Whether the demo should support evaluators playing the role of a real Data Principal (signing in, raising DSRs themselves) or a scripted walkthrough on pre-seeded users. Default is "both" — login with magic link + a pre-seeded "demo customer" account.
4. Optional bonus: a domain (instead of `.vercel.app`) — costs ~₹800/yr; out of free budget but high evaluator impact. Skip if strict zero-spend.
