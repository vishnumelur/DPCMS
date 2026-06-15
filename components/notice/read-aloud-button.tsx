'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  text: string;
  locale: string;
  /**
   * Optional pre-generated audio file (e.g. /tts/public-notice-en.mp3). When set,
   * the button plays this clear, machine-independent voice instead of the OS
   * speech engine — which is robotic on Linux/eSpeak. Falls back to Web Speech
   * automatically if the file fails to load.
   */
  audioSrc?: string;
};

// Maps our internal locale codes to BCP-47 voice tags consumed by the browser's
// Web Speech API. Unmapped locales fall back to en-IN — speech synthesis will
// pick the closest voice it has installed.
const VOICE_LOCALES: Record<string, string> = {
  en: 'en-IN', ml: 'ml-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN',
  mr: 'mr-IN', bn: 'bn-IN', gu: 'gu-IN', pa: 'pa-IN', ur: 'ur-IN', or: 'or-IN', as: 'as-IN',
};

/**
 * Choose the clearest available voice for a BCP-47 lang tag. The browser default
 * (when only `lang` is set) is often a robotic fallback; explicitly scoring and
 * selecting a voice gives a much clearer result wherever a good voice exists.
 */
// Prefer a clear, natural, FEMALE voice for the requested language and avoid
// robotic local engines (eSpeak/Festival). On machines with good voices
// (Edge/Chrome desktop ship free Microsoft/Google neural voices such as
// "Microsoft Neerja Online (Natural)") this yields a professional result.
const NATURAL_RE = /natural|neural|online|premium|enhanced/i;
const FEMALE_RE =
  /female|aria|jenny|neerja|swara|kalpana|heera|priya|ananya|samantha|zira|susan|fiona|tessa|veena|raveena|google uk english female/i;
const ROBOTIC_RE = /espeak|festival|pico|flite|robosoft/i;

export function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang: string,
): SpeechSynthesisVoice | undefined {
  if (!voices.length) return undefined;
  const base = (lang.split('-')[0] ?? lang).toLowerCase();
  const byLang = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
  const pool = byLang.length ? byLang : voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  const candidates = pool.length ? pool : voices;
  const score = (v: SpeechSynthesisVoice): number => {
    let s = 0;
    if (v.lang.toLowerCase() === lang.toLowerCase()) s += 4; // exact region
    if (NATURAL_RE.test(v.name)) s += 6; // studio-quality neural engines first
    if (/google|microsoft|apple|siri/i.test(v.name)) s += 2;
    if (FEMALE_RE.test(v.name)) s += 5; // prefer a female voice
    if (ROBOTIC_RE.test(v.name)) s -= 8; // push robotic engines to the bottom
    if (v.default) s += 1;
    return s;
  };
  return [...candidates].sort((a, b) => score(b) - score(a))[0];
}

/** Split text into short sentence-sized chunks so long passages aren't truncated. */
export function chunkText(text: string): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const parts = clean.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g);
  return (parts ?? [clean]).map((s) => s.trim()).filter(Boolean);
}

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

export function ReadAloudButton({ text, locale, audioSrc }: Props) {
  const supported = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const [speaking, setSpeaking] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // getVoices() is populated asynchronously on some browsers — listen for the
  // voiceschanged event so a good voice is available by the time the user clicks.
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  // Render whenever we have a pre-generated audio file (works without the Web
  // Speech API); otherwise only when the browser supports speech synthesis.
  if (!audioSrc && !supported) return null;

  function stop() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }

  function speakWithBrowser() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeaking(false);
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const lang = VOICE_LOCALES[locale] ?? 'en-IN';
    const voices = voicesRef.current.length ? voicesRef.current : synth.getVoices();
    const voice = pickVoice(voices, lang);
    const parts = chunkText(text);
    if (!parts.length) return;
    setSpeaking(true);
    parts.forEach((part, i) => {
      const utter = new SpeechSynthesisUtterance(part);
      if (voice) utter.voice = voice;
      utter.lang = voice?.lang ?? lang;
      utter.rate = 0.95; // slightly slower than default for clarity
      utter.pitch = 1;
      utter.volume = 1;
      if (i === parts.length - 1) utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      synth.speak(utter);
    });
  }

  function play() {
    // Prefer the pre-generated clear voice; fall back to the browser engine.
    if (audioSrc) {
      const audio = audioRef.current ?? new Audio();
      audioRef.current = audio;
      audio.src = audioSrc;
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => speakWithBrowser();
      setSpeaking(true);
      audio.play().catch(() => speakWithBrowser());
      return;
    }
    speakWithBrowser();
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
