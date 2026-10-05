/**
 * Filter and sort logic for the brand listing.
 *
 * Client-safe: this module must not import the data layer, since it ships to
 * the browser. The facets it needs travel on the cards as `data-facets`.
 */
import type { Brand } from '@fep/schema';

/** Query-string key for each filter group. Short, because they end up in links. */
export const FILTER_KEYS = [
  'cat',
  'sub',
  'dist',
  'tag',
  'price',
  'scope',
  'sust',
  'verified',
  'shop',
] as const;

export type FilterKey = (typeof FILTER_KEYS)[number];

/** Selected values per group. Within a group OR, across groups AND. */
export type Filters = Record<FilterKey, string[]>;

export const SORTS = ['relevance', 'name', 'recent'] as const;
export type Sort = (typeof SORTS)[number];
export const DEFAULT_SORT: Sort = 'relevance';

export interface ListingState {
  q: string;
  sort: Sort;
  filters: Filters;
}

/** What one brand card carries, so filtering needs no second fetch. */
export interface BrandFacets {
  slug: string;
  /** `meta.added`, for the "newest" sort. */
  added: string;
  values: Filters;
}

export const emptyFilters = (): Filters =>
  Object.fromEntries(FILTER_KEYS.map((key) => [key, [] as string[]])) as unknown as Filters;

/** A subcategory id is only unique inside its category, so it is namespaced. */
export const subValue = (categoryId: string, subcategoryId: string): string =>
  `${categoryId}:${subcategoryId}`;

export const subParent = (value: string): string => value.split(':')[0] ?? '';

export function brandFacets(brand: Brand): BrandFacets {
  const shop: string[] = [];
  if (brand.where_to_buy?.online_store) shop.push('online');
  if ((brand.where_to_buy?.physical_stores ?? []).length > 0) shop.push('physical');

  return {
    slug: brand.slug,
    added: brand.meta.added,
    values: {
      cat: [brand.category],
      sub: brand.subcategory ? [subValue(brand.category, brand.subcategory)] : [],
      dist: brand.location ? [brand.location.district] : [],
      tag: brand.tags,
      price: brand.price_range ? [String(brand.price_range)] : [],
      scope: [brand.production.scope],
      sust: brand.sustainability?.practices ?? [],
      verified: brand.verification?.verified ? ['yes'] : [],
      shop,
    },
  };
}

/** `cat=calcado sub=calcado:sapatos tag=pele` — one attribute per card. */
export const serializeFacets = (facets: BrandFacets): string =>
  FILTER_KEYS.flatMap((key) => facets.values[key].map((value) => `${key}=${value}`)).join(' ');

export function parseFacets(slug: string, added: string, attribute: string): BrandFacets {
  const values = emptyFilters();
  for (const token of attribute.split(/\s+/).filter(Boolean)) {
    const separator = token.indexOf('=');
    if (separator === -1) continue;
    const key = token.slice(0, separator) as FilterKey;
    if (key in values) values[key].push(token.slice(separator + 1));
  }
  return { slug, added, values };
}

const hasOverlap = (selected: string[], actual: string[]): boolean =>
  selected.some((value) => actual.includes(value));

/**
 * A brand matches when every active group has at least one of its values.
 * `skip` leaves one group out, which is how facet counts are computed.
 */
export function matchesFilters(
  facets: BrandFacets,
  filters: Filters,
  skip?: FilterKey,
): boolean {
  for (const key of FILTER_KEYS) {
    if (key === skip) continue;
    const selected = filters[key];
    if (selected.length > 0 && !hasOverlap(selected, facets.values[key])) return false;
  }
  return true;
}

export const activeFilterCount = (filters: Filters): number =>
  FILTER_KEYS.reduce((total, key) => total + filters[key].length, 0);

/**
 * How many brands each option of `key` would still match, given the other
 * groups and the current search — the usual faceted-search count, so a user
 * can see which options lead somewhere before clicking.
 */
export function facetCounts(
  all: BrandFacets[],
  filters: Filters,
  key: FilterKey,
  matchedSlugs?: Set<string> | null,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const facets of all) {
    if (matchedSlugs && !matchedSlugs.has(facets.slug)) continue;
    if (!matchesFilters(facets, filters, key)) continue;
    for (const value of facets.values[key]) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Visible brands in display order. `rank` holds search positions; without a
 * search, "relevance" means the server's alphabetical order.
 */
export function orderedSlugs(
  all: BrandFacets[],
  state: ListingState,
  rank: Map<string, number> | null,
): string[] {
  const matched = all.filter(
    (facets) => (!rank || rank.has(facets.slug)) && matchesFilters(facets, state.filters),
  );

  // `all` arrives in the server's order, which is alphabetical by name under
  // Portuguese collation — cheaper and more correct than re-sorting strings here.
  const position = new Map(all.map((facets, index) => [facets.slug, index]));
  const byName = (a: BrandFacets, b: BrandFacets) =>
    (position.get(a.slug) ?? 0) - (position.get(b.slug) ?? 0);

  const sorted = [...matched];
  if (state.sort === 'recent') {
    sorted.sort((a, b) => b.added.localeCompare(a.added) || byName(a, b));
  } else if (state.sort === 'name' || !rank) {
    sorted.sort(byName);
  } else {
    sorted.sort((a, b) => (rank.get(a.slug) ?? 0) - (rank.get(b.slug) ?? 0));
  }
  return sorted.map((facets) => facets.slug);
}

const isSort = (value: string | null): value is Sort =>
  value !== null && (SORTS as readonly string[]).includes(value);

export function parseListingState(search: string): ListingState {
  const params = new URLSearchParams(search);
  const filters = emptyFilters();
  for (const key of FILTER_KEYS) {
    const raw = params.get(key);
    if (!raw) continue;
    filters[key] = raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }
  const sort = params.get('sort');
  return {
    q: (params.get('q') ?? '').trim(),
    sort: isSort(sort) ? sort : DEFAULT_SORT,
    filters,
  };
}

/** The inverse, keeping the parameter order stable so URLs are comparable. */
export function serializeListingState(state: ListingState): string {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  for (const key of FILTER_KEYS) {
    if (state.filters[key].length > 0) params.set(key, state.filters[key].join(','));
  }
  if (state.sort !== DEFAULT_SORT) params.set('sort', state.sort);
  const query = params.toString();
  return query ? `?${query}` : '';
}
