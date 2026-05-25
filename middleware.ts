import { auth } from '@/auth';
import { NextResponse } from 'next/server';

const PUBLIC = ['/', '/signin', '/rfp-matrix'];
const PUBLIC_PREFIXES = ['/api/auth', '/api/health', '/_next', '/favicon', '/api/cron'];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (PUBLIC.includes(pathname)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  if (!req.auth) {
    const url = new URL('/signin', req.nextUrl.origin);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
