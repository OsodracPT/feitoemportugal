/** Project-wide settings that are not content. */
export const SITE = {
  /** Canonical origin; mirrors `site` in astro.config.mjs. */
  origin: process.env.SITE_URL || 'https://feitoemportugal.org',
  /** Repository used for issue links (corrections, submissions). */
  repo: process.env.GITHUB_REPO_URL || 'https://github.com/OsodracPT/feitoemportugal',
  dataLicense: { id: 'CC-BY-4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
  codeLicense: { id: 'MIT', url: 'https://opensource.org/licenses/MIT' },
} as const;

/**
 * Landing pages (category, subcategory, region, category x region) are only
 * generated above this many published brands, to avoid thin pages.
 */
export const MIN_BRANDS_FOR_LANDING = 3;

/** A GitHub issue form; suggestions go through these until the site has its own form. */
export const issueForm = (template: string): string => `${SITE.repo}/issues/new?template=${template}`;
