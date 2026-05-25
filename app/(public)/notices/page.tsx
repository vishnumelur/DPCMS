import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReadAloudButton } from '@/components/notice/read-aloud-button';

const SAMPLE_NOTICE_SPOKEN = `Kerala State Cooperative Bank — Privacy Notice. Effective date 25 May 2026. We collect personal data, financial data, and KYC artefacts under the Banking Regulation Act and process them per the DPDP Act 2023. You have rights to access, correction, erasure, consent withdrawal, grievance, and nomination. Contact our Data Protection Officer at dpo at kscb dot in.`;

export default function PublicNoticesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Privacy notices</h1>
          <div className="flex items-center gap-3">
            <ReadAloudButton text={SAMPLE_NOTICE_SPOKEN} locale="en" />
            <Badge variant="outline">Sample · v0</Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Sample notice rendered to demonstrate the public surface. The real notice authoring +
          versioning + multilingual translation arrives in <strong>Phase 1</strong>.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kerala State Cooperative Bank — Privacy Notice (Sample)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <p>
            <strong>Effective date:</strong> 2026-05-25 · <strong>Version:</strong> 0.0 (placeholder)
          </p>

          <section>
            <h2 className="mb-2 font-semibold">1. Who we are</h2>
            <p>
              The Kerala State Cooperative Bank (&ldquo;KSCB&rdquo;) is the apex cooperative bank of
              Kerala, regulated by RBI and NABARD. We are the <em>Data Fiduciary</em> for personal
              data described in this notice.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold">2. Data we collect</h2>
            <p>
              Personal data (name, contact details, PAN, Aadhaar masked, photograph, signature),
              financial data (accounts, transactions, balances), and KYC artefacts (DigiLocker
              documents, video-KYC recordings) — collected lawfully under the Banking Regulation Act
              and processed per the DPDP Act 2023.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold">3. Why we process it</h2>
            <p>
              Account opening, transaction processing, regulatory reporting, fraud prevention,
              relationship management. Each purpose has a separate consent that you can withdraw
              independently via your portal.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold">4. Your rights under DPDP Act</h2>
            <ul className="ml-5 list-disc space-y-1">
              <li>Right to access your data</li>
              <li>Right to correction and erasure</li>
              <li>Right to withdraw consent</li>
              <li>Right to grievance redressal</li>
              <li>Right to nominate</li>
            </ul>
            <p className="mt-2">
              Exercise any right via the <strong>My Portal</strong> after signing in, or contact our
              Data Protection Officer at <code>dpo@kscb.in</code> (placeholder).
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold">5. Languages</h2>
            <p>
              This notice is/will be available in all 22 Schedule-8 Indian languages (English,
              Malayalam, Hindi, Tamil, Telugu, Kannada, Bengali, …).
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
