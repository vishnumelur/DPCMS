import {
  RefinedCard,
  Eyebrow,
  StatusPill,
} from '@/components/ui-refined/refined';
import { ReadAloudButton } from '@/components/notice/read-aloud-button';
import { PUBLIC_NOTICE_SPOKEN } from '@/lib/notice/public-notice-text';
import { ShieldCheck, FileText, FileQuestion, Languages, Mail } from 'lucide-react';

const NOTICE_VERSION = '0.0';
const NOTICE_EFFECTIVE = '2026-05-25';

type Section = {
  Icon: typeof ShieldCheck;
  number: string;
  title: string;
  body: React.ReactNode;
};

const SECTIONS: Section[] = [
  {
    Icon: ShieldCheck,
    number: '01',
    title: 'Who we are',
    body: (
      <p>
        The Kerala State Cooperative Bank (&ldquo;KSCB&rdquo;) is the apex cooperative bank of
        Kerala, regulated by RBI and NABARD. We are the <em>Data Fiduciary</em> for personal data
        described in this notice.
      </p>
    ),
  },
  {
    Icon: FileText,
    number: '02',
    title: 'Data we collect',
    body: (
      <p>
        Personal data (name, contact details, PAN, Aadhaar masked, photograph, signature),
        financial data (accounts, transactions, balances), and KYC artefacts (DigiLocker documents,
        video-KYC recordings) — collected lawfully under the Banking Regulation Act and processed
        per the DPDP Act 2023.
      </p>
    ),
  },
  {
    Icon: FileQuestion,
    number: '03',
    title: 'Why we process it',
    body: (
      <p>
        Account opening, transaction processing, regulatory reporting, fraud prevention,
        relationship management. Each purpose has a separate consent that you can withdraw
        independently via your portal.
      </p>
    ),
  },
  {
    Icon: ShieldCheck,
    number: '04',
    title: 'Your rights under the DPDP Act',
    body: (
      <>
        <ul className="ml-1 list-none space-y-2">
          {[
            'Right to access your data',
            'Right to correction and erasure',
            'Right to withdraw consent',
            'Right to grievance redressal',
            'Right to nominate',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                aria-hidden="true"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3">
          Exercise any right via the <strong>My Portal</strong> after signing in, or contact our
          Data Protection Officer at <code>dpo@kscb.in</code>.
        </p>
      </>
    ),
  },
  {
    Icon: Languages,
    number: '05',
    title: 'Languages',
    body: (
      <p>
        This notice is available in all 22 Schedule-8 Indian languages (English, Malayalam, Hindi,
        Tamil, Telugu, Kannada, Bengali, and more). Switch language from the top bar to view this
        notice in your preferred language.
      </p>
    ),
  },
  {
    Icon: Mail,
    number: '06',
    title: 'Grievance redressal',
    body: (
      <p>
        Reach out to the Data Protection Officer at <code>dpo@kscb.in</code>. Unresolved
        grievances may be escalated to the Data Protection Board of India. The bank&rsquo;s
        nominated grievance officer responds within 30 days, tracked live in our audit chain.
      </p>
    ),
  },
];

export default function PublicNoticesPage() {
  return (
    <div className="mx-auto max-w-[760px] space-y-6">
      {/* Hero */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-2">
          <Eyebrow teal>Public privacy notice</Eyebrow>
          <h1 className="break-words text-[28px] leading-[1.1] font-semibold tracking-[-0.025em] [text-wrap:balance] sm:text-[36px] sm:leading-[1.05]">
            How Kerala State Cooperative Bank handles your data.
          </h1>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
            <span>
              Effective{' '}
              <strong className="text-foreground tabular">{NOTICE_EFFECTIVE}</strong>
            </span>
            <span className="opacity-50">·</span>
            <span>
              Version <strong className="text-foreground tabular">{NOTICE_VERSION}</strong>
            </span>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          <StatusPill tone="info">Sample · v{NOTICE_VERSION}</StatusPill>
          <ReadAloudButton
            text={PUBLIC_NOTICE_SPOKEN}
            locale="en"
            audioSrc="/tts/public-notice-en.mp3"
          />
        </div>
      </section>

      {/* Summary card */}
      <RefinedCard className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="ok">DPDP Act 2023 aligned</StatusPill>
          <StatusPill tone="info">RBI · NABARD regulated</StatusPill>
          <StatusPill tone="neutral">22 languages</StatusPill>
        </div>
        <p className="mt-3 break-words text-[14px] leading-[1.55] text-muted-foreground sm:text-[15px]">
          This is the public-facing summary of how the bank collects, processes, and protects your
          personal data. Six sections below explain who we are, what we hold, why we hold it, and
          how you can exercise your rights.
        </p>
      </RefinedCard>

      {/* Sections */}
      <div className="space-y-3">
        {SECTIONS.map((s) => (
          <RefinedCard key={s.number} className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#e8f2f1] text-primary">
                <s.Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-3">
                  <span className="tabular text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {s.number}
                  </span>
                  <h2 className="break-words text-[17px] font-semibold leading-snug tracking-[-0.015em] sm:text-[18px]">
                    {s.title}
                  </h2>
                </div>
                <div className="mt-2 break-words text-[14px] leading-[1.6] text-foreground/85 sm:text-[14.5px]">
                  {s.body}
                </div>
              </div>
            </div>
          </RefinedCard>
        ))}
      </div>

      {/* Footer */}
      <p className="px-1 pb-4 text-center text-[11.5px] text-muted-foreground">
        Every change to this notice is versioned and chained into the audit trail. Sign in to your
        portal to see your acknowledgement history.
      </p>
    </div>
  );
}
