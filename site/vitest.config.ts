import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  define: {
    'import.meta.env.DATA_DIR': JSON.stringify(
      fileURLToPath(new URL('../data', import.meta.url)),
    ),
  },
  test: { include: ['src/**/*.test.ts'] },
});
