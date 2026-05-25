import { db } from '@/db/client';
import { cookieScanRun, cookieScanFinding } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { appendAudit, type AuditContext } from '@/lib/audit/with-audit';

export type ParsedCookie = {
  name: string;
  value: string;
  domain: string | null;
  path: string | null;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string | null;
};

export type CookieFinding = ParsedCookie & {
  suggestedCategoryKey: 'essential' | 'functional' | 'analytics' | 'marketing';
  suggestedRationale: string;
};

export type ScanResult = {
  runId: string;
  statusCode: number | null;
  errorMessage: string | null;
  findings: CookieFinding[];
};

const MAX_COOKIES = 30;
const FETCH_TIMEOUT_MS = 10_000;

const ANALYTICS_PATTERNS: ReadonlyArray<{ re: RegExp; reason: string }> = [
  { re: /^_ga(_|$)/, reason: 'matches Google Analytics pattern' },
  { re: /^_gid$/, reason: 'matches Google Analytics gid pattern' },
  { re: /^_gtm/, reason: 'matches Google Tag Manager pattern' },
  { re: /^mp_/, reason: 'matches Mixpanel pattern' },
  { re: /^amplitude_/, reason: 'matches Amplitude pattern' },
  { re: /^intercom-/, reason: 'matches Intercom pattern' },
  { re: /^mixpanel/i, reason: 'matches Mixpanel name prefix' },
  { re: /^hjid$/i, reason: 'matches Hotjar id pattern' },
  { re: /^_pk_/, reason: 'matches Matomo / Piwik pattern' },
];

const MARKETING_PATTERNS: ReadonlyArray<{ re: RegExp; reason: string }> = [
  { re: /^_fbp$/i, reason: 'matches Meta Pixel pattern' },
  { re: /^__ad/i, reason: 'matches ad-network prefix' },
  { re: /^_lipt$/i, reason: 'matches LinkedIn Insight pattern' },
  { re: /^lidc$/i, reason: 'matches LinkedIn pattern' },
  { re: /^_uetsid$/i, reason: 'matches Microsoft UET pattern' },
  { re: /^IDE$/, reason: 'matches DoubleClick IDE pattern' },
  { re: /^MUID$/, reason: 'matches Microsoft MUID pattern' },
  { re: /^NID$/, reason: 'matches Google ads NID pattern' },
  { re: /^__gads$/i, reason: 'matches Google Ads pattern' },
];

const ESSENTIAL_NAMES: ReadonlyArray<{ re: RegExp; reason: string }> = [
  { re: /_session$/i, reason: 'ends in _session — likely the session cookie' },
  { re: /^csrf/i, reason: 'starts with csrf — anti-CSRF token' },
  { re: /^XSRF-TOKEN$/i, reason: 'standard CSRF token name' },
  { re: /next-auth\.session-token/i, reason: 'Auth.js session cookie' },
  { re: /^__Host-/, reason: '__Host- prefix — secure first-party essential cookie' },
  { re: /^__Secure-/, reason: '__Secure- prefix — secure essential cookie' },
];

export function categoriseCookie(c: ParsedCookie): { category: CookieFinding['suggestedCategoryKey']; reason: string } {
  for (const p of MARKETING_PATTERNS) if (p.re.test(c.name)) return { category: 'marketing', reason: p.reason };
  for (const p of ANALYTICS_PATTERNS) if (p.re.test(c.name)) return { category: 'analytics', reason: p.reason };
  for (const p of ESSENTIAL_NAMES) if (p.re.test(c.name)) return { category: 'essential', reason: p.reason };
  if (c.secure && c.httpOnly) {
    return {
      category: 'essential',
      reason: 'secure + httpOnly first-party cookie — treated as essential by default',
    };
  }
  return {
    category: 'functional',
    reason: 'no known analytics/marketing/essential pattern matched — default functional',
  };
}

/**
 * Parse the value(s) returned by Headers#getSetCookie() (or a single
 * Set-Cookie header string) into ParsedCookie objects.
 */
