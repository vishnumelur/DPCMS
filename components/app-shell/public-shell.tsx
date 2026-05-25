import { TopBar } from './top-bar';
import { CookieBanner } from '@/components/cookie-banner';

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-1.5 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <TopBar variant="public" />
      <main id="main" className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      <CookieBanner />
    </div>
  );
}
