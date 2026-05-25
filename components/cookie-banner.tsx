'use client';

import { useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'cookie-consent-v1';

type CategoryKey = 'essential' | 'functional' | 'analytics' | 'marketing';

const CATEGORIES: { key: CategoryKey; name: string; description: string; essential: boolean }[] = [
  { key: 'essential', name: 'Essential', description: 'Auth, security, session. Always on.', essential: true },
  { key: 'functional', name: 'Functional', description: 'Language, theme, preferences.', essential: false },
  { key: 'analytics', name: 'Analytics', description: 'Aggregate page-view metrics.', essential: false },
  { key: 'marketing', name: 'Marketing', description: 'Personalised promotional content.', essential: false },
];

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

  // Server render + first client render: decidedClient === null → render nothing.
  // After mount: decidedClient is true when localStorage already has a value, so
  // the banner stays hidden. Until the user clicks, it stays visible.
  if (decidedClient === null) return null;
  if (decidedClient || suppressed) return null;

  const acceptAll = () => persist(CATEGORIES.map((c) => c.key));
  const rejectAll = () => persist(CATEGORIES.filter((c) => c.essential).map((c) => c.key));
  const saveChoices = () =>
    persist(
      Object.entries(choices)
        .filter(([, v]) => v)
        .map(([k]) => k as CategoryKey),
    );

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 px-4 py-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2 md:max-w-md">
          <h2 className="text-sm font-semibold">Cookie preferences</h2>
          <p className="text-xs text-muted-foreground">
            We use essential cookies to make this site work. With your consent we also use optional
            cookies for the categories below. You can change your choice any time.
          </p>
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
                  <p className="font-medium">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground">{c.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={rejectAll}>
              Reject all
            </Button>
            <Button size="sm" variant="outline" onClick={saveChoices}>
              Save choices
            </Button>
            <Button size="sm" onClick={acceptAll}>
              Accept all
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground md:text-right">
            Decisions logged in the immutable audit chain.
          </p>
        </div>
      </div>
    </div>
  );
}
