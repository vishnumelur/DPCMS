import { describe, it, expect } from 'vitest';
import * as OTPAuth from 'otpauth';
import { createTotpFactor, verifyTotp } from './mfa';

describe('mfa', () => {
  it('a generated factor verifies its own current code', () => {
    const factor = createTotpFactor({ accountLabel: 'demo@kscb.in' });
    const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(factor.secret) });
    const code = totp.generate();
    expect(verifyTotp(factor.secret, code)).toBe(true);
  });

  it('rejects a clearly wrong code', () => {
    const factor = createTotpFactor({ accountLabel: 'demo@kscb.in' });
    expect(verifyTotp(factor.secret, '000000')).toBe(false);
  });
});
