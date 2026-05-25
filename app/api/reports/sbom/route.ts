import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { buildSbom, toCycloneDx } from '@/lib/sbom/build-sbom';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }
  const bundle = await buildSbom();
  const cyclonedx = toCycloneDx(bundle);
  const filename = `dpcms-sbom-${bundle.generatedAt.slice(0, 10)}.cdx.json`;
  return new NextResponse(JSON.stringify(cyclonedx, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
