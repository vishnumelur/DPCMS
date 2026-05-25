import { ComingSoon } from '@/components/app-shell/coming-soon';

export default function MyConsentsPage() {
  return (
    <ComingSoon
      title="My consents"
      phase="P1"
      description="Every purpose you have consented to, with one-tap withdraw and downloadable artefact (JSON + PDF)."
      rfpRefs={['M1.A.3', 'M1.A.12', 'M1.A.17', 'M5.A.1']}
      features={[
        'List active and historical consents grouped by purpose',
        'One-click withdraw with counter-signed withdrawal artefact',
        'Download Consent Artefact V1.1 (JWS-signed) per the MeitY Electronic Consent Framework',
        'Re-consent flow when notice version changes',
      ]}
    />
  );
}
