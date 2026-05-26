import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function RefinedCard({ className, ...rest }: DivProps) {
  return <div {...rest} className={cn('refined-card', className)} />;
}

export function Eyebrow({
  className,
  teal,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & { teal?: boolean }) {
  return <span {...rest} className={cn('eyebrow', teal && 'eyebrow-teal', className)} />;
}

type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral';
export function StatusPill({
  tone = 'neutral',
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span {...rest} className={cn('pill-base', `pill-${tone}`, className)}>
      {children}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  accent,
  icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <RefinedCard className={cn('p-5 sm:p-7', className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="eyebrow min-w-0 break-words">{label}</span>
        {icon ? <span className="shrink-0 text-muted-foreground">{icon}</span> : null}
      </div>
      <p className="mt-4 break-words text-[26px] leading-[1.05] font-semibold tracking-[-0.025em] tabular sm:text-[32px] sm:leading-none">
        {value}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {hint ? (
          <p className="min-w-0 break-words text-[12px] text-muted-foreground sm:text-[13px]">
            {hint}
          </p>
        ) : (
          <span />
        )}
        {accent ? <span className="shrink-0">{accent}</span> : null}
      </div>
    </RefinedCard>
  );
}

export function FrostedHeader({
  crumbs,
  right,
  className,
}: {
  crumbs: Array<{ label: string; href?: string }>;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('frosted sticky top-0 z-30 -mx-4 px-4 py-3 sm:-mx-6 sm:px-6', className)}>
      <div className="flex items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          {crumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 ? <span className="opacity-40">/</span> : null}
              {c.href ? (
                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                <Link href={c.href as any} className="hover:text-foreground">
                  {c.label}
                </Link>
              ) : (
                <span className={i === crumbs.length - 1 ? 'text-foreground font-medium' : ''}>
                  {c.label}
                </span>
              )}
            </span>
          ))}
        </nav>
        {right ? <div className="flex items-center gap-2">{right}</div> : null}
      </div>
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  right,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <div className="space-y-1">
        <h2 className="display-lg">{title}</h2>
        {subtitle ? <p className="text-[15px] text-muted-foreground">{subtitle}</p> : null}
      </div>
      {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
    </div>
  );
}

export function ProgressBar({
  value,
  max = 100,
  className,
}: {
  value: number;
  max?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn('bar-track', className)} role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className="bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function PillLink({
  href,
  children,
  variant = 'primary',
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'ghost';
  className?: string;
}) {
  return (
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    <Link
      href={href as any}
      className={cn(variant === 'primary' ? 'btn-pill' : 'btn-pill-ghost', className)}
    >
      {children}
    </Link>
  );
}

export function PillButton({
  variant = 'primary',
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }) {
  return (
    <button
      {...rest}
      className={cn(variant === 'primary' ? 'btn-pill' : 'btn-pill-ghost', className)}
    />
  );
}

export function HairlineDivider({ className }: { className?: string }) {
  return <div className={cn('hairline-t', className)} />;
}
