import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { lawDocument, lawSection } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

type Params = Promise<{ docCode: string; sectionNumber: string }>;

// Minimal markdown renderer: handles headings (#, ##, ###), bullet lists, **bold**,
// and *italic*. Sufficient for the seeded corpus; full markdown is out of scope for POC.
function renderMarkdown(md: string): React.ReactNode {
  const lines = md.split('\n');
  const out: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length === 0) return;
    out.push(
      <ul key={`list-${out.length}`} className="my-3 list-disc space-y-1 pl-6 text-sm">
        {listBuffer.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </ul>,
    );
    listBuffer = [];
  };

  function inline(text: string): React.ReactNode {
    // Render **bold**, *italic*, `code` then string-split.
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
      const token = m[0];
      if (token.startsWith('**')) {
        parts.push(<strong key={`b-${m.index}`}>{token.slice(2, -2)}</strong>);
      } else if (token.startsWith('`')) {
        parts.push(
          <code key={`c-${m.index}`} className="rounded bg-muted px-1 text-xs">
            {token.slice(1, -1)}
          </code>,
        );
      } else {
        parts.push(<em key={`i-${m.index}`}>{token.slice(1, -1)}</em>);
      }
      lastIndex = m.index + token.length;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts.length === 1 ? parts[0] : parts;
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    const line = raw.trimEnd();
    if (line.startsWith('### ')) {
      flushList();
      out.push(
        <h3 key={i} className="mt-4 text-base font-semibold">
          {inline(line.slice(4))}
        </h3>,
      );
    } else if (line.startsWith('## ')) {
      flushList();
      out.push(
        <h2 key={i} className="mt-5 text-lg font-semibold">
          {inline(line.slice(3))}
        </h2>,
      );
    } else if (line.startsWith('# ')) {
      flushList();
      out.push(
        <h1 key={i} className="mt-6 text-xl font-bold">
          {inline(line.slice(2))}
        </h1>,
      );
    } else if (line.startsWith('- ')) {
      listBuffer.push(line.slice(2));
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      out.push(
        <p key={i} className="my-2 text-sm leading-relaxed">
          {inline(line)}
        </p>,
      );
    }
  }
  flushList();
  return out;
}

export default async function ResearchSectionPage({ params }: { params: Params }) {
  const { docCode, sectionNumber } = await params;
  const decodedSection = decodeURIComponent(sectionNumber);

  const docRows = await db
    .select()
    .from(lawDocument)
    .where(eq(lawDocument.code, docCode))
    .limit(1);
  const doc = docRows[0];
  if (!doc) notFound();

  const secRows = await db
    .select()
    .from(lawSection)
    .where(and(eq(lawSection.documentId, doc.id), eq(lawSection.sectionNumber, decodedSection)))
    .limit(1);
  const section = secRows[0];
  if (!section) notFound();

  return (
    <div className="space-y-6">
      <p className="text-xs">
        <Link href="/admin/research" className="underline">
          Research
        </Link>{' '}
        →{' '}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Link href={`/admin/research/${doc.code}` as any} className="underline">
          {doc.code}
        </Link>{' '}
        → § {decodedSection}
      </p>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          § {section.sectionNumber} — {section.title}
        </h1>
        <p className="text-xs text-muted-foreground">
          From {doc.title} · jurisdiction{' '}
          <span className="font-mono">{doc.jurisdiction}</span>
        </p>
        <div className="flex flex-wrap gap-1 pt-2">
          {section.tags.map((t) => (
            <Badge key={t} variant="outline" className="text-[10px]">
              {t}
            </Badge>
          ))}
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Full text</CardTitle>
        </CardHeader>
        <CardContent>
          <article className="prose prose-sm max-w-none">{renderMarkdown(section.bodyMarkdown)}</article>
        </CardContent>
      </Card>
    </div>
  );
}