export function parseSetCookieHeaders(raw: string[]): ParsedCookie[] {
  const out: ParsedCookie[] = [];
  for (const line of raw) {
    const parts = line.split(';').map((p) => p.trim());
    const first = parts[0];
    if (!first) continue;
    const eq = first.indexOf('=');
    if (eq < 0) continue;
    const name = first.slice(0, eq).trim();
    const value = first.slice(eq + 1).trim();
    if (!name) continue;

    let domain: string | null = null;
    let path: string | null = null;
    let secure = false;
    let httpOnly = false;
    let sameSite: string | null = null;

    for (let i = 1; i < parts.length; i++) {
      const attr = parts[i] ?? '';
      const lower = attr.toLowerCase();
      if (lower === 'secure') secure = true;
      else if (lower === 'httponly') httpOnly = true;
      else if (lower.startsWith('domain=')) domain = attr.slice('domain='.length);
      else if (lower.startsWith('path=')) path = attr.slice('path='.length);
      else if (lower.startsWith('samesite=')) sameSite = attr.slice('samesite='.length);
    }

    out.push({ name, value, domain, path, secure, httpOnly, sameSite });
    if (out.length >= MAX_COOKIES) break;
  }
  return out;
}

/**
 * Server-side: fetch the URL once (no follow), pull Set-Cookie headers,
 * categorise each one. Persist a cookie_scan_run + cookie_scan_finding rows.
 */
export async function runCookieScan(
  orgId: string,
  targetUrl: string,
  audit: AuditContext,
): Promise<ScanResult> {
  // Validation — HTTPS only, single fetch, no crawling.
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    throw new Error('invalid_url');
  }
  if (parsed.protocol !== 'https:') throw new Error('only_https_allowed');

  let statusCode: number | null = null;
  let errorMessage: string | null = null;
  let parsedCookies: ParsedCookie[] = [];

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(parsed.toString(), {
      redirect: 'manual',
      signal: ctl.signal,
      headers: {
        // Realistic UA so a server bothers to set first-party cookies.
        'user-agent':
          'Mozilla/5.0 (compatible; DPCMS-CookieScanner/1.0; +https://dpcms-sigma.vercel.app)',
        accept: 'text/html,application/xhtml+xml',
      },
    });
    statusCode = res.status;
    // Headers#getSetCookie returns an array even when only one header was sent.
    // Available in Node 20+ and the Edge runtime.
    type HeadersWithGetSetCookie = Headers & { getSetCookie?: () => string[] };
    const headers = res.headers as HeadersWithGetSetCookie;
    const raw: string[] = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [];
    parsedCookies = parseSetCookieHeaders(raw);
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : String(e);
  } finally {
    clearTimeout(timer);
  }

  const findings: CookieFinding[] = parsedCookies.map((c) => {
    const { category, reason } = categoriseCookie(c);
    return { ...c, suggestedCategoryKey: category, suggestedRationale: reason };
  });

  const [run] = await db
    .insert(cookieScanRun)
    .values({
      orgId,
      targetUrl: parsed.toString(),
      foundCount: findings.length,
      statusCode,
      errorMessage,
    })
    .returning();
  if (!run) throw new Error('scan_run_insert_failed');

  if (findings.length > 0) {
    await db.insert(cookieScanFinding).values(
      findings.map((f) => ({
        scanRunId: run.id,
        cookieName: f.name,
        domain: f.domain,
        path: f.path,
        secure: f.secure,
        httpOnly: f.httpOnly,
        sameSite: f.sameSite,
        suggestedCategoryKey: f.suggestedCategoryKey,
        suggestedRationale: f.suggestedRationale,
      })),
    );
  }

  await appendAudit(audit, {
    stream: 'consent',
    action: 'cookie.scan.completed',
    target: run.id,
    payload: {
      targetUrl: parsed.toString(),
      foundCount: findings.length,
      statusCode,
      errorMessage,
    },
  });

  return { runId: run.id, statusCode, errorMessage, findings };
}

export async function getScanRun(orgId: string, runId: string) {
  const rows = await db.select().from(cookieScanRun).where(eq(cookieScanRun.id, runId)).limit(1);
  const row = rows[0];
  if (!row || row.orgId !== orgId) return null;
  return row;
}

export async function listScanFindings(scanRunId: string) {
  return db
    .select()
    .from(cookieScanFinding)
    .where(eq(cookieScanFinding.scanRunId, scanRunId))
    .orderBy(cookieScanFinding.cookieName);
}

export async function listRecentScans(orgId: string, limit = 5) {
  return db
    .select()
    .from(cookieScanRun)
    .where(eq(cookieScanRun.orgId, orgId))
    .orderBy(desc(cookieScanRun.scannedAt))
    .limit(limit);
}
