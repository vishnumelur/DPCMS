import { Badge } from '@/components/ui/badge';

const PHASE_LABEL: Record<string, string> = {
  P0: 'Foundation',
  P1: 'Phase 1 · Consent core',
  P2: 'Phase 2 · Rights & breach',
  P3: 'Phase 3 · Assessments',
  P4: 'Phase 4 · Integrations',
  P5: 'Phase 5 · Reporting',
};

export function PhaseBadge({ phase, live }: { phase: keyof typeof PHASE_LABEL; live?: boolean }) {
  if (live) return <Badge variant="default">Live</Badge>;
  return <Badge variant="secondary">{PHASE_LABEL[phase]}</Badge>;
}
