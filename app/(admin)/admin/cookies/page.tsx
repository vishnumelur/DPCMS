import { ComingSoon } from '@/components/app-shell/coming-soon';

export default function AdminCookiesPage() {
  return (
    <ComingSoon
      title="M2 · Cookie Consent"
      phase="P1"
      description="Auto-scan, categorise, and consent-gate cookies across the bank's public properties."
      rfpRefs={['M2.A.1', 'M2.B.2', 'M2.C.1']}
      features={[
        'Crawler that scans configured domains and classifies cookies',
        'IAB TCF-compliant banner with 22-language auto-translation',
        'Per-script consent enforcement (auto-blocks until accepted)',
        'Consent-log export for evidence',
      ]}
    />
  );
}
