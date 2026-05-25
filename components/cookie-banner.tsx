'use client';

import { useState, useSyncExternalStore, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/i18n/routing';

const STORAGE_KEY = 'cookie-consent-v1';
const AUTHORED: ReadonlySet<Locale> = new Set<Locale>(['en', 'ml', 'hi']);

type CategoryKey = 'essential' | 'functional' | 'analytics' | 'marketing';

// External-system store: read whether the user has already decided.
// `null` snapshot during SSR (server has no localStorage) and the first
// client render — both render nothing, which avoids hydration mismatch.
function readDecisionSnapshot(): boolean | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

function subscribeToDecisionChanges(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', onStoreChange);
  return () => window.removeEventListener('storage', onStoreChange);
}

function readCookieLocale(): Locale {
  if (typeof document === 'undefined') return 'en';
  const m = document.cookie.match(/(?:^|;\s*)locale=([^;]+)/);
  const v = m ? decodeURIComponent(m[1] ?? '') : '';
  return (LOCALES as readonly string[]).includes(v) ? (v as Locale) : 'en';
}

export function CookieBanner() {
  const decidedClient = useSyncExternalStore(
    subscribeToDecisionChanges,
    readDecisionSnapshot,
    () => null,
  );
  // Suppressed banner explicitly after Save/Accept/Reject (no roundtrip wait).
  const [suppressed, setSuppressed] = useState(false);
  const [choices, setChoices] = useState<Record<CategoryKey, boolean>>({
    essential: true,
    functional: false,
    analytics: false,
    marketing: false,
  });
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('cookies');

  const persist = async (accepted: CategoryKey[]) => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ accepted, ts: Date.now() }),
      );
    } catch {
      // localStorage unavailable; we still POST so the server has a record.
    }
    setSuppressed(true);
    try {
      await fetch('/api/cookies/consent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accepted }),
      });
    } catch {
      // best-effort
    }
  };

  const onLocaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as Locale;
    startTransition(() => {
      document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`;
      window.location.reload();
    });
  };

  // Server render + first client render: decidedClient === null → render nothing.
  // After mount: decidedClient is true when localStorage already has a value, so
  // the banner stays hidden. Until the user clicks, it stays visible.
  if (decidedClient === null) return null;
  if (decidedClient || suppressed) return null;

  const CATEGORIES: { key: CategoryKey; essential: boolean }[] = [
    { key: 'essential', essential: true },
    { key: 'functional', essential: false },
    { key: 'analytics', essential: false },
    { key: 'marketing', essential: false },
  ];

  const acceptAll = () => persist(CATEGORIES.map((c) => c.key));
  const rejectAll = () => persist(CATEGORIES.filter((c) => c.essential).map((c) => c.key));
  const saveChoices = () =>
    persist(
      Object.entries(choices)
        .filter(([, v]) => v)
        .map(([k]) => k as CategoryKey),
    );

  const currentLocale = readCookieLocale();

  return (
    <div
      role="dialog"
      aria-label={t('title')}
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 px-4 py-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2 md:max-w-md">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">{t('title')}</h2>
            <label className="flex items-center gap-2 text-[10px]" aria-label="Banner language">
              <span className="uppercase tracking-wider text-muted-foreground">Lang</span>
              <select
                value={currentLocale}
                onChange={onLocaleChange}
                disabled={isPending}
                className="h-7 rounded border bg-transparent px-1 text-[11px]"
              >
                {LOCALES.map((code) => (
                  <option key={code} value={code}>
                    {LOCALE_LABELS[code]} · {code}
                    {AUTHORED.has(code) ? '' : ' (en)'}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs text-muted-foreground">{t('description')}</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {CATEGORIES.map((c) => (
              <label key={c.key} className="flex items-start gap-2 rounded border p-2">
                <input
                  type="checkbox"
                  checked={c.essential ? true : choices[c.key]}
                  disabled={c.essential}
                  onChange={(e) =>
                    setChoices((prev) => ({ ...prev, [c.key]: e.target.checked }))
                  }
                />
                <div>
                  <p className="font-medium">{t(`${c.key}.name`)}</p>
                  <p className="text-[10px] text-muted-foreground">{t(`${c.key}.description`)}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={rejectAll}>
              {t('reject')}
            </Button>
            <Button size="sm" variant="outline" onClick={saveChoices}>
              {t('savePreferences')}
            </Button>
            <Button size="sm" onClick={acceptAll}>
              {t('accept')}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground md:text-right">
            {t('auditNote')}
          </p>
        </div>
      </div>
    </div>
  );
}
