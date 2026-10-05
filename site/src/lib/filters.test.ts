import { describe, expect, it } from 'vitest';
import {
  activeFilterCount,
  brandFacets,
  emptyFilters,
  facetCounts,
  matchesFilters,
  orderedSlugs,
  parseFacets,
  parseListingState,
  serializeFacets,
  serializeListingState,
  subValue,
  type BrandFacets,
  type Filters,
} from './filters.ts';
import { filterGroups, facets as realFacets } from './filter-groups.ts';
import { brands } from './data.ts';

const withFilters = (partial: Partial<Filters>): Filters => ({ ...emptyFilters(), ...partial });

const facet = (slug: string, added: string, values: Partial<Filters>): BrandFacets => ({
  slug,
  added,
  values: withFilters(values),
});

// Three stand-ins in the server's order (alphabetical), as the listing gets them.
const sample: BrandFacets[] = [
  facet('alfa', '2026-01-01', { cat: ['calcado'], dist: ['porto'], tag: ['pele'], price: ['3'] }),
  facet('beta', '2026-03-01', {
    cat: ['calcado'],
    sub: [subValue('calcado', 'sapatos')],
    dist: ['braga'],
    tag: ['pele', 'artesanal'],
    shop: ['online'],
  }),
  facet('gama', '2026-02-01', { cat: ['ceramica'], dist: ['porto'], scope: ['parcial'] }),
];

describe('brandFacets', () => {
  it('reads the filterable fields off a brand', () => {
    const brand = brands.find((entry) => entry.slug === 'claus-porto');
    expect(brand).toBeDefined();
    const values = brandFacets(brand!).values;
    expect(values.cat).toEqual(['cosmetica-e-higiene']);
    expect(values.dist).toEqual(['porto']);
    expect(values.scope).toEqual(['total']);
    expect(values.tag).toContain('fabrica-centenaria');
  });

  it('survives a round trip through the card attribute', () => {
    for (const brand of brands) {
      const original = brandFacets(brand);
      const parsed = parseFacets(brand.slug, brand.meta.added, serializeFacets(original));
      expect(parsed).toEqual(original);
    }
  });

  it('marks an online shop only when there is one', () => {
    const withShop = brands.find((brand) => brand.where_to_buy?.online_store);
    const without = brands.find((brand) => !brand.where_to_buy?.online_store);
    expect(brandFacets(withShop!).values.shop).toContain('online');
    expect(brandFacets(without!).values.shop).not.toContain('online');
  });
});

describe('matchesFilters', () => {
  it('ORs inside a group', () => {
    const filters = withFilters({ dist: ['porto', 'braga'] });
    expect(sample.filter((entry) => matchesFilters(entry, filters)).map((e) => e.slug)).toEqual([
      'alfa',
      'beta',
      'gama',
    ]);
  });

  it('ANDs across groups', () => {
    const filters = withFilters({ cat: ['calcado'], dist: ['porto'] });
    expect(sample.filter((entry) => matchesFilters(entry, filters)).map((e) => e.slug)).toEqual([
      'alfa',
    ]);
  });

  it('excludes a brand that has no value in an active group', () => {
    // `gama` has no price, so any price filter leaves it out.
    expect(matchesFilters(sample[2]!, withFilters({ price: ['3'] }))).toBe(false);
  });

  it('skips one group, which is how counts are computed', () => {
    const filters = withFilters({ cat: ['ceramica'], dist: ['porto'] });
    expect(matchesFilters(sample[0]!, filters)).toBe(false);
    expect(matchesFilters(sample[0]!, filters, 'cat')).toBe(true);
  });
});

describe('facetCounts', () => {
  it('counts options against the other groups, not its own', () => {
    const counts = facetCounts(sample, withFilters({ cat: ['calcado'] }), 'dist');
    expect(counts.get('porto')).toBe(1);
    expect(counts.get('braga')).toBe(1);

    const own = facetCounts(sample, withFilters({ cat: ['calcado'] }), 'cat');
    expect(own.get('ceramica')).toBe(1);
  });

  it('respects the active search', () => {
    const matched = new Set(['gama']);
    const counts = facetCounts(sample, emptyFilters(), 'dist', matched);
    expect(counts.get('porto')).toBe(1);
    expect(counts.has('braga')).toBe(false);
  });
});

