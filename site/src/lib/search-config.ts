/**
 * Shared between the build-time index builder and the browser.
 * Must stay free of server-only imports: everything here ships to the client.
 */

export interface SearchDoc {
  /** MiniSearch id and the DOM hook on the brand card. */
  id: string;
  // --- indexed fields ---
  name: string;
  tags: string;
  category: string;
  region: string;
  description: string;
  // --- stored for rendering suggestions, not indexed ---
  display: {
    name: string;
    pt: { label: string; url: string };
    en: { label: string; url: string };
  };
}

/** Field weights: name > tags and synonyms > category > region > description. */
export const SEARCH_BOOSTS = {
  name: 6,
  tags: 3,
  category: 2.5,
  region: 2,
  description: 1,
} as const;

export const SEARCH_FIELDS = ['name', 'tags', 'category', 'region', 'description'] as const;
