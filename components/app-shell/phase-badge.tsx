import { Badge } from '@/components/ui/badge';

const PHASE_LABEL: Record<string, string> = {
  P0: 'Core',
  P1: 'Consent',
  P2: 'Rights & breach',
  P3: 'Assessments',
  P4: 'Integrations',
  P5: 'Reporting',
};

export function PhaseBadge({ phase, live }: { phase: keyof typeof PHASE_LABEL; live?: boolean }) {
  if (live) return <Badge variant="default">Live</Badge>;
  return <Badge variant="secondary">{PHASE_LABEL[phase]}</Badge>;
}
