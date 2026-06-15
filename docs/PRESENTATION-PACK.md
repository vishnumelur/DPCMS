# DPCMS — KSCB Physical Presentation Pack

> **Tender:** RFP `KBIT/PMU/DPCMS/088/25-26` — Data Privacy & Consent Management System
> **Bidder:** (your KSUM-registered startup)
> **Status:** Shortlisted → physical presentation
> **Evaluation:** QCBS 70 (Technical) : 30 (Commercial)
> **Live demo:** https://dpcms-sigma.vercel.app · `dpcmsadmin` / `dpcms@2026`
> **One-line:** We are the only bidder walking in with a *live, clickable, DPDP-native system* where every RFP requirement maps to a working screen and an evidence link.

This pack has four parts:
1. **How we win** — our differentiators and the message to land.
2. **Execution plan** — POC → production delivery (phases, timeline, team, infra, security).
3. **Commercial bid** — QCBS-aligned pricing model (fill in your costed numbers).
4. **The presentation itself** — flow, live-demo script, Q&A defence, the "amaze" moments.

---

## PART 1 — HOW WE WIN (positioning)

### The single message
> "Every other bidder is presenting *what they will build*. We are presenting *what already works* — and showing you the evidence behind every requirement, live, right now."

### Our 7 differentiators (lead with these)

| # | Differentiator | Why evaluators care | Proof in the room |
|---|---|---|---|
| 1 | **Live, clickable RFP Compliance Matrix** | Most bids submit a Word table of RA/CA/NA claims. We submit a *navigable, evidence-backed* matrix — RA where built, CA for integration/infra (honest, not over-claimed). | Open `/rfp-matrix`, click any row → lands on the exact working screen + audit evidence. |
| 2 | **DPDP-native, not retrofitted** | DPDP Act 2023 + DPDP Rules 2025 are the entire reason for this tender. | Consent lifecycle, breach 72h clock, DSR SLA timers, data-principal rights, minor/guardian consent (§9) all built in. |
| 3 | **DEPA / MeitY Consent-Stack compatible** | Government wants future interoperability with the National Consent Stack. | JWS RS256-signed Consent Artefact v1.1; public verification key endpoint; MeitY adapter pre-wired ("ready when GoI publishes"). |
| 4 | **Tamper-evident, audit-ready by design** | Cooperative banks answer to RBI / NABARD / CERT-In audits. | Hash-chained immutable audit log — recompute the chain *live* on `/admin/audit` and prove integrity in front of them. |
| 5 | **Malayalam-first, 22 Schedule-8 languages** | KSCB is a Kerala bank serving rural / multilingual / low-literacy customers. | Switch the public site to Malayalam live; "read-aloud" on notices; live AI translation of a notice into any of 22 languages. |
| 6 | **Kerala startup, KSUM-backed — local, accountable, fast** | KSUM partnership + state-startup preference; on-the-ground support. | We are based here, support is local, and we strengthen Kerala's startup ecosystem the tender is meant to nurture. |
| 7 | **Capital-efficient & low-risk** | A working system already exists at ₹0 build cost — they are buying *hardening + integration + run*, not a science project. | The whole POC runs today on free infrastructure. Risk of "vapourware" is zero. |

### Re-frame the obvious objection before they raise it
The POC runs on free tier (Vercel/Neon) with mocked CBS/NPCI/Aadhaar connectors. **Say this first, on your terms:**
> "The demo runs on free infrastructure so you can verify every claim today at zero risk. For production we move to India-region, MeitY-empanelled hosting with full DC/DR, and we swap each simulated connector for the live one — the connector interfaces are already built and tested against the real payload shapes. This is a *configuration and integration* effort at contract time, not a redesign."

That sentence converts your biggest weakness into proof of engineering maturity. Honesty about mocks = credibility.

---

## PART 2 — EXECUTION PLAN (POC → Production)

The architecture was deliberately designed so production is *hardening + integration*, not a rebuild. Here is the delivery programme to present.

