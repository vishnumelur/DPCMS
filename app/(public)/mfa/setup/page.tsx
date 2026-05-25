import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { startMfaEnrolmentAction, confirmMfaAction } from '@/lib/actions/mfa';
import QRCode from 'qrcode';

type SearchParams = Promise<{ error?: string }>;

export const dynamic = 'force-dynamic';

export default async function MfaSetupPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user?.email) redirect('/signin?callbackUrl=/mfa/setup');

  const sessionFlags = session as { mfaEnrolled?: boolean };
  if (sessionFlags.mfaEnrolled) {
    redirect('/admin/settings?mfa=already-enrolled');
  }

  const { error } = await searchParams;
  const { secret, uri } = await startMfaEnrolmentAction();
  const qrDataUrl = await QRCode.toDataURL(uri, { margin: 1, width: 240 });

  return (
    <div className="mx-auto max-w-xl py-12">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Enable two-factor authentication</span>
            <Badge variant="outline">TOTP · RFC 6238</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Open your authenticator app (Google Authenticator, 1Password, Authy, etc.)
            and scan the QR code below. Then enter the 6-digit code it shows to confirm
            enrolment. Once confirmed, you&apos;ll be challenged for a fresh code at
            every sign-in.
          </p>

          {error === 'invalid' ? (
            <p className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              That code didn&apos;t match. Try again with the code currently shown in
              your authenticator app.
            </p>
          ) : null}

          <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="MFA setup QR code" width={240} height={240} />
            <div className="w-full space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Or enter this secret manually
              </p>
              <code className="block break-all rounded border bg-background px-2 py-1 font-mono text-xs">
                {secret}
              </code>
            </div>
          </div>

          <form action={confirmMfaAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">6-digit code</Label>
              <Input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                minLength={6}
                autoComplete="one-time-code"
                required
                placeholder="000000"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <a href="/admin/settings" className="text-xs text-muted-foreground underline">
                Skip for now
              </a>
              <Button type="submit">Confirm and enable</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
