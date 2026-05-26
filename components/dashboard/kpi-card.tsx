import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  value: number | string;
  hint?: string;
  icon: React.ReactNode;
  href?: string;
  featured?: boolean;
  trend?: { delta: string; positive?: boolean };
  delay?: number;
};

export function KpiCard({ label, value, hint, icon, href, featured, trend, delay = 0 }: Props) {
  const inner = (
    <div
      className={cn(
        'group relative h-full rounded-2xl border bg-card p-6 card-lift fade-up',
        featured ? 'gradient-border border-primary/20' : 'border-border/70',
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <span
          className={cn(
            'inline-flex h-9 w-9 items-center justify-center rounded-xl',
            featured
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {icon}
        </span>
        {href ? (
          <ArrowUpRight className="h-4 w-4 text-muted-foreground/60 transition-colors group-hover:text-primary" />
        ) : null}
      </div>

      <div className="mt-5 space-y-1">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <p className="text-4xl font-light tabular tracking-tight lg:text-5xl">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>

      {trend ? (
        <div className="mt-4 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 font-medium tabular',
              trend.positive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'text-muted-foreground',
            )}
          >
            {trend.delta}
          </span>
          <span className="text-muted-foreground">vs last sweep</span>
        </div>
      ) : null}
    </div>
  );

  if (!href) return inner;
  // Casting because some hrefs point at not-yet-typed-routes for typedRoutes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Link href={href as any} className="block">{inner}</Link>;
}
