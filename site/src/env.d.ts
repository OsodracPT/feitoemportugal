/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Absolute path to the repository's data/ directory (set in astro.config.mjs). */
  readonly DATA_DIR: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
