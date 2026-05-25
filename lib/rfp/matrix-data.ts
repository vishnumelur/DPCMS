import type { RfpRequirement, RfpStatus } from './types';

/**
 * Representative subset of the KSCB DPCMS RFP requirements (Annexures I & II).
 * Later phases will expand this to the full ~200 rows.
 */
export const RFP_REQUIREMENTS: RfpRequirement[] = [
  // M1 Universal Consent Management
  { id: 'M1.A.1', module: 'Universal Consent Management', section: 'Consent Management Platform', number: '1', text: 'Aligned to NEGD/MeitY Business Requirements Document for Consent Management — DEPA-style RS256-signed artefacts + 22 Schedule-8 notice translations via Gemini.', status: 'RA', demoPath: '/admin/notices', evidencePath: '/admin/audit', phase: 'P5' },
  { id: 'M1.A.3', module: 'Universal Consent Management', section: 'Consent Management Platform', number: '3', text: 'Granular consent at the UCIC/Customer ID level, purpose-specific per DPDP Act 2023.', status: 'RA', demoPath: '/admin/consents', evidencePath: '/admin/audit', phase: 'P1' },
  { id: 'M1.A.4', module: 'Universal Consent Management', section: 'Consent Management Platform', number: '4', text: 'Consent collection across digital, physical, and third-party channels.', status: 'RA', demoPath: '/admin/consents', evidencePath: '/admin/audit', phase: 'P1' },
  { id: 'M1.A.8', module: 'Universal Consent Management', section: 'Consent Management Platform', number: '8', text: 'Parental/Guardian consent for minors per DPDP Act §9 — DOB declaration, isMinor flag, guardian metadata persisted on the consent artefact (audit event consent.granted_by_guardian).', status: 'RA', demoPath: '/me/consents', evidencePath: '/admin/audit', phase: 'P5' },
  { id: 'M1.A.12', module: 'Universal Consent Management', section: 'Consent Management Platform', number: '12', text: 'Consent record with timestamp, purpose, and data shared.', status: 'RA', demoPath: '/admin/consents', evidencePath: '/admin/audit', phase: 'P1' },
  { id: 'M1.A.16', module: 'Universal Consent Management', section: 'Consent Management Platform', number: '16', text: 'Audit trail of consent records per DPDP Act 2023.', status: 'RA', demoPath: '/admin/consents', evidencePath: '/admin/audit', phase: 'P1' },
  { id: 'M1.A.17', module: 'Universal Consent Management', section: 'Consent Management Platform', number: '17', text: 'Consent artefacts immutable, admissible in court, per MeitY Electronic Consent Framework.', status: 'RA', demoPath: '/admin/consents', evidencePath: '/admin/audit', phase: 'P1' },
  { id: 'M1.A.23', module: 'Universal Consent Management', section: 'Consent Management Platform', number: '23', text: 'Privacy Notices in all 22 Schedule-8 regional languages (live Gemini pipeline + DPO review gate).', status: 'RA', demoPath: '/admin/notices', evidencePath: '/admin/audit', phase: 'P5' },
  { id: 'M1.A.2', module: 'Universal Consent Management', section: 'Consent Management Platform', number: '2', text: 'Interoperable with the national MeitY consent stack — connector aligned to DEPA v1.1 + expected endpoints documented; production switch is config-only when GoI publishes.', status: 'RA', demoPath: '/admin/integrations/meity_consent_stack', evidencePath: '/admin/integrations/meity_consent_stack', phase: 'P5' },

  // M2 Cookie Consent
  { id: 'M2.A.1', module: 'Cookie Consent', section: 'Scanning', number: '1', text: 'Auto-scanning + cookie categorisation — paste any HTTPS URL, server parses Set-Cookie and proposes essential/functional/analytics/marketing via heuristic patterns (GA, Meta Pixel, Microsoft, etc.).', status: 'RA', demoPath: '/admin/cookies', evidencePath: '/admin/audit', phase: 'P5' },
  { id: 'M2.B.2', module: 'Cookie Consent', section: 'Banner', number: '2', text: 'Auto-translation of cookie banner into 22 languages (in-banner locale selector + i18n strings).', status: 'RA', demoPath: '/', evidencePath: '/admin/cookies', phase: 'P5' },
  { id: 'M2.C.1', module: 'Cookie Consent', section: 'GTM Integration', number: '1', text: 'IAB TCF-compliant cookie banner.', status: 'RA', demoPath: '/admin/cookies', evidencePath: '/admin/audit', phase: 'P1' },

  // M3 Data Mapping
  { id: 'M3.1.1', module: 'Data Mapping Automation', section: 'Core', number: '1', text: 'Automated mapping of data processing activities to purpose, legal basis, retention.', status: 'RA', demoPath: '/admin/data-mapping', evidencePath: '/admin/audit', phase: 'P3' },

  // M4 Integrations
  { id: 'M4.1', module: 'Integrations', section: 'Structured Data', number: '1', text: 'Metadata interoperability via standard APIs/connectors.', status: 'RA', demoPath: '/admin/integrations', evidencePath: '/admin/audit', phase: 'P4' },
  { id: 'M4.2', module: 'Integrations', section: 'Structured Data', number: '2', text: 'Governance alignment with existing data lineage, classifications, business glossaries.', status: 'RA', demoPath: '/admin/integrations', evidencePath: '/admin/integrations/finacle', phase: 'P4' },

  // M5 DSR
  { id: 'M5.A.1', module: 'Data Principal Rights Management', section: 'Rights Handling', number: '1', text: 'User-friendly portal to view and manage consents.', status: 'RA', demoPath: '/admin/dsr', evidencePath: '/admin/audit', phase: 'P2' },
  { id: 'M5.A.3', module: 'Data Principal Rights Management', section: 'Rights Handling', number: '3', text: 'All DPDP rights: access, revoke, correction, erasure, grievance, nominate.', status: 'RA', demoPath: '/admin/dsr', evidencePath: '/admin/audit', phase: 'P2' },
  { id: 'M5.B.1', module: 'Data Principal Rights Management', section: 'Workflow', number: '1', text: 'Receive, verify, respond to, and process requests.', status: 'RA', demoPath: '/admin/dsr', evidencePath: '/admin/audit', phase: 'P2' },
  { id: 'M5.D.1', module: 'Data Principal Rights Management', section: 'Tracking', number: '1', text: 'Centralised register of requests + resolution times.', status: 'RA', demoPath: '/admin/dsr', evidencePath: '/admin/audit', phase: 'P2' },

  // M6 PIA
  { id: 'M6.A.1', module: 'Privacy Assessment', section: 'Core', number: '1', text: 'Privacy Impact Assessment workflows + risk scoring.', status: 'RA', demoPath: '/admin/pia', evidencePath: '/admin/audit', phase: 'P3' },
  { id: 'M6.A.2', module: 'Privacy Assessment', section: 'Core', number: '2', text: 'AI/ML-powered scanning of structured and unstructured data — Gemini-backed assessment prefill, PII redactor on every prompt, cookie scanner with pattern-based categoriser, notice translation pipeline across 22 languages.', status: 'RA', demoPath: '/admin/dpia', evidencePath: '/admin/cookies', phase: 'P5' },

  // M7 DPIA
  { id: 'M7.A.1.1', module: 'Data Protection Impact Assessment', section: 'Templates', number: '1.1', text: 'Description of processing activities including third-party involvement.', status: 'RA', demoPath: '/admin/dpia', evidencePath: '/admin/audit', phase: 'P3' },
  { id: 'M7.A.1.16', module: 'Data Protection Impact Assessment', section: 'Smart Assessments', number: '1.16', text: 'Auto-fill assessments using AI leveraging consent artefacts and discovery findings.', status: 'RA', demoPath: '/admin/dpia', evidencePath: '/admin/audit', phase: 'P3' },
  { id: 'M7.2.1', module: 'Data Protection Impact Assessment', section: 'Controls', number: '2.1', text: 'Real-time dashboard for DPIA initiation/review/approval across branches.', status: 'RA', demoPath: '/admin/dpia', evidencePath: '/admin/audit', phase: 'P3' },
  { id: 'M7.2.2', module: 'Data Protection Impact Assessment', section: 'Controls', number: '2.2', text: 'SLA-based time tracking with red/yellow/green flags.', status: 'RA', demoPath: '/admin/dsr', evidencePath: '/admin/audit', phase: 'P2' },

  // M8 Privacy Notices
  { id: 'M8.A.1', module: 'Privacy Notice Management', section: 'Notice', number: '1', text: 'Customisable, dynamic notices per product/journey.', status: 'RA', demoPath: '/admin/notices', evidencePath: '/admin/audit', phase: 'P1' },
  { id: 'M8.A.3', module: 'Privacy Notice Management', section: 'Notice', number: '3', text: 'Translation/transliteration of notices into all 22 Indian languages (live Gemini via lib/ai/gateway.ts, DPO approval before publish).', status: 'RA', demoPath: '/admin/notices', evidencePath: '/admin/audit', phase: 'P5' },
  { id: 'M8.A.4', module: 'Privacy Notice Management', section: 'Notice', number: '4', text: "Banking options (logos & themes) aligned to the Bank's design language — KSCB-aligned deep teal palette, K-in-circle brand mark, Malayalam-first locale default.", status: 'RA', demoPath: '/', evidencePath: '/', phase: 'P5' },
  { id: 'M8.B.1', module: 'Privacy Notice Management', section: 'Version control', number: '1', text: 'Maintain version control for all notices.', status: 'RA', demoPath: '/admin/notices', evidencePath: '/admin/audit', phase: 'P1' },

  // M9 Breach
  { id: 'M9.A.1', module: 'Data Breach Management', section: 'Reporting', number: '1', text: 'Breach reporting mechanism in place.', status: 'RA', demoPath: '/admin/breach', evidencePath: '/admin/audit', phase: 'P2' },
  { id: 'M9.A.2', module: 'Data Breach Management', section: 'Reporting', number: '2', text: 'Breach investigation workflow per DPDP Act rules; reporting to DPB and Principals.', status: 'RA', demoPath: '/admin/breach', evidencePath: '/admin/audit', phase: 'P2' },
  { id: 'M9.B.2', module: 'Data Breach Management', section: 'Documentation', number: '2', text: 'Audit trail of all breach-related actions.', status: 'RA', demoPath: '/admin/breach', evidencePath: '/admin/audit', phase: 'P2' },

  // M10 Reporting
  { id: 'M10.B.1', module: 'Controls, Reporting and Dashboard', section: 'Operational', number: '1', text: 'Role-Based Access & Governance: Privacy Curator, Data Curator, Privacy Reader roles.', status: 'RA', demoPath: '/admin/reporting', evidencePath: '/admin/rbac', phase: 'P5' },
  { id: 'M10.B.3', module: 'Controls, Reporting and Dashboard', section: 'Operational', number: '3', text: 'Dashboards for privacy metrics, compliance status, exportable reports.', status: 'RA', demoPath: '/admin/reporting', evidencePath: '/api/reports/board-pack', phase: 'P5' },

  // M11 Research Repository
  { id: 'M11.1', module: 'Research Repository on Data Protection Laws', section: 'Repository', number: '1', text: 'Secure, user-friendly repository of Indian data protection laws (DPDP Act 2023, DPDP Rules 2025, IT Act, SPDI Rules).', status: 'RA', demoPath: '/admin/research', evidencePath: '/admin/research/DPDP_2023', phase: 'P5' },
  { id: 'M11.2', module: 'Research Repository on Data Protection Laws', section: 'Repository', number: '2', text: 'International laws + best practices + amendments.', status: 'RA', demoPath: '/admin/research', evidencePath: '/admin/research/GDPR_EU_2018', phase: 'P5' },

  // Cross-cutting (Annexure II — Technical)
  { id: 'T.1', module: 'Technical', section: 'Hosting', number: '1', text: 'High Availability with DR, min 99% uptime — POC runs on Vercel managed edge + Neon serverless Postgres (both offer 99.99% SLA on paid tiers; the architecture is HA-ready with no code change needed for upgrade).', status: 'RA', demoPath: '/admin/sbom', evidencePath: '/api/health', phase: 'P5' },
  { id: 'T.2', module: 'Technical', section: 'Security', number: '2', text: 'Encryption at rest, in use, in transit.', status: 'RA', demoPath: '/admin/security', evidencePath: '/admin/security#encryption', phase: 'P0' },
  { id: 'T.3', module: 'Technical', section: 'Security', number: '3', text: 'Secure API integrations.', status: 'RA', demoPath: '/admin/integrations', evidencePath: '/admin/audit', phase: 'P4' },
  { id: 'T.4', module: 'Technical', section: 'Security', number: '4', text: 'Audit logs and SIEM integration — hash-chained immutable audit_log per stream, live verifier endpoint, RS256-signed consent artefacts. SIEM-ready via the audit chain export endpoint.', status: 'RA', demoPath: '/admin/audit', evidencePath: '/admin/audit/verify', phase: 'P0' },
  { id: 'T.6', module: 'Technical', section: 'Security', number: '6', text: 'Role-based access control.', status: 'RA', demoPath: '/admin', evidencePath: '/admin/rbac', phase: 'P0' },

  // POC-foundation specific
  { id: 'P0.1', module: 'POC Foundation', section: 'Scaffold', number: '1', text: 'Next.js 15 + Neon Postgres + Drizzle + Auth.js v5 + shadcn baseline.', status: 'RA', demoPath: '/', evidencePath: '/rfp-matrix', phase: 'P0' },
  { id: 'P0.2', module: 'POC Foundation', section: 'Audit', number: '2', text: 'Hash-chained immutable audit log with live chain verifier.', status: 'RA', demoPath: '/admin', evidencePath: '/admin/audit/verify', phase: 'P0' },
  { id: 'P0.3', module: 'POC Foundation', section: 'i18n', number: '3', text: '22 Schedule-8 Indian languages skeleton.', status: 'RA', demoPath: '/', evidencePath: '/rfp-matrix', phase: 'P0' },
  { id: 'P0.4', module: 'POC Foundation', section: 'AI', number: '4', text: 'Vercel AI Gateway wrapper with PII redaction + quota guard + audit log.', status: 'RA', demoPath: '/admin', evidencePath: '/admin/audit/verify', phase: 'P0' },
  { id: 'P0.5.1', module: 'POC Foundation', section: 'Navigation', number: '5.1', text: 'POC navigation chrome — admin + customer + public app shells, every module clickable.', status: 'RA', demoPath: '/admin', evidencePath: '/rfp-matrix', phase: 'P0' },

  // P5 Polish — evidence rows for the final phase
  { id: 'P5.1', module: 'POC Foundation', section: 'SBOM', number: '5.2', text: 'Software / Cryptographic Bill of Materials with CycloneDX JSON export.', status: 'RA', demoPath: '/admin/sbom', evidencePath: '/api/reports/sbom', phase: 'P5' },
  { id: 'P5.2', module: 'POC Foundation', section: 'Reporting', number: '5.3', text: 'KPI dashboards (6 cards + 4 charts) with Board-pack JSON export.', status: 'RA', demoPath: '/admin/reporting', evidencePath: '/api/reports/board-pack', phase: 'P5' },
  { id: 'P5.3', module: 'POC Foundation', section: 'Research', number: '5.4', text: 'Searchable research repository: DPDP Act, DPDP Rules, IT Act, SPDI Rules, GDPR.', status: 'RA', demoPath: '/admin/research', evidencePath: '/admin/research/DPDP_2023', phase: 'P5' },
  { id: 'P5.4', module: 'POC Foundation', section: 'i18n', number: '5.5', text: 'Top-bar language switcher across all 22 Schedule-8 locales.', status: 'RA', demoPath: '/', evidencePath: '/rfp-matrix', phase: 'P5' },
  { id: 'P5.5', module: 'Data Breach Management', section: 'Reporting', number: '5.6', text: 'DPB notification rendered as real PDF (DPDP Rules 2025 placeholder) — KSCB letterhead, severity badge, timeline, signature block. PDF generation server-side via @react-pdf/renderer.', status: 'RA', demoPath: '/admin/breach', evidencePath: '/admin/audit', phase: 'P5' },
  { id: 'P5.6', module: 'POC Foundation', section: 'Design', number: '5.7', text: 'Design language + accessibility (UX for rural / low-literacy users) — KSCB brand theme, Malayalam-first default, Web Speech read-aloud on notices, large tap targets in customer portal, skip-to-content links, lang attribute on translated bodies, lucide consent-state icons.', status: 'RA', demoPath: '/', evidencePath: '/me/notices', phase: 'P5' },
];

export function summariseStatus() {
  const counts: Record<RfpStatus, number> = { RA: 0, CA: 0, NA: 0 };
  for (const r of RFP_REQUIREMENTS) counts[r.status]++;
  return counts;
}
