const PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'EMAIL', re: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi },
  { name: 'AADHAAR', re: /\b\d{4}\s?\d{4}\s?\d{4}\b/g },
  { name: 'PHONE', re: /\+?\d[\d\s\-()]{8,}\d/g },
  { name: 'PAN', re: /\b[A-Z]{5}\d{4}[A-Z]\b/g },
];

export function redactPII(input: string): string {
  let out = input;
  for (const p of PATTERNS) out = out.replace(p.re, `[${p.name}]`);
  return out;
}
