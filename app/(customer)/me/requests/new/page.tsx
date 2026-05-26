import Link from 'next/link';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  RefinedCard,
  Eyebrow,
  StatusPill,
} from '@/components/ui-refined/refined';
import { createDsrAction } from '@/lib/actions/dsr';
import { Eye, PencilLine, Trash2, UserX, ShieldCheck, ChevronLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

const OPTIONS = [
  {
    kind: 'access',
    title: 'Access my data',
    caption: 'A complete copy of everything we hold about you.',
    Icon: Eye,
  },
  {
    kind: 'correction',
    title: 'Correct my data',
    caption: 'Fix something inaccurate or outdated.',
    Icon: PencilLine,
  },
  {
    kind: 'erasure',
    title: 'Erase my data',
    caption: 'Where allowed by law. Some retention applies (PMLA, audit).',
    Icon: Trash2,
  },
  {
    kind: 'revoke_consent',
    title: 'Withdraw a consent',
    caption: 'Tap any toggle in "My consents" to do this instantly.',
    Icon: UserX,
    fast: true,
  },
] as const;

export default async function NewDsrPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; step?: string }>;
}) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <p className="text-sm">Sign in.</p>;
  const rows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = rows[0];
  if (!u?.orgId) return <p className="text-sm">No org.</p>;

  const params = await searchParams;
  const selected = (params.kind ?? 'correction') as (typeof OPTIONS)[number]['kind'];
  const step = Number(params.step ?? '2');

  return (
    <div className="mx-auto max-w-[640px]">
      {/* Step header */}
      <div className="frosted -mx-4 px-4 py-3 sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between">
          <Link
            href="/me/requests"
            className="inline-flex items-center text-[14px] text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            <span className="ml-1">Back</span>
          </Link>
          <p className="text-[13px] font-medium text-muted-foreground tabular">
            Step {step} of 4
          </p>
          <Link
            href="/me"
            className="text-[13px] text-muted-foreground hover:text-foreground"
          >
            Save & exit
          </Link>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          {[1, 2, 3, 4].map((n) => (
            <span
              key={n}
              className={`h-2 flex-1 rounded-full ${n <= step ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-6 pt-7">
        <div className="space-y-2">
          <h1 className="display-lg">What would you like us to do with your data?</h1>
          <p className="text-[15px] text-muted-foreground">
            Pick one. We&apos;ll guide you through the rest.
          </p>
        </div>

        <form action={createDsrAction} className="space-y-4">
          <fieldset className="space-y-3.5">
            <legend className="sr-only">Request type</legend>
            {OPTIONS.map((o) => {
              const active = o.kind === selected;
              const isFast = 'fast' in o && o.fast;
              return (
                <label
                  key={o.kind}
                  className={`flex items-center gap-4 rounded-[16px] hairline elev-1 bg-card p-5 cursor-pointer transition-colors ${
                    active
                      ? 'border-primary/70 ring-1 ring-primary/40 bg-[#fcfeff]'
                      : 'hover:bg-muted/40'
                  }`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#e8f2f1] text-primary">
                    <o.Icon className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block title-sm">{o.title}</span>
                    <span className="block text-[13px] text-muted-foreground">{o.caption}</span>
                  </span>
                  {isFast ? (
                    <StatusPill tone="info">1-tap available</StatusPill>
                  ) : (
                    <input
                      type="radio"
                      name="kind"
                      value={o.kind}
                      defaultChecked={active}
                      className="custom-radio peer h-[22px] w-[22px] shrink-0 appearance-none rounded-full border border-input checked:border-[6px] checked:border-primary"
                    />
                  )}
                </label>
              );
            })}
          </fieldset>

          {/* Nested form for the selected option */}
          {selected === 'correction' ? (
            <RefinedCard className="p-5">
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label htmlFor="subject" className="text-[13px] font-medium">
                    Which record needs correction?
                  </label>
                  <input
                    id="subject"
                    name="subject"
                    required
                    defaultValue="Mailing address"
                    className="h-11 w-full rounded-[10px] border-0 bg-muted/40 px-3 text-[14px] outline-none ring-1 ring-transparent focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="details" className="text-[13px] font-medium">
                    Describe the correction
                  </label>
                  <textarea
                    id="details"
                    name="details"
                    required
                    rows={3}
                    placeholder="e.g. House no. and PIN code changed in May 2026"
                    className="w-full rounded-[10px] border-0 bg-muted/40 px-3 py-2 text-[14px] outline-none ring-1 ring-transparent focus:ring-primary/40"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="btn-pill-ghost h-9 text-[12.5px]"
                  >
                    + Attach proof (PDF)
                  </button>
                  <button
                    type="button"
                    className="btn-pill-ghost h-9 text-[12.5px]"
                  >
                    + Attach proof (photo)
                  </button>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1.5 text-[12px]">
                  <span className="truncate font-mono">address-proof-may26.pdf · 412 KB</span>
                  <button type="button" className="text-muted-foreground hover:text-foreground">
                    ✕
                  </button>
                </div>
              </div>
            </RefinedCard>
          ) : selected === 'access' ? (
            <RefinedCard className="p-5">
              <label htmlFor="subject" className="text-[13px] font-medium">
                Scope of access
              </label>
              <input
                id="subject"
                name="subject"
                required
                defaultValue="All data held about me"
                className="mt-1.5 h-11 w-full rounded-[10px] border-0 bg-muted/40 px-3 text-[14px] outline-none ring-1 ring-transparent focus:ring-primary/40"
              />
              <textarea
                name="details"
                required
                rows={3}
                placeholder="Any specific systems, time range, or format preference?"
                defaultValue="Full export, all systems."
                className="mt-3 w-full rounded-[10px] border-0 bg-muted/40 px-3 py-2 text-[14px] outline-none ring-1 ring-transparent focus:ring-primary/40"
              />
            </RefinedCard>
          ) : selected === 'erasure' ? (
            <RefinedCard className="p-5">
              <label htmlFor="subject" className="text-[13px] font-medium">
                What should be erased?
              </label>
              <input
                id="subject"
                name="subject"
                required
                defaultValue="Marketing profile"
                className="mt-1.5 h-11 w-full rounded-[10px] border-0 bg-muted/40 px-3 text-[14px] outline-none ring-1 ring-transparent focus:ring-primary/40"
              />
              <textarea
                name="details"
                required
                rows={3}
                placeholder="Reason for erasure (helps speed up review)."
                defaultValue="No longer wish to receive personalised offers."
                className="mt-3 w-full rounded-[10px] border-0 bg-muted/40 px-3 py-2 text-[14px] outline-none ring-1 ring-transparent focus:ring-primary/40"
              />
            </RefinedCard>
          ) : (
            <RefinedCard className="p-5">
              <p className="text-[13.5px] text-muted-foreground">
                For instant consent withdrawal, head to{' '}
                <Link href="/me/consents" className="text-primary hover:underline">
                  My consents
                </Link>{' '}
                and tap a toggle. Or submit a formal request below.
              </p>
              <input type="hidden" name="subject" value="Consent withdrawal" />
              <textarea
                name="details"
                required
                rows={2}
                placeholder="Which consent? Why?"
                className="mt-3 w-full rounded-[10px] border-0 bg-muted/40 px-3 py-2 text-[14px] outline-none ring-1 ring-transparent focus:ring-primary/40"
              />
            </RefinedCard>
          )}

          {/* Identity assurance strip */}
          <div className="flex items-start gap-2.5 px-1">
            <ShieldCheck
              className="mt-0.5 h-4 w-4 text-primary"
              strokeWidth={2}
              aria-hidden="true"
            />
            <p className="text-[13px] text-muted-foreground">
              We&apos;ll verify it&apos;s you on the next step using DigiLocker or Aadhaar OTP. No
              documents are stored.
            </p>
          </div>

          {/* Sticky footer */}
          <div className="frosted sticky bottom-0 -mx-4 px-4 py-4 sm:-mx-6 sm:px-6">
            <button type="submit" className="btn-pill h-13 w-full" style={{ height: 52 }}>
              Continue
            </button>
            <p className="mt-2 text-center text-[11px] font-medium text-muted-foreground">
              We&apos;ll respond within 30 days (DPDP §12).
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
