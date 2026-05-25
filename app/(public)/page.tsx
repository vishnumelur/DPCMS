import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Landing() {
  const t = useTranslations('app');
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-12">
      <h1 className="text-4xl font-bold">{t('name')}</h1>
      <p className="text-lg text-muted-foreground">{t('tagline')}</p>
      <Card>
        <CardHeader>
          <CardTitle>Foundation skeleton</CardTitle>
        </CardHeader>
        <CardContent>Phase P0 — see /rfp-matrix for coverage status.</CardContent>
      </Card>
    </div>
  );
}
