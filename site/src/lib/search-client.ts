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

/**
 * Joining words that would otherwise have to match too: "sapato de criança"
 * means sapato + criança. Dropped from queries only, never from the index.
 */
const STOPWORDS = new Set([
  'a', 'o', 'as', 'os', 'e', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas',
  'para', 'com', 'por', 'um', 'uma', 'the', 'and', 'for', 'of', 'with', 'in',
]);

/** A typo is tolerated only in a word long enough that one letter is not a different word. */
const MIN_FUZZY_LENGTH = 6;

export interface SearchOutcome {
  hits: SearchResult[];
  /** True when no brand has every word, so `hits` match only some of them. */
  partial: boolean;
}

/**
 * Whole words first, so "gin" finds gin before "ginásio"; word starts next, so
 * results appear while typing. Only when that finds nothing does a one-letter
 * typo count ("vinho" never lands on "linho"), and only when no brand has every
 * word do brands with some of them come back, marked `partial`.
 */
export function searchBrands(index: MiniSearch<SearchDoc>, query: string): SearchOutcome {
  const words = query.trim().split(SEPARATORS).filter(Boolean);
  const kept = words.filter((word) => !STOPWORDS.has(fold(word)));
  const text = (kept.length > 0 ? kept : words).join(' ');
  if (!text) return { hits: [], partial: false };

  const typo = (term: string) => (term.length >= MIN_FUZZY_LENGTH ? 1 : false);
  const run = (prefix: boolean, fuzzy: typeof typo | false, combineWith: 'AND' | 'OR') =>
    index.search(text, { prefix, fuzzy, combineWith, boost: { ...SEARCH_BOOSTS } });

  // Whole words, then word starts (typing "sap"), then one-letter typos.
  for (const [prefix, fuzzy] of [[false, false], [true, false], [true, typo]] as const) {
    const hits = run(prefix, fuzzy, 'AND');
    if (hits.length > 0) return { hits, partial: false };
  }
  const some = kept.length > 1 ? run(true, typo, 'OR') : [];
  return { hits: some, partial: some.length > 0 };
}
