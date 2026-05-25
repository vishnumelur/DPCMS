import { ComingSoon } from '@/components/app-shell/coming-soon';

export default function MyNoticesPage() {
  return (
    <ComingSoon
      title="Privacy notices"
      phase="P1"
      description="Current and historical versions of the privacy notice in your preferred language (22 Schedule-8 Indian languages)."
      rfpRefs={['M8.A.1', 'M8.A.3', 'M8.B.1']}
      features={[
        'Read the current notice in English, Malayalam, Hindi (more on demand via AI translation)',
        'See historical versions side by side',
        'Acknowledge receipt with timestamp',
        'Get notified when the notice changes',
      ]}
    />
  );
}
