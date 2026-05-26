import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { summariseStatus, RFP_REQUIREMENTS } from '@/lib/rfp/matrix-data';

export default async function Landing() {
  const counts = summariseStatus();
  const total = RFP_REQUIREMENTS.length;
  const tApp = await getTranslations('app');
  const tLanding = await getTranslations('landing');
  const tMatrix = await getTranslations('matrix');
  const tSignIn = await getTranslations('signin');

  return (
    <div className="space-y-12 py-8">
      <section className="grid gap-8 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <Badge variant="secondary">{tApp('rfpBadge')}</Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {tApp('tagline')}
          </h1>
          <p className="text-lg text-muted-foreground">{tApp('subtitle')}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/signin" className={buttonVariants({ size: 'lg' })}>
              {tLanding('ctaPrimary')}
            </Link>
            <Link href="/rfp-matrix" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              {tLanding('ctaSecondary')}
            </Link>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link href={'/notices' as any} className={buttonVariants({ variant: 'ghost', size: 'lg' })}>
              {tLanding('ctaTertiary')}
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            {tSignIn('demoLabel')}: <code>dpcmsadmin</code> / <code>dpcms@2026</code>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{tLanding('coverageTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded border p-3">
                <p className="text-2xl font-semibold">{counts.RA}</p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{tMatrix('raLabel')}</p>
              </div>
              <div className="rounded border p-3">
                <p className="text-2xl font-semibold">{counts.CA}</p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{tMatrix('caLabel')}</p>
              </div>
              <div className="rounded border p-3">
                <p className="text-2xl font-semibold">{counts.NA}</p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{tMatrix('naLabel')}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {tLanding('coverageCount', { total })}
            </p>
            <Link href="/rfp-matrix" className="text-sm font-medium underline">
              {tLanding('openMatrix')}
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <FeatureCard title="Universal consent management" phase="Phase 1"
          desc="DEPA Consent Artefact V1.1 (JWS-signed), purpose-specific, audited, withdrawable from a customer portal." />
        <FeatureCard title="Data principal rights (DSR)" phase="Phase 2"
          desc="Self-serve workflows for access, correction, erasure, revoke, grievance and nominate — SLA-tracked end-to-end." />
        <FeatureCard title="Breach management" phase="Phase 2"
          desc="Incident workflow with DPDP-Rules-aligned deadlines and pre-filled Data Protection Board notification PDFs." />
        <FeatureCard title="Privacy & DPIA assessments" phase="Phase 3"
          desc="Templated PIAs and AI-prefilled DPIAs (Gemini Flash via Vercel AI Gateway) with role-based approvals." />
        <FeatureCard title="Integrations (Finacle, NPCI, AA, DigiLocker)" phase="Phase 4"
          desc="Connector framework with real DigiLocker + Account Aggregator sandboxes and faithfully-shaped CBS mocks." />
        <FeatureCard title="Hash-chained audit log" phase="Live in P0" live
          desc="Every mutation recorded with SHA-256 hash chain. Tamper-evident, court-admissible per RFP §1.16/1.17." />
      </section>
    </div>
  );
}

function FeatureCard({ title, phase, desc, live }: { title: string; phase: string; desc: string; live?: boolean }) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant={live ? 'default' : 'outline'} className="text-[10px]">{phase}</Badge>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{desc}</CardContent>
    </Card>
  );
}
