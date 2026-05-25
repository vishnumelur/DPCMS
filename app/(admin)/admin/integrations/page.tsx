import { ComingSoon } from '@/components/app-shell/coming-soon';

export default function AdminIntegrationsPage() {
  return (
    <ComingSoon
      title="M4 · Integrations"
      phase="P4"
      description="Connector framework for CBS, NPCI, Aadhaar, DigiLocker, Account Aggregator and HRMS."
      rfpRefs={['M4.1', 'M4.2', 'T.3']}
      features={[
        'Real DigiLocker + AA (Sahamati / Setu / Finvu) sandbox connectors',
        'Faithfully-shaped Finacle CBS mock with admin event panel',
        'NPCI (UPI / AEPS / BBPS) webhook simulator',
        'Aadhaar e-KYC OTP mock with UIDAI XML response shape',
        'Connector event log + replay',
        'Health checks per connector',
      ]}
    />
  );
}
