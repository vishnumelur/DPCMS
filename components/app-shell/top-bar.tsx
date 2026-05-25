import Link from 'next/link';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { UserMenu } from './user-menu';
import { LanguageSwitcher } from './language-switcher';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/routing';

export async function TopBar({ variant = 'public' }: { variant?: 'public' | 'auth' }) {
  const session = await auth();
  const email = session?.user?.email;
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('locale')?.value;
  const cookieSet = (LOCALES as readonly string[]).includes(localeCookie ?? '');
  const initialLocale: Locale = cookieSet ? (localeCookie as Locale) : DEFAULT_LOCALE;

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold" aria-label="DPCMS · KSCB home">
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
            <span>DPCMS · KSCB</span>
          </Link>
          <Badge variant="outline" className="hidden text-[10px] sm:inline-flex">
            POC · DPDP Act 2023
          </Badge>
        </div>

        <nav className="hidden gap-1 md:flex">
          <Link href="/" className="rounded px-3 py-1.5 text-sm hover:bg-accent">
            Home
          </Link>
          <Link href="/rfp-matrix" className="rounded px-3 py-1.5 text-sm hover:bg-accent">
            RFP Matrix
          </Link>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link href={'/notices' as any} className="rounded px-3 py-1.5 text-sm hover:bg-accent">
            Privacy Notices
          </Link>
          {email ? (
            <>
              <Link href="/me" className="rounded px-3 py-1.5 text-sm hover:bg-accent">
                My Portal
              </Link>
              <Link href="/admin" className="rounded px-3 py-1.5 text-sm hover:bg-accent">
                Compliance
              </Link>
            </>
          ) : null}
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-0.5">
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
              Sign in
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
