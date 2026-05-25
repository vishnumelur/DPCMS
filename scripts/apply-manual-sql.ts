import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Aborting.');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const dir = path.resolve('db/migrations/_manual');

/**
 * Split a SQL script into individual statements while respecting:
 *   - dollar-quoted strings:  $$ ... $$  and  $tag$ ... $tag$
 *   - single-quoted strings:  '...'      (with '' escapes)
 *   - line comments:          -- ...
 *   - block comments:         /* ... *\/
 *
 * A naive split on `;\s*\n` would tear apart `DO $$ ... END$$;` blocks
 * because the body of the block also contains `;\n`.
 */
function splitStatements(source: string): string[] {
  const statements: string[] = [];
  let buf = '';
  let i = 0;
  const len = source.length;

  let inSingle = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag: string | null = null; // e.g. "" for `$$`, "tag" for `$tag$`

  while (i < len) {
    const ch = source[i];
    const next = source[i + 1];

    // End of line comment
    if (inLineComment) {
      buf += ch;
      if (ch === '\n') inLineComment = false;
      i++;
      continue;
    }

    // End of block comment
    if (inBlockComment) {
      buf += ch;
      if (ch === '*' && next === '/') {
        buf += next;
        i += 2;
        inBlockComment = false;
        continue;
      }
      i++;
      continue;
    }

    // Inside single-quoted string
    if (inSingle) {
      buf += ch;
      if (ch === "'") {
        if (next === "'") {
          // Escaped single quote
          buf += next;
          i += 2;
          continue;
        }
        inSingle = false;
      }
      i++;
      continue;
    }

    // Inside dollar-quoted string
    if (dollarTag !== null) {
      buf += ch;
      if (ch === '$') {
        const closer = `$${dollarTag}$`;
        if (source.startsWith(closer, i)) {
          // Append the rest of the closer (we already appended the leading $)
          buf += closer.slice(1);
          i += closer.length;
          dollarTag = null;
          continue;
        }
      }
      i++;
      continue;
    }

    // Not in any string/comment — check for openers
    if (ch === '-' && next === '-') {
      inLineComment = true;
      buf += ch;
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      buf += ch + next;
      i += 2;
      continue;
    }
    if (ch === "'") {
      inSingle = true;
      buf += ch;
      i++;
      continue;
    }
    if (ch === '$') {
      // Detect $tag$ where tag is empty or [A-Za-z_][A-Za-z0-9_]*
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(source.slice(i));
      if (m) {
        dollarTag = m[1] ?? '';
        buf += m[0];
        i += m[0].length;
        continue;
      }
    }

    // Statement terminator at top level
    if (ch === ';') {
      buf += ch;
      const trimmed = buf.trim();
      if (trimmed.length > 0) statements.push(trimmed);
      buf = '';
      i++;
      continue;
    }

    buf += ch;
    i++;
  }

  const tail = buf.trim();
  if (tail.length > 0) statements.push(tail);
  return statements;
}

async function main(): Promise<void> {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const f of files) {
    const content = readFileSync(path.join(dir, f), 'utf8');
    console.log(`Applying ${f}…`);
    const stmts = splitStatements(content);
    for (const stmt of stmts) {
      // Use sql.query() for raw text; sql`` is the tagged-template form.
      // Trailing ; is fine; neon HTTP driver accepts it.
      await sql.query(stmt);
    }
  }
  console.log('Manual SQL applied.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
