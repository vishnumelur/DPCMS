import { db } from '@/db/client';
import { purpose, consentTemplate, notice, cookieCategory } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

type PurposeSeed = {
  code: string;
  name: string;
  description: string;
  lawfulBasis: string;
  dataCategories: string[];
  templateBody: string;
};

const PURPOSES: readonly PurposeSeed[] = [
  {
    code: 'ACCOUNT_OPENING',
    name: 'Savings / current account opening',
    description:
      'Process your personal, address and identity data to open and operate a deposit account at KSCB.',
    lawfulBasis: 'contract',
    dataCategories: ['identity', 'address', 'contact', 'pan', 'aadhaar_masked', 'signature'],
    templateBody:
      '## Consent for account opening\n\nKerala State Cooperative Bank (KSCB) will collect and process the personal data you provide in the account-opening form for the sole purpose of:\n\n- Verifying your identity per RBI KYC norms\n- Opening and operating your account\n- Producing statements and regulatory returns\n\nLawful basis: **contract** (DPDP Act §7(b)). Retention: 8 years post account closure as required by the Banking Regulation Act.',
  },
  {
    code: 'KYC',
    name: 'KYC and customer due diligence',
    description:
      'Verify and re-verify your identity periodically using DigiLocker / video KYC / paper KYC artefacts.',
    lawfulBasis: 'legal_obligation',
    dataCategories: ['identity', 'photo', 'video_kyc_recording', 'digilocker_artefacts'],
    templateBody:
      '## Consent for KYC and customer due diligence\n\nWe will process your identity documents (PAN, Aadhaar masked, photograph, video) to comply with the Prevention of Money Laundering Act and RBI KYC Master Direction.\n\nLawful basis: **legal_obligation**. Retention: as mandated by the regulator.',
  },
  {
    code: 'TRANSACTIONS',
    name: 'Transaction processing',
    description:
      'Process payments, NEFT/RTGS/UPI, cheque clearing, and related transaction data.',
    lawfulBasis: 'contract',
    dataCategories: ['account_number', 'beneficiary_details', 'transaction_amount', 'narration'],
    templateBody:
      '## Consent for transaction processing\n\nWe process transaction data to execute the payments and settlements you initiate.\n\nLawful basis: **contract**. Retention: 10 years per Income Tax Act §44AA.',
  },
  {
    code: 'MARKETING_EMAIL',
    name: 'Promotional email and SMS',
    description:
      'Send you marketing communications about new products, schemes and offers from KSCB and its partners.',
    lawfulBasis: 'consent',
    dataCategories: ['email', 'phone', 'preferences'],
    templateBody:
      '## Consent for marketing communications\n\nYou agree to receive promotional emails / SMS / WhatsApp messages from KSCB about products, schemes and offers.\n\nYou can withdraw this consent any time from **My Portal → My consents**. Lawful basis: **consent** (DPDP Act §6).',
  },
  {
    code: 'ANALYTICS_COOKIES',
    name: 'Analytics cookies and usage telemetry',
    description:
      'Use cookies and similar technologies on the KSCB web/app to measure aggregate usage and improve the product.',
    lawfulBasis: 'consent',
    dataCategories: ['cookie_id', 'session_id', 'page_views', 'device_info'],
    templateBody:
      '## Consent for analytics cookies\n\nWe set non-essential analytics cookies to understand how you use our digital properties (aggregate, never linked to you). Decline any time without affecting service. Lawful basis: **consent**.',
  },
];

