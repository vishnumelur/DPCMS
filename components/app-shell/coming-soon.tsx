import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PhaseBadge } from './phase-badge';

type Props = {
  title: string;
  phase: 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
  rfpRefs: string[];
  features: string[];
  description: string;
};

export function ComingSoon({ title, phase, rfpRefs, features, description }: Props) {
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <PhaseBadge phase={phase} />
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What this module will do</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">RFP requirements covered</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {rfpRefs.map((ref) => (
              <code key={ref} className="rounded bg-muted px-2 py-1 text-xs">
                {ref}
              </code>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            See <a href="/rfp-matrix" className="underline">RFP Compliance Matrix</a> for the full list of requirements grouped by module.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
