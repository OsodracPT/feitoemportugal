/**
 * Lazy loader shared by the home-page suggestions and the listing.
 *
 * Both the index and MiniSearch itself are fetched on first use, so a visitor
 * who never searches downloads neither. Keep the imports of `search-client.ts`
 * dynamic: a static one would pull MiniSearch into the initial page bundle.
 */
import type MiniSearchType from 'minisearch';
import type { SearchDoc } from './search-config.ts';

export const INDEX_URL = '/search-index.json';

export interface SearchHit {
  id: string;
  score: number;
  display: {
    name: string;
    pt: { label: string; url: string };
    en: { label: string; url: string };
  };
}

type Client = typeof import('./search-client.ts');

let index: MiniSearchType<SearchDoc> | null = null;
let client: Client | null = null;
let pending: Promise<MiniSearchType<SearchDoc>> | null = null;

export const isReady = (): boolean => index !== null;

export function loadIndex(): Promise<MiniSearchType<SearchDoc>> {
  if (index) return Promise.resolve(index);
  if (!pending) {
    // Any failure clears `pending`, so the next keystroke retries instead of
    // the box staying broken until a reload.
    pending = (async () => {
      try {
        const [module, response] = await Promise.all([
          import('./search-client.ts'),
          fetch(INDEX_URL),
        ]);
        if (!response.ok) throw new Error(`search index: HTTP ${response.status}`);
        client = module;
        index = module.createIndex((await response.json()) as SearchDoc[]);
        return index;
      } catch (error) {
        pending = null;
        throw error;
      }
    })();
  }
  return pending;
}

/** Ranked matches, best first. Throws if the index cannot be loaded. */
export async function searchBrands(query: string): Promise<SearchHit[]> {
  const loaded = await loadIndex();
  const module = client ?? (await import('./search-client.ts'));
  return module.searchBrands(loaded, query) as unknown as SearchHit[];
}
