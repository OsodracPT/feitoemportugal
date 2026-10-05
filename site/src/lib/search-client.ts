import MiniSearch, { type SearchResult } from 'minisearch';
import type { SearchDoc } from './search-config.ts';
import { SEARCH_BOOSTS, SEARCH_FIELDS } from './search-config.ts';

/** Accent- and case-insensitive: "acores" has to find "Açores". */
export const fold = (value: string): string =>
  value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const SEPARATORS = /[\s/,.;:()[\]"'’–—_-]+/u;

export function createIndex(docs: SearchDoc[]): MiniSearch<SearchDoc> {
  const index = new MiniSearch<SearchDoc>({
    fields: [...SEARCH_FIELDS],
    storeFields: ['display'],
    processTerm: (term) => fold(term) || null,
    tokenize: (text) => text.split(SEPARATORS).filter(Boolean),
  });
  index.addAll(docs);
  return index;
}

/** Prefix + fuzzy so partial words and small typos still land. */
export function searchBrands(index: MiniSearch<SearchDoc>, query: string): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  return index.search(trimmed, {
    prefix: true,
    fuzzy: 0.2,
    combineWith: 'AND',
    boost: { ...SEARCH_BOOSTS },
  });
}
