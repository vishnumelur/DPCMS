import { describe, it, expect } from 'vitest';
import { categoriseCookie, parseSetCookieHeaders } from './scanner';

describe('categoriseCookie', () => {
  it('flags Google Analytics names as analytics', () => {
    const r = categoriseCookie({
      name: '_ga',
      value: 'x',
      domain: '.example.com',
      path: '/',
      secure: true,
      httpOnly: false,
      sameSite: 'Lax',
    });
    expect(r.category).toBe('analytics');
    expect(r.reason).toMatch(/Google Analytics/);
  });

  it('flags _fbp as marketing', () => {
    const r = categoriseCookie({
      name: '_fbp',
      value: 'x',
      domain: '.example.com',
      path: '/',
      secure: false,
      httpOnly: false,
      sameSite: null,
    });
    expect(r.category).toBe('marketing');
  });

  it('treats secure + httpOnly first-party as essential', () => {
    const r = categoriseCookie({
      name: 'app_token',
      value: 'x',
      domain: 'example.com',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'Strict',
    });
    expect(r.category).toBe('essential');
  });

  it('falls back to functional for unknown patterns', () => {
    const r = categoriseCookie({
      name: 'random_pref',
      value: 'x',
      domain: 'example.com',
      path: '/',
      secure: false,
      httpOnly: false,
      sameSite: null,
    });
    expect(r.category).toBe('functional');
  });

  it('flags next-auth.session-token as essential', () => {
    const r = categoriseCookie({
      name: 'next-auth.session-token',
      value: 'x',
      domain: 'example.com',
      path: '/',
      secure: false,
      httpOnly: false,
      sameSite: null,
    });
    expect(r.category).toBe('essential');
  });
});

describe('parseSetCookieHeaders', () => {
  it('parses a single cookie with attributes', () => {
    const parsed = parseSetCookieHeaders([
      '_ga=GA1.2.123; Domain=.example.com; Path=/; Secure; SameSite=Lax',
    ]);
    expect(parsed).toHaveLength(1);
    const c = parsed[0]!;
    expect(c.name).toBe('_ga');
    expect(c.value).toBe('GA1.2.123');
    expect(c.domain).toBe('.example.com');
    expect(c.path).toBe('/');
    expect(c.secure).toBe(true);
    expect(c.httpOnly).toBe(false);
    expect(c.sameSite).toBe('Lax');
  });

  it('handles multiple cookies', () => {
    const parsed = parseSetCookieHeaders([
      'one=1; Path=/',
      'two=2; Path=/; HttpOnly; Secure',
    ]);
    expect(parsed).toHaveLength(2);
    expect(parsed[1]!.httpOnly).toBe(true);
    expect(parsed[1]!.secure).toBe(true);
  });

  it('skips malformed lines', () => {
    const parsed = parseSetCookieHeaders(['not-a-cookie', 'ok=yes']);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.name).toBe('ok');
  });
});