### 2.1 What is already done (de-risked)
- All 11 functional modules (M1–M11) + cross-cutting (RBAC, MFA, audit, i18n, AI, workflow engine) — **built and live**.
- Highest-value RFP requirements across all 17 functional sections demonstrable **live**; the full Annexure I & II row-by-row RA/CA/NA response is prepared for the written bid (no blank rows — a blank = "Not Possible" per the RFP).
- 60 unit tests + 20 E2E tests passing; CI pipeline green.
- Connector framework with 6 connectors built to **real industry payload shapes** (Finacle 10.2.25, NPCI UPI/AEPS/BBPS, UIDAI e-KYC XML, DigiLocker, Sahamati AA ReBIT 1.1.2, MeitY stack).
- DEPA-compatible signed consent artefacts, hash-chained audit, SBOM/CBOM export (CycloneDX 1.5).

### 2.2 What production adds (the contract scope)

| Phase | Duration | Deliverables |
|---|---|---|
| **P0 — Mobilisation** | Weeks 0–2 | Contract sign-off, project charter, requirement-traceability sign-off against final RFP, sandbox registrations (DigiLocker/API Setu, AA — Sahamati/Setu/Finvu), KSCB AD/SSO details, data-classification workshop. |
| **P1 — Production infrastructure** | Weeks 2–6 | Migrate from free tier to **India-region, data-localised** hosting (MeitY-empanelled CSP or Bank DC); production Postgres with encryption-at-rest, PITR backups; **DC + DR** with documented RPO/RTO; HA configuration; secrets/KMS (BYOK/CMK). |
| **P2 — Live integrations** | Weeks 4–10 (parallel) | Finacle CBS (consent enforcement on account/KYC events); NPCI event ingestion; Aadhaar e-KYC via a **licensed AUA/KUA** path; DigiLocker (API Setu prod); Account Aggregator (prod FI flow); SMS/WhatsApp gateway; Resend→production email domain. Each connector swaps `mode=mock`→`live`. |
| **P3 — Security & compliance hardening** | Weeks 8–12 | Independent **VAPT** + remediation; **CERT-In empanelled audit**; PAM hardening; pen-test of audit immutability; source-code escrow execution; security documentation; alignment to RBI/NABARD cyber-security framework for cooperative banks. |
| **P4 — Data migration, UAT & training** | Weeks 10–14 | RoPA discovery across KSCB systems; historical consent/data mapping; role-based UAT with DPO/Stewards/Auditors/Branch users; admin + branch + DPO training; Malayalam user guides; accessibility (GIGW) conformance. |
| **P5 — Go-live & stabilisation** | Weeks 14–16 | Phased go-live (pilot branches → all branches), hypercare, runbook handover, board-pack reporting live. |
| **O&M — AMC** | Contract term (**5 yrs**, per RFP §18) | L1/L2/L3 support with SLA; **2 L2 on-site FM resources at the Bank, 9 am–7 pm** (§12); **regulatory-change management free for 5 years from Go-live** (§4); periodic VAPT + DR drills; managed hosting; enhancements pool. |

> **Maps to RFP §7 milestones:** PO (**T**) → agreement + implementation plan (**T+1 mo**) → infra setup, install & config (**T+2 mo**) → UAT/VAPT (**T+2.5 mo**) → **Go-live (T+3 mo)** → stabilisation & final acceptance (**T+4 mo**). The phase-weeks above fit inside this envelope.
>
> **Headline:** Production go-live by **T+3 months** — we meet *your* schedule because the functional build already exists.

### 2.3 Architecture at production scale
- Modular monolith today → each module is **extractable to its own service** without business-logic rewrite (module-isolated DB namespaces + service interfaces already enforce this). Present this as a *deliberate, cost-aware* answer to RFP §3.2's "microservices" ask: microservice-*ready*, not microservice-*overengineered* for day one.
- API-first; every mutation audited inside the same transaction (`withAudit`); RBAC scope injection (`withScope`) on every personal-data query.
- Data residency: all personal data in India region; no external SaaS holds PII.

