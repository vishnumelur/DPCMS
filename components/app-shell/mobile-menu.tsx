'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from './language-switcher';
import { signOutAction } from '@/lib/actions/sign-out';
import type { SidebarSection } from './sidebar-nav';
import type { Locale } from '@/i18n/routing';

type Props = {
  sections?: SidebarSection[];
  email: string | null;
  initialLocale: Locale;
  variant: 'public' | 'auth';
};

export function MobileMenu({ sections, email, initialLocale, variant }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const tNav = useTranslations('nav');
  const tApp = useTranslations('app');
  const tSignIn = useTranslations('signin');

  // Pre-build the link list. Sheet's `SheetClose asChild` would auto-close on click,
  // but because we render `<Link>` as the child the cleanest cross-cutting close is
  // to drive `open` from local state and reset it onClick.
  const closeAndGo = () => setOpen(false);

  const publicLinks: { href: string; label: string }[] = [
    { href: '/', label: tNav('home') },
    { href: '/rfp-matrix', label: tNav('rfpMatrix') },
    { href: '/notices', label: tNav('privacyNotices') },
  ];

  const accountLinks: { href: string; label: string }[] = email
    ? [
        { href: '/me', label: tNav('myPortal') },
        { href: '/admin', label: tNav('compliance') },
      ]
    : [];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={tNav('openMenu')}
          />
        }
      >
        <Menu />
      </SheetTrigger>
      <SheetContent side="left" className="w-[88%] max-w-xs overflow-y-auto p-0" closeLabel={tNav('closeMenu')}>
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-sm font-bold">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <span className="text-xs font-semibold">K</span>
            </span>
            <span>{tApp('wordmark')}</span>
          </SheetTitle>
          <Badge variant="outline" className="w-fit text-[10px]">
            {tApp('pocBadge')}
          </Badge>
        </SheetHeader>

        <div className="space-y-6 px-5 py-4">
          <MenuSection title={tNav('publicSection')}>
            {publicLinks.map((link) => (
              <MenuLink
                key={link.href}
                href={link.href}
                active={pathname === link.href}
                onClick={closeAndGo}
              >
                {link.label}
              </MenuLink>
            ))}
          </MenuSection>

          {accountLinks.length > 0 ? (
            <MenuSection title={tNav('myAccountSection')}>
              {accountLinks.map((link) => (
                <MenuLink
                  key={link.href}
                  href={link.href}
                  active={pathname === link.href}
                  onClick={closeAndGo}
                >
                  {link.label}
                </MenuLink>
              ))}
            </MenuSection>
          ) : null}

          {sections && sections.length > 0 ? (
            <div className="space-y-5 border-t pt-4">
              {sections.map((section) => (
                <MenuSection key={section.title} title={section.title}>
                  {section.items.map((item) => (
                    <MenuLink
                      key={item.href}
                      href={item.href}
                      active={pathname === item.href}
                      onClick={closeAndGo}
                    >
                      <span className="flex flex-1 items-center justify-between gap-2">
                        <span>{item.label}</span>
                        {item.live ? (
                          <Badge variant="default" className="text-[10px]">
                            Live
                          </Badge>
                        ) : item.phase && item.phase !== 'P0' ? (
                          <Badge variant="outline" className="text-[10px]">
                            {item.phase}
                          </Badge>
                        ) : null}
                      </span>
                    </MenuLink>
                  ))}
                </MenuSection>
              ))}
            </div>
          ) : null}

          <div className="space-y-3 border-t pt-4">
            <LanguageSwitcher initial={initialLocale} responsive={false} />
            {email ? (
              <form action={signOutAction}>
                <Button type="submit" variant="outline" className="w-full">
                  {tNav('signOut')}
                </Button>
              </form>
            ) : variant === 'public' ? (
              <SheetClose
                render={
                  <Link
                    href="/signin"
                    onClick={closeAndGo}
                    className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
                  >
                    {tSignIn('submit')}
                  </Link>
                }
              />
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MenuSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function MenuLink({
  href,
  active,
  onClick,
  children,
}: {
  href: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        href={href as any}
        onClick={onClick}
        className={cn(
          'flex min-h-11 items-center gap-2 rounded px-3 py-2 text-sm transition-colors',
          active
            ? 'bg-accent text-accent-foreground font-medium'
            : 'text-foreground hover:bg-accent/60',
        )}
      >
        {children}
      </Link>
    </li>
  );
}
