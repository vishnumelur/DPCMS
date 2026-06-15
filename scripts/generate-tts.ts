/**
 * Pre-generate a static MP3 of the public privacy notice for the "Read aloud"
 * button, so playback does not depend on the OS speech voice (which is robotic
 * on Linux/eSpeak). Uses the public Google Translate TTS voice (clear, female,
 * no API key). Output is committed to public/tts/ and served as a static file.
 *
 * Run:  npx tsx scripts/generate-tts.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { PUBLIC_NOTICE_SPOKEN } from '@/lib/notice/public-notice-text';

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const MAX = 190; // Google Translate TTS caps each request at ~200 chars

/** Split text into <=MAX-char chunks on sentence, then word, boundaries. */
function chunk(text: string): string[] {
  const sentences = text.replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]*/g) ?? [text];
  const out: string[] = [];
  for (const s of sentences) {
    const sentence = s.trim();
    if (sentence.length <= MAX) {
      if (sentence) out.push(sentence);
      continue;
    }
    let line = '';
    for (const word of sentence.split(' ')) {
      if ((line + ' ' + word).trim().length > MAX) {
        if (line) out.push(line.trim());
        line = word;
      } else {
        line = (line + ' ' + word).trim();
      }
    }
    if (line) out.push(line.trim());
  }
  return out;
}

async function fetchChunk(text: string, tl: string): Promise<Buffer> {
  const url =
    `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${tl}` +
    `&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Referer: 'https://translate.google.com/' } });
  if (!res.ok) throw new Error(`TTS chunk failed (${res.status}) for: ${text.slice(0, 40)}…`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200) throw new Error(`TTS chunk suspiciously small for: ${text.slice(0, 40)}…`);
  return buf;
}

async function generate(text: string, tl: string, outFile: string) {
  const chunks = chunk(text);
  console.log(`Generating ${outFile} — ${chunks.length} chunks (${text.length} chars)…`);
  const buffers: Buffer[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    if (!c) continue;
    buffers.push(await fetchChunk(c, tl));
    process.stdout.write(`  ${i + 1}/${chunks.length}\r`);
    await new Promise((r) => setTimeout(r, 200)); // be gentle on the endpoint
  }
  const outDir = path.resolve('public/tts');
  mkdirSync(outDir, { recursive: true });
  const full = Buffer.concat(buffers);
  writeFileSync(path.join(outDir, outFile), full);
  console.log(`\n✓ Wrote public/tts/${outFile} (${(full.length / 1024).toFixed(0)} KB)`);
}

async function main() {
  await generate(PUBLIC_NOTICE_SPOKEN, 'en', 'public-notice-en.mp3');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
