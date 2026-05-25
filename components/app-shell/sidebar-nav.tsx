'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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
    <nav aria-label="Module navigation" className="space-y-6">
      {sections.map((section) => (
        <div key={section.title} className="space-y-2">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                    href={item.href as any}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded px-3 py-2 text-sm transition-colors',
                      active
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                    )}
                  >
                    <span>{item.label}</span>
                    {item.live ? (
                      <Badge variant="default" className="text-[10px]">Live</Badge>
                    ) : item.phase && item.phase !== 'P0' ? (
                      <Badge variant="outline" className="text-[10px]">{item.phase}</Badge>
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