### 2.4 Team & governance (present an org chart)
- Project Manager / SPOC (single point of contact for KSCB)
- Tech Lead + 2–3 Full-stack Engineers
- DevSecOps / Cloud Engineer
- DPO-domain / Compliance SME (DPDP)
- QA / Test Engineer
- UX / Malayalam localisation
- (Partner) CERT-In empanelled auditor for VAPT
- **On-site Facility Management: minimum 2 L2 resources stationed at the Bank, 9 am–7 pm (RFP §12)**, extended hours on exigency

Governance: weekly steering call, fortnightly demo, requirement-traceability matrix maintained throughout, change-control board.

> **Eligibility-aligned expertise (RFP §5) — name a person against each in your org chart:** API aggregation & orchestration · AI/ML & NLP · cybersecurity & compliance · UX for rural / low-literacy users.

---

## PART 3 — COMMERCIAL BID (QCBS 70:30)

> **IMPORTANT — fill these in before printing:**
> 1. The figures below are the **internal cost / expense base** only (an illustrative model, not quotes). The **final submitted price is set separately by management at sign-off** — leave the final BoQ totals open until then.
> 2. Check the RFP for an **indicative budget / estimated value ceiling** and the **exact commercial-bid format (BoQ)** — bid in their format or you risk disqualification.
> 3. **Contract duration is 5 years** (RFP §18) — cost is evaluated as Total Contract Value over the full 5 years, **plus associated infrastructure cost** added for the Total Project Cost (RFP §6). The model is **CAPEX** (RFP §3.2), not a SaaS subscription.
> 4. Confirm **GST treatment** and whether prices are inclusive/exclusive.

### 3.1 How QCBS 70:30 scoring works (and what it means for your number)
- Technical score = 70% of the weight. **You should win the technical score outright** because you have a live system — that is your moat.
- Commercial score = 30%. The lowest bid (L1) gets full commercial marks; others get `30 × (L1 / your price)`.
- **Strategy:** Don't bid rock-bottom — you don't need to, and a too-low number signals you can't sustain support for a bank. Bid a *fair, defensible* price; your 70% technical lead carries you. Being mid-pack on cost while #1 on quality wins QCBS.

### 3.2 Commercial structure (recommended Bill of Quantities)

> **CAPEX model (RFP §3.2):** the Bank makes a one-time capital purchase and **owns** the platform, licences, data and configurations — this is *not* a per-user SaaS subscription. Structure = one-time capital cost (A) + annual AMC/hosting (B) across the 5-year term + associated infrastructure (per §6).

**A. One-time (implementation / capital) costs**

| Line item | Basis | Illustrative ₹ |
|---|---|---|
| A1. Platform software licence — **perpetual / CAPEX** (DPCMS, all 11 modules) | Enterprise, KSCB-wide, Bank-owned | _____ |
| A2. Implementation, configuration & customisation to KSCB | Fixed | _____ |
| A3. Integrations — Finacle CBS, NPCI, Aadhaar (AUA/KUA), DigiLocker, Account Aggregator, comms gateways | Per connector / bundle | _____ |
| A4. Data migration + RoPA discovery across KSCB systems | Fixed | _____ |
| A5. Security: VAPT + CERT-In audit + remediation | Fixed (incl. partner) | _____ |
| A6. Training, documentation, change management (Malayalam) | Fixed | _____ |
| A7. DC/DR setup, data-localisation, BYOK/KMS provisioning | Fixed | _____ |
| **Subtotal — One-time** | | **_____** |

**B. Recurring (annual) costs — quote per year for the full contract term**

| Line item | Basis | Illustrative ₹/yr |
|---|---|---|
| B1. AMC — support (L1/L2/L3), bug-fix, updates, regulatory-change management | % of licence (typ. 15–18%) | _____ |
| B2. Managed hosting / infrastructure (India region, HA + DR) | Annual | _____ |
| B3. Per-consumption (Aadhaar e-KYC, SMS/WhatsApp, AA) pass-through | At actuals / slab | _____ |
| **Subtotal — Recurring (× N years)** | | **_____** |

