import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { verifyMfaAction } from '@/lib/actions/mfa';

type SearchParams = Promise<{ error?: string; callbackUrl?: string }>;

export const dynamic = 'force-dynamic';

export default async function MfaVerifyPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect('/signin?callbackUrl=/admin');
  }

  const sessionFlags = session as { mfaEnrolled?: boolean; mfaVerified?: boolean };
  if (!sessionFlags.mfaEnrolled) {
    // Nothing to verify — bypass.
    redirect('/admin');
  }
  if (sessionFlags.mfaVerified) {
    redirect('/admin');
  }

  const { error, callbackUrl } = await searchParams;
  const safeCallback = callbackUrl && callbackUrl.startsWith('/') ? callbackUrl : '/admin';

  return (
    <div className="mx-auto max-w-md py-12">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Verify your code</span>
            <Badge variant="outline">2FA</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Open your authenticator app and enter the current 6-digit code for
            your DPCMS account.
          </p>

          {error === 'invalid' ? (
            <p className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              That code didn&apos;t match. Codes rotate every 30 seconds — try the
              one currently shown.
            </p>
          ) : null}
          {error === 'format' ? (
            <p className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              Codes are six digits. Try again.
            </p>
          ) : null}

          <form action={verifyMfaAction} className="space-y-4">
            <input type="hidden" name="callbackUrl" value={safeCallback} />
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
                autoFocus
                required
                placeholder="000000"
              />
            </div>
            <Button type="submit" className="w-full">
              Verify
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
