import Link from 'next/link';
import {
  Activity,
  ShieldCheck,
  Building2,
  KeyRound,
  GitBranch,
  Sparkles,
  Languages,
  Server,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Capability = {
  label: string;
  icon: React.ReactNode;
  status: 'live' | 'conditional';
  href?: string;
  detail: string;
};

const CAPABILITIES: Capability[] = [
  { label: 'Hash-chained audit log', icon: <Activity className="h-3.5 w-3.5" />, status: 'live', href: '/admin/audit', detail: 'Tamper-evident' },
  { label: 'RBAC + 7 roles',         icon: <ShieldCheck className="h-3.5 w-3.5" />, status: 'live', href: '/admin/rbac',  detail: '17 permissions' },
  { label: 'Tenancy + branches',     icon: <Building2 className="h-3.5 w-3.5" />,   status: 'live', href: '/admin/settings', detail: 'KSCB + 3 branches' },
  { label: 'Credentials + JWT',      icon: <KeyRound className="h-3.5 w-3.5" />,    status: 'live', detail: 'TOTP MFA opt-in' },
  { label: 'Workflow engine',        icon: <GitBranch className="h-3.5 w-3.5" />,   status: 'live', detail: 'DSR · breach · DPIA' },
  { label: 'AI gateway',             icon: <Sparkles className="h-3.5 w-3.5" />,    status: 'conditional', detail: 'PII-redacted prompts' },
  { label: '22 Schedule-8 locales',  icon: <Languages className="h-3.5 w-3.5" />,   status: 'live', detail: 'en · ml · hi authored' },
  { label: 'SBOM + CycloneDX',       icon: <Server className="h-3.5 w-3.5" />,      status: 'live', href: '/admin/sbom',  detail: '45 direct deps' },
];

type Props = { delay?: number };

export function WhatsLive({ delay = 0 }: Props) {
  return (
    <div
      className="rounded-2xl border border-border/70 bg-card p-6 fade-up card-lift sm:p-8"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Platform
          </p>
          <h2 className="text-base font-semibold">What&rsquo;s live today</h2>
        </div>
      </div>

      <ul className="mt-6 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        {CAPABILITIES.map((c) => {
          const node = (
            <li
              className={cn(
                'group flex items-start gap-3 rounded-lg border border-transparent p-2 -m-2 transition-colors',
                c.href ? 'hover:border-border/70 hover:bg-muted/40' : '',
              )}
            >
              <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/70">
                {c.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium leading-tight">
                  <span className="truncate">{c.label}</span>
                  <span
                    className={cn(
                      'inline-flex h-1.5 w-1.5 shrink-0 rounded-full',
                      c.status === 'live' ? 'bg-emerald-500' : 'bg-amber-400',
                    )}
                    aria-label={c.status === 'live' ? 'live' : 'conditional'}
                  />
                </p>
                <p className="truncate text-xs text-muted-foreground">{c.detail}</p>
              </div>
            </li>
          );
          return c.href ? (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <Link key={c.label} href={c.href as any} className="block">
              {node}
            </Link>
          ) : (
            <div key={c.label}>{node}</div>
          );
        })}
      </ul>
    </div>
  );
}
