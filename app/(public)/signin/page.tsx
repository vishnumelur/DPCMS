import { getTranslations } from 'next-intl/server';
import { signIn } from '@/auth';
import { Eyebrow, StatusPill } from '@/components/ui-refined/refined';
import { ShieldCheck, Lock, Server } from 'lucide-react';
import { SignInForm } from './signin-form';

type SearchParams = Promise<{ callbackUrl?: string; error?: string }>;

export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  const { callbackUrl, error } = await searchParams;
  const t = await getTranslations('signin');

  async function handleSignIn(formData: FormData) {
    'use server';
    const username = String(formData.get('username') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    const target = String(formData.get('callbackUrl') ?? '/admin');
    await signIn('credentials', {
      username,
      password,
      redirectTo: target,
    });
  }

  const trustSignals = [
    {
      Icon: ShieldCheck,
      title: 'DPDP Act 2023 aligned',
      caption: 'Every consent recorded under §6 with a signed artefact.',
    },
    {
      Icon: Lock,
      title: 'Tamper-evident audit chain',
      caption: 'SHA-256 hash chain + RS256 signatures — court-admissible.',
    },
    {
      Icon: Server,
      title: 'Operated entirely by KSCB',
      caption: 'Sovereign deployment. No third-party data egress.',
    },
  ];

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-3.5rem)] sm:-mx-0">
      <div className="mx-auto grid min-h-[calc(100vh-3.5rem)] max-w-[1280px] grid-cols-1 lg:grid-cols-2">
        {/* ─── BRAND PANEL ─── */}
        <section className="relative overflow-hidden bg-paper px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
          {/* Atmospheric mesh */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 -left-32 h-[460px] w-[460px] rounded-full opacity-70 blur-3xl"
            style={{
              background:
                'radial-gradient(closest-side, oklch(0.78 0.10 195 / 0.35), transparent 70%)',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-40 -right-32 h-[520px] w-[520px] rounded-full opacity-60 blur-3xl"
            style={{
              background:
                'radial-gradient(closest-side, oklch(0.62 0.10 195 / 0.32), transparent 70%)',
            }}
          />

          <div className="relative flex h-full flex-col justify-between gap-10">
            {/* Top: logo + product label */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-kerala-bank.png"
                  alt="Kerala State Co-operative Bank"
                  className="h-12 w-12"
                />
                <span className="flex flex-col leading-tight">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Kerala State Co-operative Bank
                  </span>
                  <span className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                    DPCMS · Privacy & Consent Cockpit
                  </span>
                </span>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <Eyebrow teal>Welcome back</Eyebrow>
                <h1 className="text-[34px] leading-[1.06] font-semibold tracking-[-0.03em] [text-wrap:balance] sm:text-[44px] sm:leading-[1.05]">
                  Sign in to the data-protection cockpit.
                </h1>
                <p className="max-w-[440px] break-words text-[14.5px] leading-[1.55] text-muted-foreground sm:text-[16px]">
                  The system Kerala State Co-operative Bank runs to honour India&rsquo;s Digital
                  Personal Data Protection Act 2023 — calm, signed, audit-grade.
                </p>
              </div>
            </div>

            {/* Trust signals */}
            <ul className="space-y-4 sm:space-y-5">
              {trustSignals.map((t) => (
                <li key={t.title} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#e8f2f1] text-primary">
                    <t.Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0">
                    <span className="block break-words text-[14px] font-semibold leading-tight">
                      {t.title}
                    </span>
                    <span className="block break-words text-[12.5px] leading-snug text-muted-foreground">
                      {t.caption}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            {/* Bottom strip */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <StatusPill tone="info">DPB India compliant</StatusPill>
              <span className="text-[11px] text-muted-foreground">
                Regulated by RBI &amp; NABARD
              </span>
            </div>
          </div>
        </section>

        {/* ─── FORM PANEL ─── */}
        <section className="flex items-center justify-center bg-card/40 px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
          <div className="w-full max-w-[420px] space-y-7">
            <div className="space-y-2">
              <Eyebrow teal>Sign in</Eyebrow>
              <h2 className="text-[26px] font-semibold leading-[1.15] tracking-[-0.025em] [text-wrap:balance] sm:text-[30px]">
                Continue to your portal
              </h2>
              <p className="text-[14px] text-muted-foreground sm:text-[14.5px]">
                Use your KSCB credentials. Two-factor optional but encouraged.
              </p>
            </div>

            <SignInForm
              action={handleSignIn}
              callbackUrl={callbackUrl ?? '/admin'}
              error={error}
              copy={{
                username: t('username'),
                password: t('password'),
                submit: t('submit'),
                submitPending: 'Signing in',
                showPassword: 'Show password',
                hidePassword: 'Hide password',
                rememberMe: 'Remember me on this device',
                forgotPassword: 'Forgot password?',
                demoLabel: t('useDemo'),
                demoHint: 'Evaluator?',
                errorText: t('error'),
                securedNote: 'This sign-in is signed and chained into the audit trail.',
              }}
            />

            <p className="text-center text-[11px] text-muted-foreground">
              Demo · <code className="font-mono">dpcmsadmin</code> ·{' '}
              <code className="font-mono">dpcms@2026</code>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
