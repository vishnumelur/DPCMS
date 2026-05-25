import { TopBar } from './top-bar';
import { CookieBanner } from '@/components/cookie-banner';

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <TopBar variant="public" />
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      <CookieBanner />
    </div>
  );
}