const NOTICE_GENERAL_BODY = `# Kerala State Cooperative Bank — Privacy Notice

**Effective date:** 2026-05-25 · **Version:** 1.0

## 1. Who we are

The Kerala State Cooperative Bank (KSCB) is the apex cooperative bank of Kerala, regulated by RBI and NABARD. We are the **Data Fiduciary** for personal data described in this notice.

## 2. Data we collect

Personal data (name, contact details, PAN, Aadhaar masked, photograph, signature), financial data (accounts, transactions, balances), and KYC artefacts (DigiLocker documents, video-KYC recordings) — collected lawfully under the Banking Regulation Act and processed per the DPDP Act 2023.

## 3. Why we process it

Account opening, transaction processing, regulatory reporting, fraud prevention, relationship management. Each purpose has a separate consent that you can withdraw independently via your portal.

## 4. Your rights under DPDP Act

- Right to access your data
- Right to correction and erasure
- Right to withdraw consent
- Right to grievance redressal
- Right to nominate

Exercise any right via **My Portal** after signing in, or contact our Data Protection Officer at \`dpo@kscb.in\` (placeholder).

## 5. Languages

This notice is/will be available in all 22 Schedule-8 Indian languages (English, Malayalam, Hindi, Tamil, Telugu, Kannada, Bengali, …).
`;

const COOKIE_CATEGORIES = [
  {
    key: 'essential',
    name: 'Essential',
    description: 'Required for the site to work (auth, security, session). Always on.',
    isEssential: true,
  },
  {
    key: 'functional',
    name: 'Functional',
    description: 'Remembers preferences like language and theme.',
    isEssential: false,
  },
  {
    key: 'analytics',
    name: 'Analytics',
    description: 'Aggregate page-view metrics so we can improve the product.',
    isEssential: false,
  },
  {
    key: 'marketing',
    name: 'Marketing',
    description: 'Personalised promotional content (currently never sent off-platform).',
    isEssential: false,
  },
] as const;

export async function seedConsentP1(orgId: string) {
  // ─── Purposes + templates ────────────────────────────────────────────────
  const existingPurposes = await db.select().from(purpose).where(eq(purpose.orgId, orgId));
  if (existingPurposes.length === 0) {
    for (const ps of PURPOSES) {
      const [p] = await db
        .insert(purpose)
        .values({
          orgId,
          code: ps.code,
          name: ps.name,
          description: ps.description,
          lawfulBasis: ps.lawfulBasis,
          dataCategories: ps.dataCategories,
        })
        .returning();
      if (!p) throw new Error(`Failed to insert purpose ${ps.code}`);

      await db.insert(consentTemplate).values({
        orgId,
        purposeId: p.id,
        version: 1,
        languageCode: 'en',
        bodyMarkdown: ps.templateBody,
        publishedAt: new Date(),
      });
    }
    console.log(`Seeded ${PURPOSES.length} purposes + templates for org ${orgId}.`);
  } else {
    console.log(`Purposes already exist for org ${orgId} — skipping purpose seed.`);
  }

  // ─── Privacy notice ──────────────────────────────────────────────────────
  const existingNotice = await db
    .select()
    .from(notice)
    .where(and(eq(notice.orgId, orgId), eq(notice.slug, 'general')))
    .limit(1);
  if (!existingNotice[0]) {
    await db.insert(notice).values({
      orgId,
      slug: 'general',
      title: 'General Privacy Notice',
      bodyMarkdown: NOTICE_GENERAL_BODY,
      languageCode: 'en',
      version: 1,
      publishedAt: new Date(),
    });
    console.log(`Seeded 1 notice (general v1) for org ${orgId}.`);
  } else {
    console.log(`Notice 'general' already exists — skipping.`);
  }

  // ─── Cookie categories ───────────────────────────────────────────────────
  const existingCats = await db
    .select()
    .from(cookieCategory)
    .where(eq(cookieCategory.orgId, orgId));
  if (existingCats.length === 0) {
    await db
      .insert(cookieCategory)
      .values(COOKIE_CATEGORIES.map((c) => ({ orgId, ...c })));
    console.log(`Seeded ${COOKIE_CATEGORIES.length} cookie categories for org ${orgId}.`);
  } else {
    console.log(`Cookie categories already exist for org ${orgId} — skipping.`);
  }
}
