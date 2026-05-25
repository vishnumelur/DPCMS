import { ComingSoon } from '@/components/app-shell/coming-soon';

export default function MyDataPage() {
  return (
    <ComingSoon
      title="My data"
      phase="P3"
      description="The categories of personal data the bank holds about you, their system of record, and remaining retention period."
      rfpRefs={['M3.1.1', 'M5.A.3']}
      features={[
        'Data category tree (personal · financial · contact · biometric · sensitive personal)',
        'System of record (Finacle / Internet Banking / DigiLocker / HRMS / CRM)',
        'Retention countdown per category',
        'Download a machine-readable copy (JSON)',
      ]}
    />
  );
}
