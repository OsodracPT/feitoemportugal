/**
 * Builds the filter UI from the taxonomy and the published brands.
 * Server-only (it reads the data layer); the browser gets just the markup.
 */
import {
  brands,
  categories,
  getCategory,
  getPractice,
  getProduct,
  getRegion,
  getSubcategory,
  getTag,
  regions,
  tags,
  taxonomy,
} from './data.ts';
import { brandFacets, FILTER_KEYS, subParent, type BrandFacets, type FilterKey } from './filters.ts';
import { localized, t, type Lang } from './i18n.ts';

export interface FilterOption {
  value: string;
  label: string;
  /** Accessible name when the label alone is a symbol (price levels). */
  hint?: string;
  /** Category this subcategory belongs to, so the group can follow `cat`. */
  parent?: string;
  count: number;
}

export interface FilterGroup {
  key: FilterKey;
  label: string;
  options: FilterOption[];
  /** The subcategory group only makes sense once a category is chosen. */
  dependsOn?: FilterKey;
}

export const facets: BrandFacets[] = brands.map(brandFacets);

/** How many published brands carry each value of a group. */
function tally(key: FilterKey): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of facets) {
    for (const value of entry.values[key]) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return counts;
}

/** Most populated first; the counts are on screen, so this reads naturally. */
const byCount = (a: FilterOption, b: FilterOption): number =>
  b.count - a.count || a.label.localeCompare(b.label, 'pt');

function labelFor(key: FilterKey, value: string, lang: Lang): string | undefined {
  switch (key) {
    case 'cat':
      return localized(getCategory(value)?.label, lang) || undefined;
    case 'sub': {
      const parent = subParent(value);
      const sub = getSubcategory(parent, value.slice(parent.length + 1));
      return localized(sub?.label, lang) || undefined;
    }
    case 'dist':
      return localized(getRegion(value)?.label, lang) || undefined;
    case 'tag':
      return localized(getTag(value)?.label, lang) || undefined;
    case 'prod':
      return localized(getProduct(value)?.label, lang) || undefined;
    case 'sust':
      return localized(getPractice(value)?.label, lang) || undefined;
    case 'price':
      return '€'.repeat(Number(value));
    case 'scope':
      return t(lang, value === 'total' ? 'filters.scopeTotal' : 'filters.scopePartial');
    case 'verified':
      return t(lang, 'brand.verified');
    case 'shop':
      return t(lang, value === 'online' ? 'brand.onlineStore' : 'brand.physicalStores');
    default:
      return undefined;
  }
}

/** Groups with a meaning of their own keep a fixed order instead of counts. */
const FIXED_ORDER: Partial<Record<FilterKey, readonly string[]>> = {
  price: ['1', '2', '3', '4'],
  scope: ['total', 'parcial'],
  shop: ['online', 'physical'],
  verified: ['yes'],
};

export function filterGroups(lang: Lang): FilterGroup[] {
  return FILTER_KEYS.flatMap((key): FilterGroup[] => {
    const counts = tally(key);
    const fixed = FIXED_ORDER[key];
    const values = fixed ? fixed.filter((value) => counts.has(value)) : [...counts.keys()];

    const options = values.flatMap((value): FilterOption[] => {
      const label = labelFor(key, value, lang);
      if (!label) return [];
      const option: FilterOption = { value, label, count: counts.get(value) ?? 0 };
      if (key === 'sub') option.parent = subParent(value);
      if (key === 'price') option.hint = t(lang, 'filters.priceLevel', { level: Number(value) });
      return [option];
    });

    // An empty group is dropped entirely: no brand is verified yet, so that
    // filter simply does not appear until one is.
    if (options.length === 0) return [];
    if (!fixed) options.sort(byCount);

    const group: FilterGroup = { key, label: t(lang, `filters.groups.${key}`), options };
    if (key === 'sub') group.dependsOn = 'cat';
    return [group];
  });
}

/** Sanity numbers for the UI and for tests. */
export const filterStats = {
  brands: brands.length,
  categories: categories.length,
  regions: regions.length,
  tags: tags.length,
  products: taxonomy.products.length,
  practices: taxonomy.sustainability.practices.length,
};
