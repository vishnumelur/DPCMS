import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', 'tests/e2e/**'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['lib/**', 'app/**'],
      exclude: ['**/*.test.ts', 'app/**/page.tsx', 'app/**/layout.tsx', 'app/**/route.ts'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './') },
  },
});
