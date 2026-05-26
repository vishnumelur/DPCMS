import Link from 'next/link';
import { ArrowUpRight, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  greeting: string;
  email: string;
  role: string;
  scope: string;
  orgName: string;
  uptime: string;
};

export function HeroMesh({ greeting, email, role, scope, orgName, uptime }: Props) {
  return (
    <section
      className={cn(
        'mesh-hero surface-grain fade-up',
        'relative overflow-hidden rounded-3xl border border-border/70 px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-16',
      )}
    >
      {/* Decorative drifting orbs */}
      <div
        aria-hidden
        className="orb-a pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full"
        style={{
          background:
            'radial-gradient(closest-side, oklch(0.55 0.13 195 / 0.35), transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="orb-b pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full"
        style={{
          background:
            'radial-gradient(closest-side, oklch(0.42 0.10 200 / 0.28), transparent 70%)',
        }}
      />

      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/30 bg-background/60 text-[10px] uppercase tracking-[0.18em] backdrop-blur">
              <span className="mr-1.5 inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              {uptime}
            </Badge>
            <Badge variant="outline" className="border-border/60 bg-background/60 text-[10px] uppercase tracking-[0.18em] backdrop-blur">
              {orgName}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">{greeting}</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Welcome back,{' '}
            <span className="text-primary">{email}</span>
          </h1>
          <p className="max-w-xl text-base text-muted-foreground">
            You're signed in as <span className="font-medium text-foreground">{role}</span> with{' '}
            <span className="font-medium text-foreground">{scope}</span> scope. Every action below is
            recorded in the immutable hash-chained audit log.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/rfp-matrix"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'gap-2 shadow-lg shadow-primary/20',
            )}
          >
            <span>Open RFP matrix</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link
            href="/admin/audit"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'gap-2 bg-background/70 backdrop-blur',
            )}
          >
            <Activity className="h-4 w-4" />
            <span>View audit chain</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
