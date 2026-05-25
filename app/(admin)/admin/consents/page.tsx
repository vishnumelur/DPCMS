import { ComingSoon } from '@/components/app-shell/coming-soon';

export default function AdminConsentsPage() {
  return (
    <ComingSoon
      title="M1 · Universal Consent Management"
      phase="P1"
      description="Capture, store, validate, modify, withdraw and audit purpose-specific consents per DPDP Act 2023."
      rfpRefs={['M1.A.1', 'M1.A.3', 'M1.A.4', 'M1.A.8', 'M1.A.12', 'M1.A.16', 'M1.A.17', 'M1.A.23']}
      features={[
        'Consent template designer (versioned, purpose-tagged, multilingual)',
        'DEPA Consent Artefact V1.1 JWS signing/verifying with downloadable public key',
        'Per-customer consent ledger (granular, hierarchical)',
        'Parental / guardian consent for minors',
        'Renewal + revaluation workflows',
      ]}
    />
  );
}
