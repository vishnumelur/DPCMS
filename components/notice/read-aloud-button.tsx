'use client';

import { useState, useSyncExternalStore } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  text: string;
  locale: string;
};

// Maps our internal locale codes to BCP-47 voice tags consumed by the browser's
// Web Speech API. Unmapped locales fall back to en-IN — speech_synthesis will
// pick the closest voice it has installed.
const VOICE_LOCALES: Record<string, string> = {
  en: 'en-IN', ml: 'ml-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN',
  mr: 'mr-IN', bn: 'bn-IN', gu: 'gu-IN', pa: 'pa-IN', ur: 'ur-IN', or: 'or-IN', as: 'as-IN',
};

// External-system store: detects Web Speech API availability without an effect.
// Returns `null` on the server + first client render to avoid hydration mismatch,
// then resolves to true/false after mount.
function subscribe() {
  // Speech support is constant per browser tab — never changes after load.
  return () => {};
}
function getClientSnapshot(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
function getServerSnapshot(): null {
  return null;
}

export function ReadAloudButton({ text, locale }: Props) {
  const supported = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const [speaking, setSpeaking] = useState(false);

  // Server render + first client render = null → render nothing (no SSR mismatch).
  // After hydration, render only when the browser supports speechSynthesis.
  if (!supported) return null;

  function stop() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  function play() {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = VOICE_LOCALES[locale] ?? 'en-IN';
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={speaking ? stop : play}
      aria-label={speaking ? 'Stop reading aloud' : 'Read this notice aloud'}
    >
      {speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      <span className="ml-2">{speaking ? 'Stop' : 'Read aloud'}</span>
    </Button>
  );
}
