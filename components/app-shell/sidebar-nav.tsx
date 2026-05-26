'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export type SidebarItem = {
  label: string;
  href: string;
  phase?: 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
  live?: boolean;
};

export type SidebarSection = {
  title: string;
  items: SidebarItem[];
};

export function SidebarNav({ sections }: { sections: SidebarSection[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Module navigation" className="space-y-7">
      {sections.map((section) => (
        <div key={section.title} className="space-y-1.5">
          <p className="eyebrow px-3 text-[10px]">{section.title}</p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== '/admin' && item.href !== '/me' && pathname.startsWith(item.href + '/'));
              return (
                <li key={item.href}>
                  <Link
                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                    href={item.href as any}
                    data-active={active ? 'true' : 'false'}
                    className={cn('nav-pill justify-between')}
                  >
                    <span className="truncate">{item.label}</span>
                    {item.live ? (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
