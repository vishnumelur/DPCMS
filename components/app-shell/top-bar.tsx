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
  const initialLocale: Locale = (LOCALES as readonly string[]).includes(localeCookie ?? '')
    ? (localeCookie as Locale)
    : DEFAULT_LOCALE;

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground">D</span>
            DPCMS
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
          <LanguageSwitcher initial={initialLocale} />
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
