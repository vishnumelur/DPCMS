import { RFP_REQUIREMENTS, summariseStatus } from '@/lib/rfp/matrix-data';
import type { RfpRequirement, RfpStatus } from '@/lib/rfp/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function StatusBadge({ status }: { status: RfpStatus }) {
  const variant: Record<RfpStatus, 'default' | 'secondary' | 'destructive'> = {
    RA: 'default',
    CA: 'secondary',
    NA: 'destructive',
  };
  return <Badge variant={variant[status]}>{status}</Badge>;
}

export default function RfpMatrixPage() {
  const counts = summariseStatus();
  const total = RFP_REQUIREMENTS.length;
  const grouped = RFP_REQUIREMENTS.reduce<Record<string, RfpRequirement[]>>((acc, r) => {
    (acc[r.module] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-6xl py-10 space-y-8 px-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">RFP Compliance Matrix</h1>
        <p className="text-muted-foreground">
          Live mapping of KSCB DPCMS RFP (KBIT/PMU/088/25-26) requirements to demo screens.
        </p>
        <div className="flex gap-3 pt-2">
          <Badge variant="default">RA: {counts.RA}</Badge>
          <Badge variant="secondary">CA: {counts.CA}</Badge>
          <Badge variant="destructive">NA: {counts.NA}</Badge>
          <span className="text-sm text-muted-foreground self-center">
            of {total} representative rows
          </span>
        </div>
      </header>

      {Object.entries(grouped).map(([module, rows]) => (
        <Card key={module}>
          <CardHeader>
            <CardTitle>{module}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">ID</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Phase</th>
                    <th className="py-2 pr-4">Requirement</th>
                    <th className="py-2 pr-4">Demo</th>
                    <th className="py-2 pr-4">Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="py-2 pr-4 font-mono text-xs">{r.id}</td>
                      <td className="py-2 pr-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">{r.phase}</td>
                      <td className="py-2 pr-4">{r.text}</td>
                      <td className="py-2 pr-4">
                        {r.demoPath ? (
                          <a href={r.demoPath} className="underline">
                            open
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {r.evidencePath ? (
                          <a href={r.evidencePath} className="underline">
                            view
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
