'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { aiPrefillAction } from '@/lib/actions/assessment';
import type { AssessmentKind } from '@/modules/assessment/templates';

export function AiPrefillButton({
  assessmentId,
  kind,
}: {
  assessmentId: string;
  kind: AssessmentKind;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [source, setSource] = useState<'ai' | 'fallback' | null>(null);

  const click = () => {
    setMessage(null);
    setSource(null);
    startTransition(async () => {
      const result = await aiPrefillAction(assessmentId, kind);
      if (result.ok) {
        setSource(result.source);
        setMessage(
          `Prefilled ${result.count} responses via ${
            result.source === 'ai' ? 'AI gateway' : 'deterministic fallback'
          }.`,
        );
      } else {
        setMessage(`Could not prefill: ${result.error}`);
      }
    });
  };

  return (
    <div className="space-y-2">
      <Button type="button" onClick={click} disabled={pending} variant="default">
        {pending ? 'Asking the AI…' : 'AI prefill'}
      </Button>
      {message && (
        <p
          className={`text-xs ${
            source === null
              ? 'text-destructive'
              : source === 'ai'
                ? 'text-green-700'
                : 'text-muted-foreground'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
