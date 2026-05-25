import { ComingSoon } from '@/components/app-shell/coming-soon';

export default function AdminReportingPage() {
  return (
    <ComingSoon
      title="M10 · Controls, Reporting & Dashboards"
      phase="P5"
      description="Role-aware dashboards for DPO, Privacy Steward, Auditor, Board, IT — exportable to Board / regulator format."
      rfpRefs={['M10.B.1', 'M10.B.3']}
      features={[
        'Privacy posture KPI dashboard (consent rate, DSR cycle time, breach mttd)',
        'Branch-wise compliance scorecards',
        'Auto-generated Board-pack PDF',
        'Regulator-format exports (RBI, NABARD, CERT-In templates)',
        'SIEM integration for log shipping',
      ]}
    />
  );
}
