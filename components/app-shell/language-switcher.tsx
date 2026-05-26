'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';

// Hand-authored UI bundles. Every other code falls back to en at request time
// (see i18n/request.ts). We surface that distinction in the dropdown.
const AUTHORED: ReadonlySet<Locale> = new Set<Locale>(['en', 'ml', 'hi']);

type Props = {
  initial?: Locale;
  /**
   * When `true` (default), the switcher hides on mobile (`hidden md:flex`) and shows
   * on tablet+ — desktop usage. When `false`, the switcher is always visible — used
   * inside the mobile drawer.
   */
  responsive?: boolean;
};

export function LanguageSwitcher({ initial = 'en', responsive = true }: Props) {
  const [value, setValue] = useState<Locale>(initial);
  const [isPending, startTransition] = useTransition();
  const tNav = useTranslations('nav');

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Locale;
    setValue(next);
    startTransition(() => {
      // Persist for 1 year and force a fresh server render so request.ts picks up the cookie.
      document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`;
      window.location.reload();
    });
  }

  return (
    <label
      className={cn(
        'items-center gap-2',
        responsive ? 'hidden md:flex' : 'flex',
      )}
      aria-label="Choose language"
    >
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {tNav('lang')}
      </span>
      <select
        value={value}
        onChange={onChange}
        disabled={isPending}
        className="h-8 rounded border border-input bg-transparent px-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {LOCALES.map((code) => {
          const label = LOCALE_LABELS[code];
          const fallback = AUTHORED.has(code) ? '' : ' (en fallback)';
          return (
            <option key={code} value={code}>
              {label} · {code}
              {fallback}
            </option>
          );
        })}
      </select>
    </label>
  );
}
