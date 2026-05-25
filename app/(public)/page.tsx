import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Landing() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-12">
      <h1 className="text-4xl font-bold">DPCMS</h1>
      <p className="text-lg text-muted-foreground">
        Data Privacy & Consent Management System — DPDP Act 2023
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Foundation skeleton</CardTitle>
        </CardHeader>
        <CardContent>Phase P0 — see /rfp-matrix for coverage status.</CardContent>
      </Card>
    </div>
  );
}