**C. Total Contract Value (for QCBS cost evaluation)**
`TCV = A (one-time) + (B × 5 years) + associated infrastructure cost` — present as a clear single evaluated number plus the year-by-year breakup. (RFP §6 note: associated infrastructure costs are added for the Total Project Cost calculation.)

### 3.3 Cost-base envelope (internal reference only)
For a state apex cooperative bank DPDP platform, the underlying delivery cost base typically sits around:
- One-time: **₹45–75 lakh**
- Annual recurring (AMC + hosting): **₹18–30 lakh/year**
- 5-year cost base: **≈ ₹1.4–2.2 crore**

> These are internal planning ranges to size your own expense base — **not** the figure to submit. The final commercial number is determined by management before submission and entered into the RFP's BoQ format at that point. As a KSUM startup your cost base is lean, which leaves healthy room on a quality-led (70%) evaluation.

### 3.4 Commercial talking points
- "Our build efficiency (a working system already exists) means lower implementation risk and a lower price than competitors who must build from scratch."
- "AMC includes **regulatory-change management** — when DPDP Rules evolve or the MeitY National Consent Stack launches, you are covered, not re-quoted."
- "Hosting is India-region and data-localised — no cross-border data, no surprise compliance cost later."

---

## PART 4 — THE PRESENTATION (run of show)

### 4.1 Suggested structure (~25–30 min + Q&A)

| Min | Segment | Goal |
|---|---|---|
| 0–2 | **Open with the hook** | "Rather than tell you what we'll build, let us show you what already works." Put the live URL on screen. |
| 2–5 | **Who we are** | Kerala / KSUM startup, DPDP focus, the team. Local + accountable. |
| 5–8 | **The problem & our approach** | DPDP Act 2023 obligations for KSCB; our DPDP-native architecture in one diagram. |
| 8–20 | **LIVE DEMO (the centrepiece)** | The golden-path script below. This is where you win. |
| 20–24 | **Execution plan** | The RFP §7 milestone roadmap (Go-live **T+3 mo**) + team (incl. 2 on-site FM) + security/DC-DR/VAPT. De-risk. |
| 24–27 | **Commercial** | QCBS framing; CAPEX, 5-year; value-for-money; TCV breakup. |
| 27–30 | **Close** | Restate: live working system, Kerala-startup, low-risk. Ask for the win. |
| 30+ | **Q&A** | See defence prep below. |

### 4.2 Live-demo golden path (rehearse this end-to-end; ~10–12 min)
Run it as one continuous story: *a customer gives consent → exercises rights → a breach happens → the bank proves compliance.* Have it pre-loaded; have screenshots as offline fallback in case of network.

1. **RFP Matrix first** (`/rfp-matrix`) — "Your requirements across all 17 sections, each row clickable to live evidence." Click one row to jump into the app. *(Sets the frame: this is real.)*
2. **Public site in Malayalam** — toggle language live; show the cookie consent banner; "read aloud" a privacy notice. *(Kerala fit + accessibility.)*
3. **Customer portal (`/me`)** — grant a consent for a purpose → **download the JWS-signed consent artefact** (open it, show the signature). Then **withdraw** consent in one click and show the new artefact + history (prior one never mutated). *(DEPA/MeitY compatibility + data-principal control.)*
4. **Raise a DSR** as the customer (access/erasure) → switch to **DPO queue** showing the request with a **green/amber/red SLA timer** auto-computed against the DPDP 30-day clock. *(Rights + workflow engine.)*
5. **Breach management** — open a breach incident → show the **72-hour DPB reporting countdown** → generate the **DPB report PDF** with KSCB letterhead. *(DPDP Rules 2025 readiness.)*
6. **The "wow": live audit-chain verification** (`/admin/audit`) — recompute the hash chain in front of them; everything you just did is in a tamper-evident log. *(This is the moment that lands — let it breathe.)*
7. **Integrations panel** — show the 6 connectors, toggle a Finacle "new account opening" event → watch consent enforcement fire. Explain mock-now / live-at-production honestly.
8. **Reporting / SBOM** — board KPI dashboard; download the CycloneDX SBOM. *(Security-SDLC maturity for the auditors in the room.)*

