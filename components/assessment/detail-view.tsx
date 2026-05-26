import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  addResponseAction,
  submitAssessmentAction,
  approveAssessmentAction,
} from '@/lib/actions/assessment';
import { AiPrefillButton } from './ai-prefill-button';
import {
  templateFor,
  type AssessmentKind,
  type RiskLevel,
} from '@/modules/assessment/templates';

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

export type DetailAssessment = {
  id: string;
  kind: string;
  title: string;
  description: string;
  status: string;
  riskScore: number | null;
  riskLevel: string | null;
  aiPrefilled: boolean;
  processingActivityId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DetailResponse = {
  questionKey: string;
  answer: string;
  score: number;
};

export type DetailAction = {
  id: string;
  kind: string;
  notes: string;
  createdAt: Date;
};

export function AssessmentDetailView({
  kind,
  assessment,
  responses,
  actions,
  canApprove,
  canSubmit,
  linkedActivityName,
}: {
  kind: AssessmentKind;
  assessment: DetailAssessment;
  responses: DetailResponse[];
  actions: DetailAction[];
  canApprove: boolean;
  canSubmit: boolean;
  linkedActivityName: string | null;
}) {
  const base = kind === 'pia' ? '/admin/pia' : '/admin/dpia';
  const template = templateFor(kind);
  const responseByKey = new Map(responses.map((r) => [r.questionKey, r]));
  const isDpia = kind === 'dpia';
  const isDraft = assessment.status === 'draft';
  const isInReview = assessment.status === 'in_review';

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link href={base as any} className="text-xs underline">
            ← Back to {kind.toUpperCase()} register
          </Link>
          <h1 className="break-words text-[22px] leading-[1.15] font-semibold tracking-[-0.015em] [text-wrap:balance] sm:text-2xl">
            {assessment.title}
          </h1>
          <p className="break-words text-[13px] text-muted-foreground sm:text-sm">
            {assessment.description || `${kind.toUpperCase()} for review.`}
          </p>
          {linkedActivityName && (
            <p className="break-words text-xs text-muted-foreground">
              Linked activity:{' '}
              {assessment.processingActivityId && (
                <Link
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  href={`/admin/data-mapping/${assessment.processingActivityId}` as any}
                  className="underline"
                >
                  {linkedActivityName}
                </Link>
              )}
            </p>
          )}
          {assessment.aiPrefilled && (
            <Badge variant="secondary" className="text-[10px]">
              AI prefilled
            </Badge>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
          <Badge variant={STATUS_VARIANT[assessment.status] ?? 'outline'}>
            {assessment.status}
          </Badge>
          {assessment.riskLevel && (
            <Badge
              variant={RISK_VARIANT[assessment.riskLevel as RiskLevel] ?? 'outline'}
              className="text-[10px] whitespace-nowrap"
            >
              {assessment.riskLevel} · {assessment.riskScore ?? 0}/100
            </Badge>
          )}
        </div>
      </header>

      {isDpia && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI prefill</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Suggest answers for every question on this DPIA by sending the linked processing
              activity through a managed AI gateway. PII redaction is applied to the prompt.
              Existing answers are preserved — clear them first to re-run.
            </p>
            <AiPrefillButton assessmentId={assessment.id} kind={kind} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Responses ({template.length} questions)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isDraft ? (
              <form action={addResponseAction} className="space-y-6">
                <input type="hidden" name="assessmentId" value={assessment.id} />
                <input type="hidden" name="kind" value={kind} />
                {template.map((q) => {
                  const r = responseByKey.get(q.key);
                  return (
                    <div key={q.key} className="space-y-2 border-l-2 pl-4">
                      <div className="flex items-start justify-between gap-2">
                        <Label htmlFor={`answer_${q.key}`} className="text-sm">
                          {q.label}
                        </Label>
                        <Badge variant="outline" className="text-[10px]">
                          weight {q.weight}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{q.helpText}</p>
                      <textarea
                        id={`answer_${q.key}`}
                        name={`answer_${q.key}`}
                        defaultValue={r?.answer ?? ''}
                        rows={3}
                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                      />
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`score_${q.key}`}
                          className="text-xs text-muted-foreground"
                        >
                          Risk score (0 low → 5 high)
                        </Label>
                        <select
                          id={`score_${q.key}`}
                          name={`score_${q.key}`}
                          defaultValue={String(r?.score ?? 0)}
                          className="h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm"
                        >
                          {[0, 1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
                <Button type="submit">Save responses</Button>
              </form>
            ) : (
              <div className="space-y-4">
                {template.map((q) => {
                  const r = responseByKey.get(q.key);
                  return (
                    <div key={q.key} className="space-y-1 rounded border px-3 py-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="min-w-0 break-words text-sm font-medium">{q.label}</p>
                        <div className="flex shrink-0 flex-wrap items-center gap-1">
                          <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                            weight {q.weight}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] whitespace-nowrap">
                            score {r?.score ?? 0}
                          </Badge>
                        </div>
                      </div>
                      <p className="break-words text-sm whitespace-pre-wrap text-muted-foreground">
                        {r?.answer || '(no answer)'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Live risk score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-4xl font-semibold">
                {assessment.riskScore ?? 0}
                <span className="text-base text-muted-foreground">/100</span>
              </p>
              {assessment.riskLevel ? (
                <Badge
                  variant={RISK_VARIANT[assessment.riskLevel as RiskLevel] ?? 'outline'}
                  className="text-[10px]"
                >
                  {assessment.riskLevel}
                </Badge>
              ) : null}
              <p className="text-xs text-muted-foreground">
                0-25 low · 26-50 medium · 51-75 high · 76-100 critical
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isDraft && (
                <form action={submitAssessmentAction}>
                  <input type="hidden" name="assessmentId" value={assessment.id} />
                  <input type="hidden" name="kind" value={kind} />
                  <Button type="submit" disabled={!canSubmit} className="w-full">
                    Submit for DPO review
                  </Button>
                  {!canSubmit && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Requires the privacy_steward or dpo role.
                    </p>
                  )}
                </form>
              )}
              {isInReview && (
                <form action={approveAssessmentAction}>
                  <input type="hidden" name="assessmentId" value={assessment.id} />
                  <input type="hidden" name="kind" value={kind} />
                  <Button type="submit" disabled={!canApprove} className="w-full">
                    Approve (DPO only)
                  </Button>
                  {!canApprove && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Only the DPO can approve assessments.
                    </p>
                  )}
                </form>
              )}
              {!isDraft && !isInReview && (
                <p className="text-xs text-muted-foreground">
                  Workflow complete — status {assessment.status}.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Action ledger ({actions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No actions recorded yet.</p>
          ) : (
            <ol className="space-y-3">
              {actions.map((a) => (
                <li key={a.id} className="rounded border px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="break-all font-mono">{a.createdAt.toISOString()}</span>
                    <span className="shrink-0">{a.kind}</span>
                  </div>
                  <p className="mt-1 break-words">{a.notes}</p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
