import Link from 'next/link';
import { ArrowUpRight, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

type Phase = { key: string; label: string; pct: number };

type Props = {
  ra: number;
  ca: number;
  na: number;
  total: number;
  phases: Phase[];
  delay?: number;
};

export function RfpProgress({ ra, ca, na, total, phases, delay = 0 }: Props) {
  const pct = (n: number) => (total === 0 ? 0 : (n / total) * 100);
  const raPct = pct(ra);
  const caPct = pct(ca);
  const naPct = pct(na);

  return (
    <div
      className="rounded-2xl border border-border/70 bg-card p-6 fade-up card-lift sm:p-8"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Target className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              RFP Compliance
            </p>
            <h2 className="text-base font-semibold">Bid coverage posture</h2>
          </div>
        </div>
        <Link
          href="/rfp-matrix"
          className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
        >
          Open matrix
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Overall stacked progress */}
      <div className="mt-6 space-y-3">
        <div className="flex items-baseline justify-between">
          <p className="text-3xl font-light tabular tracking-tight">
            {raPct.toFixed(1)}<span className="text-muted-foreground">%</span>
          </p>
          <p className="text-xs text-muted-foreground tabular">
            {ra} of {total} ready
          </p>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="flex h-full">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all"
              style={{ width: `${raPct}%` }}
            />
            <div
              className="h-full bg-amber-400/70"
              style={{ width: `${caPct}%` }}
            />
            <div
              className="h-full bg-destructive/60"
              style={{ width: `${naPct}%` }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px]">
          <Legend tone="primary" label="RA" value={ra} />
          <Legend tone="amber"   label="CA" value={ca} />
          <Legend tone="red"     label="NA" value={na} />
        </div>
      </div>

      {/* Per-phase mini-bars */}
      <div className="mt-7 space-y-2.5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Per-phase delivery
        </p>
        <div className="grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-3">
          {phases.map((p) => (
            <div key={p.key} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono uppercase text-muted-foreground">{p.key}</span>
                <span className="tabular text-foreground">{p.pct}%</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/80"
                  style={{ width: `${p.pct}%` }}
                />
              </div>
              <p className="truncate text-[10px] text-muted-foreground">{p.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Legend({ tone, label, value }: { tone: 'primary' | 'amber' | 'red'; label: string; value: number }) {
  const dot =
    tone === 'primary' ? 'bg-primary' : tone === 'amber' ? 'bg-amber-400' : 'bg-destructive';
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className={cn('inline-flex h-2 w-2 rounded-full', dot)} />
      <span className="text-foreground tabular">{value}</span> {label}
    </span>
  );
}
