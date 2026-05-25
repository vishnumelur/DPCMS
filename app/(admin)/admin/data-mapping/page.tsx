import { ComingSoon } from '@/components/app-shell/coming-soon';

export default function AdminDataMappingPage() {
  return (
    <ComingSoon
      title="M3 · Data Mapping (RoPA)"
      phase="P3"
      description="Records of Processing Activities — purposes, legal bases, retention periods, data categories, systems of record."
      rfpRefs={['M3.1.1']}
      features={[
        'RoPA registry with full CRUD',
        'Auto-discovery scan from connected systems (Finacle, NPCI, DigiLocker, HRMS)',
        'AI/ML-powered classification of structured + unstructured assets',
        'Data flow diagram (Sankey) per processing activity',
        'Retention policy engine with deletion scheduler',
      ]}
    />
  );
}
