import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default async function MeHome() {
  const session = await auth();
  const email = session?.user?.email ?? 'guest';
  const t = await getTranslations('me');

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('dashboardTitle', { name: email })}
          </h1>
          <p className="text-sm text-muted-foreground">{t('dashboardSubtitle')}</p>
        </div>
        <Badge variant="default">Live · P0</Badge>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label={t('activeConsents')} value="0" hint={t('activeConsentsHint')} />
        <Stat label={t('pendingDsrs')} value="0" hint={t('pendingDsrsHint')} />
        <Stat label={t('nominees')} value="0" hint={t('nomineesHint')} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <ActionCard
          title="Raise a request"
          href="/me/requests"
          desc="Access, correct, erase, or withdraw consent under DPDP Act rights."
          phase="Phase 2"
        />
        <ActionCard
          title="My consents"
          href="/me/consents"
          desc="See every purpose you've consented to and toggle each independently."
          phase="Phase 1"
        />
        <ActionCard
          title="Privacy notices"
          href="/me/notices"
          desc="Read the current and historical privacy notices in your preferred language."
          phase="Phase 1"
        />
        <ActionCard
          title="Activity log"
          href="/me/activity"
          desc="Every event the bank logged about your data, downloadable."
          phase="Live in P0"
          live
        />
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 pt-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-3xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function ActionCard({ title, href, desc, phase, live }: { title: string; href: string; desc: string; phase: string; live?: boolean }) {
  return (
    <Card className="transition-colors hover:bg-accent/30">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <Badge variant={live ? 'default' : 'outline'} className="text-[10px]">{phase}</Badge>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">{desc}</p>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Link href={href as any} className="text-sm font-medium underline">Open →</Link>
      </CardContent>
    </Card>
  );
}
