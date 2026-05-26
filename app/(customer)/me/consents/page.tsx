import { auth } from '@/auth';
import { db } from '@/db/client';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  RefinedCard,
  Eyebrow,
  StatusPill,
  PillLink,
} from '@/components/ui-refined/refined';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCustomerConsents } from '@/modules/consent/queries';
import {
  grantConsentByGuardianAction,
  declareMinorAction,
} from '@/lib/actions/consent';
import { ConsentToggle } from '@/components/ui-refined/consent-toggle';
import { getMinorFlag } from '@/modules/consent/parental';
import {
  ScrollText,
  ShieldCheck,
  IdCard,
  Lock,
  Mail,
  MessageSquare,
  TrendingUp,
  Activity,
  FileCheck2,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

function shortInitials(s: string) {
  return s
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

// Heuristic icon by lawful basis / code.
function iconFor(code: string, basis: string) {
  if (basis === 'contract') return ScrollText;
  if (basis === 'legitimate_interest') return ShieldCheck;
  if (basis === 'legal_obligation') return IdCard;
  if (code.includes('email')) return Mail;
  if (code.includes('whatsapp') || code.includes('msg')) return MessageSquare;
  if (code.includes('profile') || code.includes('marketing')) return TrendingUp;
  if (code.includes('analytics')) return Activity;
  return FileCheck2;
}

export default async function MyConsentsPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <p className="text-sm">Sign in.</p>;
  const rows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = rows[0];
  if (!u?.orgId) return <p className="text-sm">No org for current user.</p>;

  const [consents, minorFlag] = await Promise.all([
    getCustomerConsents(u.orgId, u.id),
    getMinorFlag(u.orgId, u.id),
  ]);

  const isMinor = Boolean(minorFlag?.isMinor);
  const needsAgeDeclaration = !minorFlag;

  // Split essentials vs discretionary by lawful basis.
  const essentials = consents.filter(
    (c) => c.purpose.lawfulBasis !== 'consent',
  );
  const discretionary = consents.filter(
    (c) => c.purpose.lawfulBasis === 'consent',
  );
  const activeCount = consents.filter((c) => c.preference?.status === 'active').length;
  const lastUpdated = consents
    .map((c) => c.preference?.updatedAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];

  return (
    <div className="mx-auto max-w-[640px] space-y-6">
      {/* Hero — stacks on mobile, side-by-side from sm+ */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:hidden">
          <div
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
            style={{
              background:
                'radial-gradient(120% 120% at 30% 20%, #4d8e95 0%, #1d6470 70%)',
            }}
          >
            {shortInitials(email)}
          </div>
          <Eyebrow>My account</Eyebrow>
        </div>
        <div className="space-y-2 sm:flex-1">
          <Eyebrow className="hidden sm:inline">My account</Eyebrow>
          <h1 className="text-[28px] leading-[1.1] font-semibold tracking-[-0.025em] sm:text-[40px] sm:leading-[44px] sm:tracking-[-0.03em]">
            Your data, your terms.
          </h1>
          <p className="text-[14px] text-muted-foreground sm:text-[15px]">
            {activeCount} active consent{activeCount === 1 ? '' : 's'}
            {lastUpdated
              ? ` · last updated ${new Date(lastUpdated).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
              : ''}
          </p>
        </div>
        <div
          aria-hidden="true"
          className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold text-white sm:flex"
          style={{
            background:
              'radial-gradient(120% 120% at 30% 20%, #4d8e95 0%, #1d6470 70%)',
          }}
        >
          {shortInitials(email)}
        </div>
      </section>

      {needsAgeDeclaration ? (
        <RefinedCard className="p-6">
          <Eyebrow teal>One-time</Eyebrow>
          <h3 className="title-md mt-1">Declare your age</h3>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Per DPDP §9, if you are under 18, consent must be granted by a parent or lawful
            guardian. We need a date of birth to unlock the right flow.
          </p>
          <form action={declareMinorAction} className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="dob">Date of birth</Label>
              <Input id="dob" name="dob" type="date" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-name">Guardian name (only if under 18)</Label>
              <Input id="g-name" name="guardianName" placeholder="Demo Parent" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-email">Guardian email</Label>
              <Input id="g-email" name="guardianEmail" placeholder="parent@example.in" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-rel">Guardian relation</Label>
              <Input id="g-rel" name="guardianRelation" placeholder="parent / guardian" />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-pill w-full sm:w-auto">
                Save age declaration
              </button>
            </div>
          </form>
        </RefinedCard>
      ) : null}

      {isMinor && minorFlag ? (
        <RefinedCard className="p-4 text-[13.5px]">
          Account flagged as <strong>minor</strong> (DOB{' '}
          <code>{String(minorFlag.declaredDateOfBirth)}</code>). All consents must be granted by{' '}
          <strong>{minorFlag.guardianName ?? 'your guardian'}</strong>
          {minorFlag.guardianRelation ? ` (${minorFlag.guardianRelation})` : ''}.
        </RefinedCard>
      ) : null}

      {/* Quick action */}
      <RefinedCard className="p-6">
        <Eyebrow teal>Quick action</Eyebrow>
        <h3 className="title-md mt-1">Pause all marketing for 90 days</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Withdraws marketing consents temporarily — auto-resumes after 90 days unless re-paused.
        </p>
        <div className="mt-4 flex justify-end">
          <PillLink href="/me/consents#discretionary">Manage below</PillLink>
        </div>
      </RefinedCard>

      {/* Essentials */}
      {essentials.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
            <Eyebrow>Banking essentials</Eyebrow>
          </div>
          <RefinedCard className="overflow-hidden p-0">
            <ul>
              {essentials.map((row, idx) => {
                const Icon = iconFor(row.purpose.code, row.purpose.lawfulBasis);
                return (
                  <li
                    key={row.purpose.id}
                    className={`flex items-center gap-4 px-5 py-4 ${idx > 0 ? 'hairline-t' : ''}`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#e8f2f1] text-primary">
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate title-sm">{row.purpose.name}</span>
                      <span className="block truncate text-[12.5px] text-muted-foreground">
                        Legal basis: {row.purpose.lawfulBasis.replace(/_/g, ' ')}
                      </span>
                    </span>
                    <StatusPill tone="neutral">Required</StatusPill>
                  </li>
                );
              })}
            </ul>
          </RefinedCard>
        </section>
      ) : null}

      {/* Discretionary */}
      <section className="space-y-3" id="discretionary">
        <div className="px-1">
          <Eyebrow>Discretionary consents</Eyebrow>
          <p className="mt-1 text-[13px] text-muted-foreground">
            You control these. Withdraw any time, in 1 tap.
          </p>
        </div>
        <RefinedCard className="overflow-hidden p-0">
          {discretionary.length === 0 ? (
            <p className="px-5 py-6 text-center text-[13px] text-muted-foreground">
              No discretionary purposes configured yet.
            </p>
          ) : (
            <ul>
              {discretionary.map((row, idx) => {
                const status = row.preference?.status ?? 'never_granted';
                const active = status === 'active';
                const Icon = iconFor(row.purpose.code, row.purpose.lawfulBasis);
                return (
                  <li
                    key={row.purpose.id}
                    className={`flex items-center gap-4 px-5 py-4 ${idx > 0 ? 'hairline-t' : ''}`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-muted text-muted-foreground">
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate title-sm">{row.purpose.name}</span>
                      <span className="block truncate text-[12.5px] text-muted-foreground">
                        {active
                          ? `Granted ${row.preference?.updatedAt ? new Date(row.preference.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}`
                          : status === 'withdrawn'
                            ? `Withdrawn ${row.preference?.updatedAt ? new Date(row.preference.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}`
                            : 'Not granted'}
                      </span>
                    </span>
                    {isMinor && !active ? (
                      <details className="ml-2">
                        <summary className="btn-pill-ghost cursor-pointer text-[12.5px]">
                          Guardian →
                        </summary>
                        <form
                          action={grantConsentByGuardianAction}
                          className="mt-3 grid w-72 gap-2 rounded-[12px] bg-card p-3 hairline elev-1"
                        >
                          <input type="hidden" name="purposeId" value={row.purpose.id} />
                          <div className="space-y-1">
                            <Label htmlFor={`gn-${row.purpose.id}`} className="text-[11px]">
                              Guardian name
                            </Label>
                            <Input
                              id={`gn-${row.purpose.id}`}
                              name="guardianName"
                              required
                              defaultValue={minorFlag?.guardianName ?? ''}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`ge-${row.purpose.id}`} className="text-[11px]">
                              Guardian email
                            </Label>
                            <Input
                              id={`ge-${row.purpose.id}`}
                              name="guardianEmail"
                              type="email"
                              required
                              defaultValue={minorFlag?.guardianEmail ?? ''}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`gr-${row.purpose.id}`} className="text-[11px]">
                              Relation
                            </Label>
                            <Input
                              id={`gr-${row.purpose.id}`}
                              name="guardianRelation"
                              required
                              defaultValue={minorFlag?.guardianRelation ?? 'parent'}
                            />
                          </div>
                          <button type="submit" className="btn-pill mt-1 w-full">
                            Grant via guardian
                          </button>
                        </form>
                      </details>
                    ) : (
                      <ConsentToggle
                        purposeId={row.purpose.id}
                        active={active}
                        label={row.purpose.name}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </RefinedCard>
      </section>

      {/* JWS receipts */}
      <RefinedCard className="p-6">
        <div className="flex items-center gap-2">
          <StatusPill tone="ok">JWS verified ✓</StatusPill>
        </div>
        <h3 className="title-md mt-3">Cryptographic receipts available</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Every grant and withdrawal is RS256-signed and chained into the immutable audit log.
          Download a PDF + JSON receipt as evidence any time.
        </p>
        <PillLink
          href="/me/activity"
          variant="ghost"
          className="mt-4"
        >
          Download last 12 receipts (ZIP)
        </PillLink>
      </RefinedCard>
    </div>
  );
}
