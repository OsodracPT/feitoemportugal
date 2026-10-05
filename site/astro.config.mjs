// @ts-check
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';

/** Absolute path to the repository's data/ directory, baked in at build time. */
const dataDir = fileURLToPath(new URL('../data', import.meta.url));

/**
 * The canonical origin. Overridable so a staging host or a local build can
 * produce matching canonicals and sitemap URLs.
 */
const site = process.env.SITE_URL ?? 'https://feitoemportugal.org';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'directory',
    // Hashed asset file names, so Caddy can cache them for a long time.
    assets: '_assets',
  },
  i18n: {
    defaultLocale: 'pt',
    locales: ['pt', 'en'],
    routing: {
      // Portuguese lives at the root; English under /en/.
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
  vite: {
    define: {
      'import.meta.env.DATA_DIR': JSON.stringify(dataDir),
    },
    // MiniSearch is only reached through a lazy import inside a client script, so
    // Vite would discover it late, re-optimise, and 504 the already-issued URL.
    optimizeDeps: {
      include: ['minisearch'],
    },
  },
  devToolbar: { enabled: false },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
