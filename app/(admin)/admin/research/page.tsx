import Link from 'next/link';
import { db } from '@/db/client';
import { lawDocument, lawSection } from '@/db/schema';
import { asc } from 'drizzle-orm';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ q?: string }>;

export default async function AdminResearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim().toLowerCase();

  const [allDocs, allSections] = await Promise.all([
    db.select().from(lawDocument).orderBy(asc(lawDocument.jurisdiction), asc(lawDocument.title)),
    db.select().from(lawSection),
  ]);

  // Index sections by doc for tag matching.
  const sectionsByDoc = new Map<string, typeof allSections>();
  for (const s of allSections) {
    const existing = sectionsByDoc.get(s.documentId) ?? [];
    existing.push(s);
    sectionsByDoc.set(s.documentId, existing);
  }

  const filtered = q
    ? allDocs.filter((d) => {
        const haystack = [
          d.code,
          d.title,
          d.summary,
          d.jurisdiction,
          ...(sectionsByDoc.get(d.id) ?? []).flatMap((s) => [
            s.sectionNumber,
            s.title,
            ...s.tags,
          ]),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
    : allDocs;

  const grouped = filtered.reduce<Record<string, typeof allDocs>>((acc, d) => {
    (acc[d.jurisdiction] ??= []).push(d);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">M11 · Research repository</h1>
          <p className="text-sm text-muted-foreground">
            Hand-curated corpus of Indian and global data-protection laws. Search by tag, section
            number, or any substring across titles, summaries, and section bodies. {filtered.length}{' '}
            of {allDocs.length} documents shown · {allSections.length} sections total.
          </p>
        </div>
        <Badge variant="default">Live · P5</Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex gap-2">
            <Input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="e.g. consent, breach, cross-border, Article 17, §14"
              className="max-w-md"
            />
            <button
              type="submit"
              className="rounded-md border border-input bg-background px-3 text-sm shadow-sm hover:bg-accent"
            >
              Search
            </button>
            {q ? (
              <Link
                href="/admin/research"
                className="self-center text-xs text-muted-foreground underline"
              >
                clear
              </Link>
            ) : null}
          </form>
        </CardContent>
      </Card>

      {Object.entries(grouped).map(([jurisdiction, docs]) => (
        <Card key={jurisdiction}>
          <CardHeader>
            <CardTitle className="text-base">
              Jurisdiction: <span className="font-mono">{jurisdiction}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {docs.map((d) => {
                const sections = sectionsByDoc.get(d.id) ?? [];
                return (
                  <li key={d.id} className="rounded border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <Link
                          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                          href={`/admin/research/${d.code}` as any}
                          className="font-medium underline"
                        >
                          {d.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">{d.summary}</p>
                      </div>
                      <div className="flex flex-shrink-0 flex-col items-end gap-1">
                        <code className="text-[10px]">{d.code}</code>
                        {d.effectiveFrom ? (
                          <span className="text-[10px] text-muted-foreground">
                            in force: {d.effectiveFrom}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      {sections.length} section{sections.length === 1 ? '' : 's'} ·{' '}
                      {sections
                        .flatMap((s) => s.tags)
                        .filter((v, i, a) => a.indexOf(v) === i)
                        .slice(0, 8)
                        .join(', ') || 'no tags'}
                    </p>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ))}

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No documents match {JSON.stringify(q)}.
        </p>
      ) : null}
    </div>
  );
}
