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
  const initialLocale: Locale = (LOCALES as readonly string[]).includes(localeCookie ?? '')
    ? (localeCookie as Locale)
    : DEFAULT_LOCALE;

  const tNav = await getTranslations('nav');
  const tApp = await getTranslations('app');

  return (
    <header className="frosted sticky top-0 z-40">
      <div className="mx-auto flex h-14 max-w-[1320px] items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <MobileMenu
            sections={mobileSidebarSections}
            email={email}
            initialLocale={initialLocale}
            variant={variant}
          />
          <Link
            href="/"
            className="flex items-center"
            aria-label="Kerala State Co-operative Bank · DPCMS"
          >
            {/* Responsive split: icon-only mark on mobile (where a square
                composite at 40px would render the wordmark at ~6px tall and
                look like a placeholder), full composite from sm+ where the
                wordmark is readable. Both variants are preloaded in the
                document head + carry explicit dimensions + eager loading +
                sync decode + high fetch priority. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-kerala-bank-mark.png"
              alt="Kerala State Co-operative Bank"
              width={220}
              height={220}
              loading="eager"
              decoding="sync"
              fetchPriority="high"
              className="h-9 w-9 sm:hidden"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-kerala-bank.png"
              alt="Kerala State Co-operative Bank"
              width={500}
              height={500}
              loading="eager"
              decoding="sync"
              fetchPriority="high"
              className="hidden h-11 w-auto sm:block lg:h-12"
            />
          </Link>
          <Badge variant="outline" className="hidden text-[10px] sm:inline-flex">
            {tApp('pocBadge')}
          </Badge>
        </div>

        <nav className="hidden min-w-0 flex-1 justify-center gap-0.5 lg:flex">
          <Link
            href="/"
            className="whitespace-nowrap rounded-[10px] px-3 py-1.5 text-[13.5px] hover:bg-accent"
          >
            {tNav('home')}
          </Link>
          <Link
            href="/rfp-matrix"
            className="whitespace-nowrap rounded-[10px] px-3 py-1.5 text-[13.5px] hover:bg-accent"
          >
            {tNav('rfpMatrix')}
          </Link>
          <Link
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            href={'/notices' as any}
            className="whitespace-nowrap rounded-[10px] px-3 py-1.5 text-[13.5px] hover:bg-accent"
          >
            {tNav('privacyNotices')}
          </Link>
          {email ? (
            <>
              <Link
                href="/me"
                className="whitespace-nowrap rounded-[10px] px-3 py-1.5 text-[13.5px] hover:bg-accent"
              >
                {tNav('myPortal')}
              </Link>
              <Link
                href="/admin"
                className="whitespace-nowrap rounded-[10px] px-3 py-1.5 text-[13.5px] hover:bg-accent"
              >
                {tNav('compliance')}
              </Link>
            </>
          ) : null}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language switcher visible from md+ only — on mobile it lives
              inside the side drawer (mobile-menu) to keep the top bar tidy
              and avoid duplication. */}
          <LanguageSwitcher initial={initialLocale} />
          {email ? (
            <UserMenu email={email} />
          ) : variant === 'public' ? (
            <Link
              href="/signin"
              className={buttonVariants({ size: 'sm', className: 'whitespace-nowrap' })}
            >
              {tNav('signIn')}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