### 4.3 The three "amaze" moments — make sure these happen
1. **Click-through RFP matrix** → "no other bidder can do this."
2. **Live Malayalam + read-aloud** → emotional, Kerala-specific, accessibility.
3. **Live audit-chain recompute** → undeniable proof of tamper-evidence; auditors love this.

### 4.4 Q&A defence (prep answers — these *will* come up)

| Likely question | Your answer |
|---|---|
| "It's on free hosting / mocked CBS — is this production-ready?" | "The demo is on free infra so you can verify everything at zero risk. Production moves to India-region MeitY-empanelled hosting with DC/DR; each connector swaps mock→live against interfaces already built to the real payload shapes. 16 weeks to go-live — see the plan." |
| "RFP asks for microservices; this is a monolith." | "It's a *modular* monolith with module-isolated data and service interfaces — each module is extractable to its own service with no business-logic rewrite. We chose microservice-*ready* over microservice-overengineered to cut cost and risk. We can deploy split services if you require it." |
| "How do you handle Aadhaar legally?" | "Via a licensed AUA/KUA partner at production; the e-KYC interface and UIDAI XML handling are already built. We store only hashed identifiers + last-4 — DPDP minimisation by design." |
| "Data residency / localisation?" | "All personal data stays in India region; no external SaaS holds PII. BYOK/CMK supported. Encryption in transit and at rest." |
| "Audit / RBI / NABARD / CERT-In?" | "Tamper-evident hash-chained audit (just demonstrated), RBAC + MFA + PAM, SBOM/CBOM, independent VAPT + CERT-In audit in the delivery plan, source-code escrow." |
| "Are you big enough to support a state bank?" | "We're a focused Kerala/KSUM startup — local, fast, accountable, with a defined SLA and L1/L2/L3 support. You get senior engineers, not a ticket queue. Escrow protects continuity." |
| "What if DPDP Rules change / MeitY stack launches?" | "Regulatory-change management is inside AMC. The MeitY Consent Stack adapter is already wired — we enable it when GoI publishes, no re-quote." |
| "Why should price not be the deciding factor?" | "This is QCBS 70:30 — quality-led. We lead on quality with a working system, and our build efficiency keeps our price fair. Best value, lowest risk." |

### 4.5 Logistics checklist (physical presentation)
- [ ] Laptop + charger; HDMI/VGA + adapters; clicker.
- [ ] **Offline fallback**: full screenshot deck of the golden path (the `tour-*.png` / `walk-*.png` you already captured) in case venue Wi-Fi fails.
- [ ] Mobile hotspot as network backup.
- [ ] Pre-load the live site, sign in, and pre-seed a demo customer *before* you walk in.
- [ ] Printed leave-behinds: 1-page exec summary (live URL + differentiators), the execution timeline, the commercial BoQ.
- [ ] Rotate the demo password if the URL/creds were ever shared publicly; have a fresh evaluator login ready.
- [ ] Decide speaker roles: 1 narrator + 1 driver (don't present and click simultaneously).
- [ ] Time-box the demo; rehearse the golden path at least twice end-to-end.

---

## QUICK CHECKLIST BEFORE TOMORROW
- [ ] Commercial BoQ filled with real numbers, in the RFP's format, GST clarified, term confirmed.
- [ ] Execution slide (RFP §7 milestone plan, Go-live T+3 mo + team org chart incl. 2 on-site FM resources).
- [ ] Differentiator slide (the 7).
- [ ] Golden-path demo rehearsed twice; offline screenshots ready.
- [ ] Q&A defence answers internalised by whoever fields questions.
- [ ] Leave-behinds printed.
- [ ] Live URL up, signed in, demo data seeded, password rotated.
</content>
</invoke>
