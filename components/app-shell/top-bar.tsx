import Link from 'next/link';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { UserMenu } from './user-menu';
import { LanguageSwitcher } from './language-switcher';
import { MobileMenu } from './mobile-menu';
import type { SidebarSection } from './sidebar-nav';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/routing';

type Props = {
  variant?: 'public' | 'auth';
  /**
   * Sidebar sections shown inside the mobile drawer. Optional — public shell may
   * omit this so only top-bar nav appears. AuthShell passes the active portal's
   * section list (ADMIN_SIDEBAR or CUSTOMER_SIDEBAR).
   */
  mobileSidebarSections?: SidebarSection[];
};

export async function TopBar({ variant = 'public', mobileSidebarSections }: Props) {
  const session = await auth();
  const email = session?.user?.email ?? null;
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('locale')?.value;
  const cookieSet = (LOCALES as readonly string[]).includes(localeCookie ?? '');
  const initialLocale: Locale = cookieSet ? (localeCookie as Locale) : DEFAULT_LOCALE;

  const tNav = await getTranslations('nav');
  const tApp = await getTranslations('app');

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <MobileMenu
            sections={mobileSidebarSections}
            email={email}
            initialLocale={initialLocale}
            variant={variant}
          />
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-bold"
            aria-label={`${tApp('wordmark')} home`}
          >
            <svg
              viewBox="0 0 28 28"
              className="h-7 w-7"
              fill="none"
              role="img"
              aria-label="KSCB"
            >
              <circle cx="14" cy="14" r="13" className="fill-primary" />
              <path
                d="M9 8 L9 20 M9 14 L15 8 M9 14 L15 20"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="stroke-primary-foreground"
              />
              <circle cx="20" cy="9" r="1.5" className="fill-primary-foreground" />
            </svg>
            <span>{tApp('wordmark')}</span>
          </Link>
          <Badge variant="outline" className="hidden text-[10px] sm:inline-flex">
            {tApp('pocBadge')}
          </Badge>
        </div>

        <nav className="hidden gap-1 md:flex">
          <Link href="/" className="rounded px-3 py-1.5 text-sm hover:bg-accent">
            {tNav('home')}
          </Link>
          <Link href="/rfp-matrix" className="rounded px-3 py-1.5 text-sm hover:bg-accent">
            {tNav('rfpMatrix')}
          </Link>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link href={'/notices' as any} className="rounded px-3 py-1.5 text-sm hover:bg-accent">
            {tNav('privacyNotices')}
          </Link>
          {email ? (
            <>
              <Link href="/me" className="rounded px-3 py-1.5 text-sm hover:bg-accent">
                {tNav('myPortal')}
              </Link>
              <Link href="/admin" className="rounded px-3 py-1.5 text-sm hover:bg-accent">
                {tNav('compliance')}
              </Link>
            </>
          ) : null}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden flex-col items-end gap-0.5 md:flex">
            <LanguageSwitcher initial={initialLocale} />
            {!cookieSet ? (
              <p className="hidden text-[10px] text-muted-foreground md:block">
                ml is the default for KSCB customers — change anytime
              </p>
            ) : null}
          </div>
          {email ? (
            <UserMenu email={email} />
          ) : variant === 'public' ? (
            <Link href="/signin" className={buttonVariants({ size: 'sm' })}>
              {tNav('signIn')}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
