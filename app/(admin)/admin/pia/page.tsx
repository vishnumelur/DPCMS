import { ComingSoon } from '@/components/app-shell/coming-soon';

export default function AdminPiaPage() {
  return (
    <ComingSoon
      title="M6 · Privacy Impact Assessments"
      phase="P3"
      description="Templated PIAs with risk scoring, assignment, and approval workflows."
      rfpRefs={['M6.A.1', 'M6.A.2']}
      features={[
        'Built-in templates aligned with DPDP Act + RBI guidance',
        'Risk scoring matrix with mitigation recommendations',
        'AI-prefill from RoPA + connector configs',
        'Multi-level review/approval chain',
        'Exportable PIA report (PDF)',
      ]}
    />
  );
}
