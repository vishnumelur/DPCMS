'use client';

import { useState, useTransition } from 'react';
import { type Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';

/**
 * Segmented pill switcher — EN · മ · हि.
 * Single tap commits the cookie + full reload so server components re-render.
 */
type Option = { code: Locale; short: string; full: string };
const OPTIONS: Option[] = [
  { code: 'en', short: 'EN', full: 'English' },
  { code: 'ml', short: 'മ',  full: 'മലയാളം' },
  { code: 'hi', short: 'हि', full: 'हिन्दी' },
];

type Props = {
  initial?: Locale;
  responsive?: boolean;
};

export function LanguageSwitcher({ initial = 'en', responsive = true }: Props) {
  const [value, setValue] = useState<Locale>(initial);
  const [isPending, startTransition] = useTransition();

  function pick(next: Locale) {
    if (next === value || isPending) return;
    setValue(next);
    startTransition(() => {
      document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`;
      window.location.reload();
    });
  }

  return (
    <div
      role="radiogroup"
      aria-label="Choose language"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full bg-muted/70 p-0.5',
        responsive ? 'hidden md:inline-flex' : 'inline-flex',
        isPending && 'opacity-70',
      )}
    >
      {OPTIONS.map((opt) => {
        const active = opt.code === value;
        return (
          <button
            key={opt.code}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.full}
            onClick={() => pick(opt.code)}
            disabled={isPending}
            className={cn(
              // Tighter on mobile (where every pixel counts), grows from sm+
              'inline-flex min-w-[30px] items-center justify-center rounded-full px-2 py-1 text-[11.5px] font-semibold transition-colors sm:min-w-[34px] sm:px-2.5 sm:py-1.5 sm:text-[12.5px]',
              active
                ? 'bg-background text-primary shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.short}
          </button>
        );
      })}
    </div>
  );
}
