import { ComingSoon } from '@/components/app-shell/coming-soon';

export default function MyNomineesPage() {
  return (
    <ComingSoon
      title="Nominees"
      phase="P2"
      description="Nominate someone to access, withdraw, or erase your data in the event of incapacity or death."
      rfpRefs={['M5.A.3']}
      features={[
        'Add / modify / revoke nominee per RBI nomination norms',
        'Granular permissions: view-only vs full-rights',
        'Successor verification flow (Aadhaar OTP / DigiLocker death certificate)',
      ]}
    />
  );
}