describe('orderedSlugs', () => {
  const state = (partial: Partial<ReturnType<typeof parseListingState>>) => ({
    q: '',
    sort: 'relevance' as const,
    filters: emptyFilters(),
    ...partial,
  });

  it('keeps the server order when there is no query', () => {
    expect(orderedSlugs(sample, state({}), null)).toEqual(['alfa', 'beta', 'gama']);
  });

  it('follows the search ranking', () => {
    const rank = new Map([
      ['gama', 0],
      ['alfa', 1],
    ]);
    expect(orderedSlugs(sample, state({ q: 'x' }), rank)).toEqual(['gama', 'alfa']);
  });

  it('sorts by name even with a query, when asked', () => {
    const rank = new Map([
      ['gama', 0],
      ['alfa', 1],
    ]);
    expect(orderedSlugs(sample, state({ q: 'x', sort: 'name' }), rank)).toEqual(['alfa', 'gama']);
  });

  it('sorts newest first', () => {
    expect(orderedSlugs(sample, state({ sort: 'recent' }), null)).toEqual([
      'beta',
      'gama',
      'alfa',
    ]);
  });

  it('combines the query with the filters', () => {
    const rank = new Map([
      ['alfa', 0],
      ['beta', 1],
      ['gama', 2],
    ]);
    const result = orderedSlugs(sample, state({ q: 'x', filters: withFilters({ dist: ['porto'] }) }), rank);
    expect(result).toEqual(['alfa', 'gama']);
  });
});

describe('URL state', () => {
  it('round-trips a full state', () => {
    const state = {
      q: 'sapatos pele',
      sort: 'recent' as const,
      filters: withFilters({ cat: ['calcado'], dist: ['porto', 'braga'], price: ['2', '3'] }),
    };
    const query = serializeListingState(state);
    expect(query).toBe('?q=sapatos+pele&cat=calcado&dist=porto%2Cbraga&price=2%2C3&sort=recent');
    expect(parseListingState(query)).toEqual(state);
  });

  it('leaves the default sort out of the URL', () => {
    const query = serializeListingState({
      q: '',
      sort: 'relevance',
      filters: withFilters({ cat: ['vinho'] }),
    });
    expect(query).toBe('?cat=vinho');
  });

  it('is empty for an untouched listing', () => {
    expect(serializeListingState({ q: '', sort: 'relevance', filters: emptyFilters() })).toBe('');
  });

  it('ignores an unknown sort and unknown keys', () => {
    const state = parseListingState('?sort=cheapest&colour=red&q=+naz+');
    expect(state.sort).toBe('relevance');
    expect(state.q).toBe('naz');
    expect(activeFilterCount(state.filters)).toBe(0);
  });
});

describe('filter groups built from the real data', () => {
  const groups = filterGroups('pt');
  const byKey = new Map(groups.map((group) => [group.key, group]));

  it('offers a category, region and tag filter', () => {
    for (const key of ['cat', 'dist', 'tag'] as const) {
      expect(byKey.get(key)?.options.length).toBeGreaterThan(1);
    }
  });

  it('drops groups with no brand behind them', () => {
    // No brand is verified yet, so the group is not rendered at all.
    const verified = realFacets.filter((entry) => entry.values.verified.length > 0).length;
    expect(byKey.has('verified')).toBe(verified > 0);
  });

  it('only offers options that match at least one brand', () => {
    for (const group of groups) {
      const counts = facetCounts(realFacets, emptyFilters(), group.key);
      for (const option of group.options) {
        expect(option.count).toBe(counts.get(option.value));
        expect(option.count).toBeGreaterThan(0);
      }
    }
  });

  it('labels every option, and namespaces subcategories by category', () => {
    for (const group of groups) {
      for (const option of group.options) {
        expect(option.label.length).toBeGreaterThan(0);
        if (group.key === 'sub') expect(option.value).toContain(':');
      }
    }
  });

  it('keeps price levels in order instead of by count', () => {
    const levels = byKey.get('price')?.options.map((option) => option.value) ?? [];
    expect(levels).toEqual([...levels].sort());
  });
});
