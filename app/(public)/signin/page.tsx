import { getTranslations } from 'next-intl/server';
import { signIn } from '@/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DemoFillButton } from './demo-fill-button';

type SearchParams = Promise<{ callbackUrl?: string; error?: string }>;

export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  const { callbackUrl, error } = await searchParams;
  const t = await getTranslations('signin');

  async function handleSignIn(formData: FormData) {
    'use server';
    const username = String(formData.get('username') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    const target = String(formData.get('callbackUrl') ?? '/admin');
    await signIn('credentials', {
      username,
      password,
      redirectTo: target,
    });
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p
              role="alert"
              className="mb-4 rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {t('error')}
            </p>
          ) : null}
          <form action={handleSignIn} className="space-y-4">
            <input type="hidden" name="callbackUrl" value={callbackUrl ?? '/admin'} />
            <div className="space-y-2">
              <Label htmlFor="username">{t('username')}</Label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              {t('submit')}
            </Button>
          </form>
          <DemoFillButton label={t('useDemo')} username="dpcmsadmin" password="dpcms@2026" />
          <p className="mt-6 text-xs text-muted-foreground">
            {t('demoHint')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
