/**
 * Question templates for Privacy Impact Assessments (M6 PIA) and Data
 * Protection Impact Assessments (M7 DPIA). The DPIA template is a superset of
 * the PIA template plus the high-risk-processing questions called out in the
 * DPDP Rules 2025 draft.
 *
 * Each question is rendered as a textarea + a 0–5 score selector. Scores are
 * combined with `weight` in modules/assessment/scoring.ts to produce a final
 * risk score on a 0–100 scale.
 */
export type AssessmentQuestion = {
  key: string;
  label: string;
  helpText: string;
  weight: 1 | 2 | 3;
};

export type AssessmentKind = 'pia' | 'dpia';

export const ASSESSMENT_KINDS: readonly AssessmentKind[] = ['pia', 'dpia'] as const;

export const ASSESSMENT_STATUSES = [
  'draft',
  'in_review',
  'approved',
  'rejected',
] as const;
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

export const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const PIA_TEMPLATE: readonly AssessmentQuestion[] = [
  {
    key: 'purpose',
    label: 'What is the purpose of this processing?',
    helpText:
      'Describe in plain language what you are using the data for and what business outcome it serves.',
    weight: 2,
  },
  {
    key: 'data_categories',
    label: 'Which categories of personal data are processed?',
    helpText:
      'List the data categories — identity, contact, financial, behavioural, sensitive (e.g. biometric / health), etc.',
    weight: 3,
  },
  {
    key: 'lawful_basis',
    label: 'What is the lawful basis under the DPDP Act?',
    helpText:
      'Pick from consent, contract, legal_obligation, vital_interest, public_task, legitimate_interest.',
    weight: 2,
  },
  {
    key: 'data_subjects',
    label: 'Whose data are you processing?',
    helpText:
      'Identify the data principal cohort — customer, employee, vendor, minor, etc. Note vulnerable groups separately.',
    weight: 2,
  },
  {
    key: 'retention',
    label: 'How long will the data be retained, and why?',
    helpText:
      'State retention period in months and the rationale (regulatory, contractual, operational).',
    weight: 1,
  },
  {
    key: 'third_party_sharing',
    label: 'Will any data be shared with third parties?',
    helpText:
      'List recipients (UIDAI, NPCI, marketing partners, payroll processors). Note the basis of sharing.',
    weight: 2,
  },
] as const;

export const DPIA_TEMPLATE: readonly AssessmentQuestion[] = [
  // Everything from PIA — but weights are stronger for DPIA because it is run
  // for higher-risk processing in the first place.
  {
    key: 'purpose',
    label: 'What is the purpose of this processing?',
    helpText:
      'Describe the purpose, the business outcome, and any secondary uses of the data.',
    weight: 2,
  },
  {
    key: 'data_categories',
    label: 'Which categories of personal data are processed?',
    helpText:
      'Identify all categories — pay special attention to sensitive personal data per DPDP Rules 2025.',
    weight: 3,
  },
  {
    key: 'lawful_basis',
    label: 'What is the lawful basis under the DPDP Act?',
    helpText:
      'Pick from consent, contract, legal_obligation, vital_interest, public_task, legitimate_interest.',
    weight: 2,
  },
  {
    key: 'data_subjects',
    label: 'Whose data are you processing?',
    helpText:
      'Identify cohorts and note vulnerable groups (children, dependants, those with limited digital literacy).',
    weight: 3,
  },
  {
    key: 'retention',
    label: 'How long will the data be retained, and why?',
    helpText:
      'State retention period in months and rationale; cite regulatory clauses (RBI KYC, BR Act, IT Act §44AA).',
    weight: 2,
  },
  {
    key: 'third_party_sharing',
    label: 'Will any data be shared with third parties or processors?',
    helpText:
      'List recipients, the basis of sharing, and the data processing agreement reference.',
    weight: 3,
  },
  {
    key: 'automated_decisioning',
    label: 'Does this processing involve automated decision-making or profiling?',
    helpText:
      'Describe any scoring, credit decisioning, fraud-risk classification or profiling. Note explainability.',
    weight: 3,
  },
  {
    key: 'cross_border_transfer',
    label: 'Is personal data transferred outside India?',
    helpText:
      'List destination jurisdictions, the legal mechanism for transfer, and the safeguards in place.',
    weight: 3,
  },
  {
    key: 'contingency_plan',
    label: 'What is the breach / contingency plan for this processing?',
    helpText:
      'Reference the incident response runbook, cohort identification path, and 72-hour DPB notification process.',
    weight: 2,
  },
  {
    key: 'dpo_consulted',
    label: 'Has the DPO been consulted on this DPIA?',
    helpText:
      'Confirm DPO sign-off and any conditions placed by the DPO before processing can commence.',
    weight: 1,
  },
] as const;

export function templateFor(kind: AssessmentKind): readonly AssessmentQuestion[] {
  return kind === 'dpia' ? DPIA_TEMPLATE : PIA_TEMPLATE;
}

export const LEGAL_BASES = [
  'consent',
  'contract',
  'legal_obligation',
  'vital_interest',
  'public_task',
  'legitimate_interest',
] as const;
export type LegalBasis = (typeof LEGAL_BASES)[number];
