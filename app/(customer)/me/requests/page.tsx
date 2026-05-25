import { ComingSoon } from '@/components/app-shell/coming-soon';

export default function MyRequestsPage() {
  return (
    <ComingSoon
      title="Raise a request (DSR)"
      phase="P2"
      description="Exercise your DPDP Act rights: access, correction, erasure, consent revocation, grievance redressal, nomination."
      rfpRefs={['M5.A.3', 'M5.B.1', 'M5.D.1']}
      features={[
        'Wizard-driven request creation with identity verification',
        'SLA timer (21-day warning, 30-day breach per DPDP Act)',
        'Live status updates via email + in-app',
        'Download fulfilment artefact when closed',
      ]}
    />
  );
}
