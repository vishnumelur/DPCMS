import { auth } from '@/auth';
import { NextResponse } from 'next/server';

const PUBLIC = ['/', '/signin', '/rfp-matrix', '/notices', '/mfa/setup', '/mfa/verify'];
const PUBLIC_PREFIXES = [
  '/api/auth',
  '/api/health',
  '/_next',
  '/favicon',
  '/api/cron',
  '/api/cookies',
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (PUBLIC.includes(pathname)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  if (!req.auth) {
    const url = new URL('/signin', req.nextUrl.origin);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // MFA gate: if the user has a confirmed factor but hasn't yet passed the
  // challenge this session, route them through /mfa/verify before letting
  // them into the admin compliance portal. /me/* (customer portal) is not
  // gated — customers in the POC don't enrol TOTP.
  const auth = req.auth as unknown as { mfaEnrolled?: boolean; mfaVerified?: boolean };
  if (pathname.startsWith('/admin') && auth?.mfaEnrolled && !auth?.mfaVerified) {
    const url = new URL('/mfa/verify', req.nextUrl.origin);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
