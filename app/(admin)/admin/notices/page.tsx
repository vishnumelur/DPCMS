import { ComingSoon } from '@/components/app-shell/coming-soon';

export default function AdminNoticesPage() {
  return (
    <ComingSoon
      title="M8 · Privacy Notice Management"
      phase="P1"
      description="Author, version, translate (22 languages) and publish privacy notices per product / journey."
      rfpRefs={['M8.A.1', 'M8.A.3', 'M8.B.1']}
      features={[
        'WYSIWYG notice authoring with templated blocks',
        'Version control with diff viewer',
        'AI-bootstrapped translation into all 22 Schedule-8 Indian languages (reviewer approval gate)',
        'Notice acknowledgement tracking per customer',
        'Mandatory re-acknowledgement on material change',
      ]}
    />
  );
}
