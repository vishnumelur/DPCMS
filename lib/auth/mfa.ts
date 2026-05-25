import { TOTP, Secret } from 'otpauth';

const ISSUER = 'DPCMS';

export type TotpFactor = { secret: string; uri: string };

export function createTotpFactor({ accountLabel }: { accountLabel: string }): TotpFactor {
  const secret = new Secret({ size: 20 });
  const totp = new TOTP({
    issuer: ISSUER,
    label: accountLabel,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });
  return { secret: secret.base32, uri: totp.toString() };
}

export function verifyTotp(secretBase32: string, code: string, window = 1): boolean {
  const totp = new TOTP({ secret: Secret.fromBase32(secretBase32), digits: 6, period: 30 });
  const delta = totp.validate({ token: code, window });
  return delta !== null;
}
