// @ts-check
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';

/** Absolute path to the repository's data/ directory, baked in at build time. */
const dataDir = fileURLToPath(new URL('../data', import.meta.url));

/**
 * The canonical origin. Overridable so a staging host or a local build can
 * produce matching canonicals and sitemap URLs.
 */
const site = process.env.SITE_URL || 'https://feitoemportugal.org';

/**
 * Umami website id. Unset (forks, local builds) means no analytics script at
 * all; the tracker itself is proxied on the site's own origin (deploy/nginx.conf).
 */
const umamiWebsiteId = process.env.UMAMI_WEBSITE_ID || '';

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
      'import.meta.env.UMAMI_WEBSITE_ID': JSON.stringify(umamiWebsiteId),
    },
    // MiniSearch is only reached through a lazy import inside a client script, so
    // Vite would discover it late, re-optimise, and 504 the already-issued URL.
    optimizeDeps: {
      include: ['minisearch'],
    },
    // Astro inlines any script under this size, and production's CSP has no
    // inline allowance (deploy/security-headers.conf): always emit a file.
    build: {
      assetsInlineLimit: 0,
    },
  },
  devToolbar: { enabled: false },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
