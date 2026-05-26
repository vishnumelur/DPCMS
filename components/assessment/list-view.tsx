import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { createAssessmentAction } from '@/lib/actions/assessment';
import type { AssessmentKind, RiskLevel } from '@/modules/assessment/templates';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  in_review: 'secondary',
  approved: 'default',
  rejected: 'destructive',
};

const RISK_VARIANT: Record<RiskLevel, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'destructive',
  critical: 'destructive',
};

export type AssessmentRow = {
  id: string;
  title: string;
  status: string;
  riskScore: number | null;
  riskLevel: string | null;
  aiPrefilled: boolean;
  createdAt: Date;
};

export type ActivityChoice = { id: string; name: string };

export function AssessmentListView({
  kind,
  rows,
  activities,
}: {
  kind: AssessmentKind;
  rows: AssessmentRow[];
  activities: ActivityChoice[];
}) {
  const base = kind === 'pia' ? '/admin/pia' : '/admin/dpia';
  const heading =
    kind === 'pia' ? 'M6 · Privacy assessments (PIA)' : 'M7 · Data protection impact assessments (DPIA)';
  const summary =
    kind === 'pia'
      ? 'Lightweight PIA workflow for routine processing — 6 questions, weighted scoring, DPO approval.'
      : 'Full DPIA workflow for high-risk processing — 10 questions plus AI-prefill from a managed AI gateway.';

  let draft = 0;
  let inReview = 0;
  let approved = 0;
  let low = 0;
  let medium = 0;
  let high = 0;
  let critical = 0;

  for (const r of rows) {
    if (r.status === 'draft') draft += 1;
    if (r.status === 'in_review') inReview += 1;
    if (r.status === 'approved') approved += 1;
    if (r.riskLevel === 'low') low += 1;
    if (r.riskLevel === 'medium') medium += 1;
    if (r.riskLevel === 'high') high += 1;
    if (r.riskLevel === 'critical') critical += 1;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </div>
        <Badge variant="default">Live · P3</Badge>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Draft" value={draft} hint="not yet submitted" />
        <Stat label="In review" value={inReview} hint="awaiting DPO sign-off" />
        <Stat label="Approved" value={approved} hint="signed off" />
        <Stat
          label="High / critical risk"
          value={high + critical}
          hint={`${low} low · ${medium} medium · ${high} high · ${critical} critical`}
          variant={high + critical > 0 ? 'destructive' : undefined}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {kind.toUpperCase()} register ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No {kind.toUpperCase()} yet. Create one below or from a processing activity in{' '}
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Link href={'/admin/data-mapping' as any} className="underline">
                Data mapping
              </Link>
              .
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>AI</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">
                      {r.createdAt.toISOString().slice(0, 10)}
                    </TableCell>
                    <TableCell className="text-sm">{r.title}</TableCell>
                    <TableCell>
                      <Badge
                        variant={STATUS_VARIANT[r.status] ?? 'outline'}
                        className="text-[10px]"
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.riskLevel ? (
                        <Badge
                          variant={RISK_VARIANT[r.riskLevel as RiskLevel] ?? 'outline'}
                          className="text-[10px]"
                        >
                          {r.riskLevel}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.riskScore ?? '—'}</TableCell>
                    <TableCell>
                      {r.aiPrefilled ? (
                        <Badge variant="secondary" className="text-[10px]">
                          AI prefilled
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <Link href={`${base}/${r.id}` as any} className="text-xs underline">
                        Open →
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create a {kind.toUpperCase()}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAssessmentAction} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="kind" value={kind} />
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                required
                placeholder={`${kind.toUpperCase()} — short descriptive title`}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                placeholder="Optional summary"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="processingActivityId">Linked processing activity</Label>
              <select
                id="processingActivityId"
                name="processingActivityId"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                defaultValue=""
              >
                <option value="">— none —</option>
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Create {kind.toUpperCase()}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  variant,
}: {
  label: string;
  value: number;
  hint: string;
  variant?: 'destructive';
}) {
  return (
    <Card>
      <CardContent className="space-y-1 pt-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p
          className={`text-3xl font-semibold ${
            variant === 'destructive' ? 'text-destructive' : ''
          }`}
        >
          {value}
        </p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
