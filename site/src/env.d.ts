/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Absolute path to the repository's data/ directory (set in astro.config.mjs). */
  readonly DATA_DIR: string;
  /** Umami website id, or '' for no analytics (set in astro.config.mjs). */
  readonly UMAMI_WEBSITE_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
