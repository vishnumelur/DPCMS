import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { lawDocument, lawSection } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

type Params = Promise<{ docCode: string }>;

export default async function ResearchDocPage({ params }: { params: Params }) {
  const { docCode } = await params;

  const docRows = await db
    .select()
    .from(lawDocument)
    .where(eq(lawDocument.code, docCode))
    .limit(1);
  const doc = docRows[0];
  if (!doc) notFound();

  const sections = await db
    .select()
    .from(lawSection)
    .where(eq(lawSection.documentId, doc.id))
    .orderBy(asc(lawSection.sectionNumber));

  return (
    <div className="space-y-6">
      <p className="text-xs">
        <Link href="/admin/research" className="underline">
          ← Research repository
        </Link>
      </p>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{doc.title}</h1>
        <p className="text-xs text-muted-foreground">
          <code className="rounded bg-muted px-1">{doc.code}</code> · jurisdiction{' '}
          <span className="font-mono">{doc.jurisdiction}</span>
          {doc.effectiveFrom ? <> · in force since {doc.effectiveFrom}</> : null}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{doc.summary}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sections ({sections.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sections seeded for this document.</p>
          ) : (
            <ul className="space-y-2">
              {sections.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-3 rounded border p-3">
                  <div className="space-y-1">
                    <Link
                      href={
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        `/admin/research/${doc.code}/${encodeURIComponent(s.sectionNumber)}` as any
                      }
                      className="font-medium underline"
                    >
                      § {s.sectionNumber} — {s.title}
                    </Link>
                    <div className="flex flex-wrap gap-1">
                      {s.tags.map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px]">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
