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
          <SheetTitle>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-kerala-bank.png"
              alt="Kerala State Co-operative Bank · DPCMS"
              width={500}
              height={500}
              loading="eager"
              decoding="sync"
              className="h-14 w-14"
            />
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
            <div className="space-y-5 hairline-t pt-5">
              {sections.map((section) => (
                <MenuSection key={section.title} title={section.title}>
                  {section.items.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href !== '/admin' &&
                        item.href !== '/me' &&
                        pathname.startsWith(item.href + '/'));
                    return (
                      <MenuLink
                        key={item.href}
                        href={item.href}
                        active={active}
                        onClick={closeAndGo}
                      >
                        <span className="truncate">{item.label}</span>
                        {item.live ? (
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                            aria-hidden="true"
                          />
                        ) : null}
                      </MenuLink>
                    );
                  })}
                </MenuSection>
              ))}
            </div>
          ) : null}

          <div className="space-y-3 hairline-t pt-4">
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
    <div className="space-y-1.5">
      <p className="eyebrow px-3 text-[10px]">{title}</p>
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
        data-active={active ? 'true' : 'false'}
        className={cn('nav-pill min-h-11 justify-between')}
      >
        {children}
      </Link>
    </li>
  );
}
